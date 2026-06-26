import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Post, PostVisibility } from '@/modules/post/entities/post.entity';
import {
  type RagRetriever,
  type RetrievedCard,
  type RetrieverFilters,
  searchTokens,
} from './retriever.interface';

/**
 * Retriever cho BÀI VIẾT (bảng posts) — Modular RAG "Search module".
 * Chỉ lấy bài PUBLIC (không lộ bài friends-only). Khớp title/excerpt/location/
 * tags theo cụm & token. Post không có trang chi tiết riêng → link về /social.
 */
@Injectable()
export class PostRetriever implements RagRetriever {
  readonly source = 'post' as const;

  constructor(@InjectRepository(Post) private readonly posts: Repository<Post>) {}

  async retrieve(filters: RetrieverFilters, limit: number): Promise<RetrievedCard[]> {
    const phrase = (filters.destination || filters.search || '').trim();
    const tokens = searchTokens(`${phrase} ${filters.keywords.join(' ')}`);
    if (!filters.browse && !phrase && tokens.length === 0) return [];

    const qb = this.posts
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'a')
      .where('p.visibility = :vis', { vis: PostVisibility.PUBLIC });

    // Chế độ liệt kê: bỏ điều kiện khớp text, trả bài phổ biến nhất.
    if (!filters.browse) {
      qb.andWhere(
        new Brackets((b) => {
          if (phrase) {
            b.where('p.title ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('p.excerpt ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('p.location ILIKE :kw', { kw: `%${phrase}%` });
          }
          tokens.forEach((tok, i) => {
            b.orWhere(`p.location ILIKE :tk${i}`, { [`tk${i}`]: `%${tok}%` });
            b.orWhere(`p.title ILIKE :tt${i}`, { [`tt${i}`]: `%${tok}%` });
            b.orWhere(`:tag${i} = ANY(p.tags)`, { [`tag${i}`]: tok });
          });
          if (!phrase && tokens.length === 0) b.where('1=1');
        }),
      );
    }

    const rows = await qb.orderBy('p.like_count', 'DESC').take(limit).getMany();

    return rows.map((p) => ({
      source: this.source,
      id: p.id,
      title: p.title,
      subtitle: `${p.location} · ${p.author?.name ?? ''} · ${p.likeCount}❤`,
      image: p.image,
      detailPath: '/social',
      score: Number(p.likeCount) || 0,
      context: `Bài viết "${p.title}" (${p.location}): ${(p.excerpt ?? '').slice(0, 160)}`,
    }));
  }
}
