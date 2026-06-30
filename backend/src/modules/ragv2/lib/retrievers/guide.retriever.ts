import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { GuideProfile, GuideStatus } from '@/modules/guide/entities/guide-profile.entity';
import {
  type RagRetriever,
  type RetrievedCard,
  type RetrieverFilters,
  searchTokens,
} from './retriever.interface';

/**
 * Retriever cho HƯỚNG DẪN VIÊN (bảng guide_profiles) — Modular RAG "Search module".
 * Chỉ lấy HDV đã DUYỆT (status=approved). Khớp region/bio/specialties/languages
 * theo cụm & token. Trả thẻ link tới /guides/:id (id = guide profile id).
 */
@Injectable()
export class GuideRetriever implements RagRetriever {
  readonly source = 'guide' as const;

  constructor(
    @InjectRepository(GuideProfile) private readonly guides: Repository<GuideProfile>,
  ) {}

  async retrieve(filters: RetrieverFilters, limit: number): Promise<RetrievedCard[]> {
    const phrase = (filters.destination || filters.search || '').trim();
    const tokens = searchTokens(`${phrase} ${filters.keywords.join(' ')}`);
    if (!filters.browse && !phrase && tokens.length === 0) return [];

    const qb = this.guides
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.user', 'u')
      .where('g.status = :st', { st: GuideStatus.APPROVED });

    // Chế độ liệt kê: bỏ điều kiện khớp text, chỉ lọc category (nếu có) + xếp rating.
    if (!filters.browse) {
      qb.andWhere(
        new Brackets((b) => {
          if (phrase) {
            b.where('g.region ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('g.bio ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('u.name ILIKE :kw', { kw: `%${phrase}%` });
          }
          tokens.forEach((tok, i) => {
            b.orWhere(`g.region ILIKE :tk${i}`, { [`tk${i}`]: `%${tok}%` });
            b.orWhere(`:sp${i} = ANY(g.specialties)`, { [`sp${i}`]: tok });
            b.orWhere(`:lg${i} = ANY(g.languages)`, { [`lg${i}`]: tok });
          });
          if (!phrase && tokens.length === 0) b.where('1=1');
        }),
      );
    }

    if (filters.category) {
      qb.andWhere(':ck = ANY(g.category_keys)', { ck: filters.category });
    }

    const rows = await qb.orderBy('g.rating', 'DESC').take(limit).getMany();

    return rows.map((g) => {
      const price = Number(g.pricePerDay).toLocaleString('vi-VN');
      const specs = g.specialties?.slice(0, 3).join(', ');
      const langs = g.languages?.length ? g.languages.join(', ') : null;
      return {
        source: this.source,
        id: g.id,
        title: g.user?.name ?? 'Hướng dẫn viên',
        subtitle: `${g.region} · ${Number(g.rating).toFixed(1)}★ · ${price} ${g.currency}/ngày`,
        image: g.user?.avatar ?? undefined,
        detailPath: `/guides/${g.id}`,
        score: Number(g.rating) || 0,
        // Đưa ngôn ngữ vào context để LLM CHỈ khẳng định "nói tiếng X" khi có dữ
        // liệu thật (tránh bịa như câu "HDV nói tiếng Anh" khi DB không ghi).
        context:
          `Hướng dẫn viên ${g.user?.name ?? ''} khu vực ${g.region}, ${g.yearsExperience} năm kinh nghiệm, ` +
          `giá ${price} ${g.currency}/ngày${specs ? `, chuyên: ${specs}` : ''}` +
          `${langs ? `, ngôn ngữ: ${langs}` : ', ngôn ngữ: chưa cập nhật'}.`,
      };
    });
  }
}
