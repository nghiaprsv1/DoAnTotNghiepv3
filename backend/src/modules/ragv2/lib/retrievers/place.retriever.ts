import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Place } from '@/modules/place/entities/place.entity';
import {
  type RagRetriever,
  type RetrievedCard,
  type RetrieverFilters,
  searchTokens,
} from './retriever.interface';

/**
 * Retriever cho ĐỊA ĐIỂM (bảng places) — Modular RAG "Search module".
 * Khớp name/description + tỉnh/thành (province) + tags theo cụm & token, lọc
 * thêm theo category nếu có. Trả thẻ link tới /places/:id.
 */
@Injectable()
export class PlaceRetriever implements RagRetriever {
  readonly source = 'place' as const;

  constructor(@InjectRepository(Place) private readonly places: Repository<Place>) {}

  async retrieve(filters: RetrieverFilters, limit: number): Promise<RetrievedCard[]> {
    const phrase = (filters.destination || filters.search || '').trim();
    const tokens = searchTokens(`${phrase} ${filters.keywords.join(' ')}`);
    if (!filters.browse && !phrase && tokens.length === 0) return [];

    const qb = this.places
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.province', 'prov')
      .where('1=1');

    // Chế độ liệt kê: bỏ điều kiện khớp text, chỉ lọc category + xếp rating.
    if (!filters.browse) {
      qb.andWhere(
        new Brackets((b) => {
          if (phrase) {
            b.where('p.name ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('p.description ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('prov.name ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('p.city ILIKE :kw', { kw: `%${phrase}%` });
          }
          tokens.forEach((tok, i) => {
            b.orWhere(`p.name ILIKE :tk${i}`, { [`tk${i}`]: `%${tok}%` });
            b.orWhere(`prov.name ILIKE :tp${i}`, { [`tp${i}`]: `%${tok}%` });
            b.orWhere(`:tag${i} = ANY(p.tags)`, { [`tag${i}`]: tok });
          });
          if (!phrase && tokens.length === 0) b.where('1=1');
        }),
      );
    }

    if (filters.category) {
      qb.andWhere('cat.key = :catKey', { catKey: filters.category });
    }

    const rows = await qb.orderBy('p.rating', 'DESC').take(limit).getMany();

    return rows.map((p) => ({
      source: this.source,
      id: p.id,
      title: p.name,
      subtitle: `${p.province?.name ?? ''}${p.city ? ` · ${p.city}` : ''} · ${Number(p.rating).toFixed(1)}★`,
      image: p.coverImage,
      detailPath: `/places/${p.id}`,
      score: Number(p.rating) || 0,
      context: `Địa điểm "${p.name}" ở ${p.province?.name ?? ''}${p.city ? `, ${p.city}` : ''}: ${(p.description ?? '').slice(0, 160)}`,
    }));
  }
}
