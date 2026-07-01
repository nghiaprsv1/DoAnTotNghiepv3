import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Trip, TripStatus } from '@/modules/trip/entities/trip.entity';
import {
  type RagRetriever,
  type RetrievedCard,
  type RetrieverFilters,
  searchTokens,
} from './retriever.interface';

/**
 * Retriever cho CHUYẾN ĐI (bảng trips) — Modular RAG "Search module".
 *
 * Truy vấn có cấu trúc trên DB (KHÔNG vector): khớp destination/title/tags theo
 * cụm + token, lọc thêm theo category/giá nếu Router bóc được. Chỉ lấy chuyến
 * đã publish (không lộ draft/cancelled) và CHƯA khởi hành (start_date > hôm nay)
 * — không gợi ý chuyến đang diễn ra hoặc đã hoàn thành. Trả thẻ link tới /trips/:id.
 */
@Injectable()
export class TripRetriever implements RagRetriever {
  readonly source = 'trip' as const;

  constructor(@InjectRepository(Trip) private readonly trips: Repository<Trip>) {}

  async retrieve(filters: RetrieverFilters, limit: number): Promise<RetrievedCard[]> {
    const phrase = (filters.destination || filters.search || '').trim();
    const tokens = searchTokens(`${phrase} ${filters.keywords.join(' ')}`);
    if (!filters.browse && !phrase && tokens.length === 0) return [];

    const qb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'cat')
      .where('t.status = :st', { st: TripStatus.PUBLISHED })
      // Chỉ gợi ý chuyến SẮP DIỄN RA (chưa khởi hành). Bỏ chuyến đang diễn ra
      // (start_date <= hôm nay <= end_date) và đã hoàn thành (end_date đã qua):
      // status DB luôn 'published' nên trạng thái thực tế phải suy ra từ ngày.
      .andWhere('t.start_date > CURRENT_DATE');

    // Chế độ liệt kê: bỏ điều kiện khớp text, chỉ lọc category/giá + xếp rating.
    if (!filters.browse) {
      qb.andWhere(
        new Brackets((b) => {
          if (phrase) {
            b.where('t.title ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('t.destination ILIKE :kw', { kw: `%${phrase}%` })
              .orWhere('t.description ILIKE :kw', { kw: `%${phrase}%` });
          }
          tokens.forEach((tok, i) => {
            b.orWhere(`t.destination ILIKE :tk${i}`, { [`tk${i}`]: `%${tok}%` });
            b.orWhere(`:tag${i} = ANY(t.tags)`, { [`tag${i}`]: tok });
          });
          if (!phrase && tokens.length === 0) b.where('1=1');
        }),
      );
    }

    if (filters.category) {
      qb.andWhere('cat.key = :catKey', { catKey: filters.category });
    }
    if (filters.maxBudget != null) {
      qb.andWhere('t.price_from <= :budget', { budget: filters.maxBudget });
    }

    const rows = await qb.orderBy('t.rating', 'DESC').take(20).getMany();

    // Xếp hạng JS: khớp đúng cụm ở destination > title > rating.
    const lc = phrase.toLowerCase();
    const rank = (t: Trip) =>
      (t.destination ?? '').toLowerCase().includes(lc)
        ? 2
        : (t.title ?? '').toLowerCase().includes(lc)
          ? 1
          : 0;
    const ranked = rows
      .sort((a, b) => rank(b) - rank(a) || Number(b.rating) - Number(a.rating))
      .slice(0, limit);

    return ranked.map((t) => {
      const price = Number(t.priceFrom).toLocaleString('vi-VN');
      return {
        source: this.source,
        id: t.id,
        title: t.title,
        subtitle: `${t.destination} · ${t.durationDays} ngày · từ ${price} ${t.currency}`,
        image: t.coverImage,
        detailPath: `/trips/${t.id}`,
        score: Number(t.rating) || 0,
        context: `Chuyến đi "${t.title}" tới ${t.destination}, ${t.durationDays} ngày, giá từ ${price} ${t.currency}, đánh giá ${t.rating}/5.`,
      };
    });
  }
}
