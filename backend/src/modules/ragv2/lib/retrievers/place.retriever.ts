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

    // ── CHẾ ĐỘ LIỆT KÊ (browse) ──────────────────────────────────────────
    // Trước đây browse bỏ HẾT điều kiện text → "địa điểm ở Đà Nẵng" trả top
    // rating TOÀN QUỐC (lọt Vịnh Hạ Long 5.0★). Sửa: browse vẫn TÔN TRỌNG lọc
    // ĐỊA LÝ (tỉnh/thành) nếu câu có nhắc địa danh — chỉ bỏ lọc CHỦ ĐỀ ("đẹp",
    // "nổi tiếng"). Thử lọc theo địa danh trước; nếu không khớp tỉnh/thành nào
    // (vd "liệt kê tất cả địa điểm") → mới browse toàn quốc. Lấy nhiều ứng viên
    // (≥12) để agent có "dự trữ" khi user hỏi "địa điểm KHÁC những cái trên".
    if (filters.browse) {
      const browseTake = Math.max(limit, 12);
      if (phrase || tokens.length) {
        const located = await this.baseQuery()
          .andWhere(this.locationBracket(phrase, tokens))
          .andWhere(this.categoryClause(filters))
          .orderBy('p.rating', 'DESC')
          .take(browseTake)
          .getMany();
        if (located.length) return located.map((p) => this.toCard(p));
      }
      // Không khớp địa danh → liệt kê chung toàn hệ thống theo rating.
      const all = await this.baseQuery()
        .andWhere(this.categoryClause(filters))
        .orderBy('p.rating', 'DESC')
        .take(browseTake)
        .getMany();
      return all.map((p) => this.toCard(p));
    }

    const qb = this.baseQuery();

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

    qb.andWhere(this.categoryClause(filters));

    // ── XẾP HẠNG THEO ĐỘ LIÊN QUAN (không chỉ rating) ──────────────────────
    // Vấn đề: khi query gồm cả điểm đến (vd "văn hóa Chăm Pa Đà Nẵng"), token
    // "Đà"/"Nẵng" khớp prov.name → kéo về TẤT CẢ địa điểm trong tỉnh. Nếu chỉ
    // sort theo rating, địa điểm ĐÚNG chủ đề (khớp TÊN/TAG, vd "Chăm") bị các
    // địa điểm rating cao hơn nhưng không liên quan đẩy khỏi top-limit.
    // → Cộng điểm: khớp TÊN > TAG > MÔ TẢ; khớp tỉnh KHÔNG cộng (chỉ là locality).
    // Xếp relevance DESC trước, rating DESC sau.
    const parts: string[] = [];
    const params: Record<string, unknown> = {};
    if (phrase) {
      parts.push('CASE WHEN p.name ILIKE :rPhrase THEN 5 ELSE 0 END');
      parts.push('CASE WHEN p.description ILIKE :rPhrase THEN 2 ELSE 0 END');
      params.rPhrase = `%${phrase}%`;
    }
    tokens.forEach((tok, i) => {
      parts.push(`CASE WHEN p.name ILIKE :rtk${i} THEN 3 ELSE 0 END`);
      parts.push(`CASE WHEN :rtag${i} = ANY(p.tags) THEN 2 ELSE 0 END`);
      parts.push(`CASE WHEN p.description ILIKE :rtk${i} THEN 1 ELSE 0 END`);
      params[`rtk${i}`] = `%${tok}%`;
      params[`rtag${i}`] = tok;
    });
    if (parts.length) {
      qb.addSelect(parts.join(' + '), 'relevance').setParameters(params);
      qb.orderBy('relevance', 'DESC').addOrderBy('p.rating', 'DESC');
    } else {
      qb.orderBy('p.rating', 'DESC');
    }

    const rows = await qb.take(limit).getMany();
    return rows.map((p) => this.toCard(p));
  }

  /** Query nền + join category/province (dùng chung cho mọi nhánh). */
  private baseQuery() {
    return this.places
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.province', 'prov')
      .where('1=1');
  }

  /** Điều kiện lọc theo CHỈ địa lý (tỉnh/thành) — dùng cho browse có địa danh. */
  private locationBracket(phrase: string, tokens: string[]): Brackets {
    return new Brackets((b) => {
      if (phrase) {
        b.where('prov.name ILIKE :lp', { lp: `%${phrase}%` }).orWhere('p.city ILIKE :lp', {
          lp: `%${phrase}%`,
        });
      }
      tokens.forEach((tok, i) => {
        b.orWhere(`prov.name ILIKE :lt${i}`, { [`lt${i}`]: `%${tok}%` });
        b.orWhere(`p.city ILIKE :lt${i}`, { [`lt${i}`]: `%${tok}%` });
      });
      if (!phrase && tokens.length === 0) b.where('1=0'); // không địa danh → không khớp
    });
  }

  /** Lọc category nếu có (no-op khi không truyền). */
  private categoryClause(filters: RetrieverFilters): Brackets {
    return new Brackets((b) => {
      if (filters.category) b.where('cat.key = :catKey', { catKey: filters.category });
      else b.where('1=1');
    });
  }

  private toCard(p: Place): RetrievedCard {
    // Context giàu thông tin để LLM trả lời được cả câu hỏi THUỘC TÍNH (giá vé,
    // giờ giấc, đặc điểm) chứ không chỉ "có những chỗ nào". Ưu tiên
    // longDescription (chi tiết hơn, chứa giờ phun lửa/mở cửa/GIÁ VÉ…), kèm phí
    // vào cổng + loại hình + tags. Nhờ vậy hỏi "giá vé Bà Nà", "Cầu Rồng phun lửa
    // mấy giờ" có dữ liệu thật trong observation thay vì phải tra tài liệu.
    // ⚠️ Cắt ở 900 (không phải 360): nhiều địa điểm để GIÁ VÉ / giờ giấc ở CUỐI
    // phần mô tả tự do (longDescription), 360 ký tự cắt mất đoạn cuối → LLM không
    // thấy giá → trả "chưa có thông tin giá vé" dù dữ liệu CÓ.
    const detail = (p.longDescription || p.description || '').slice(0, 900);
    const fee = p.entranceFee ? ` Phí vào cổng: ${p.entranceFee}.` : '';
    const cat = p.category?.label ? ` Loại hình: ${p.category.label}.` : '';
    const tags = p.tags?.length ? ` Từ khoá: ${p.tags.join(', ')}.` : '';
    return {
      source: this.source,
      id: p.id,
      title: p.name,
      subtitle: `${p.province?.name ?? ''}${p.city ? ` · ${p.city}` : ''} · ${Number(p.rating).toFixed(1)}★`,
      image: p.coverImage,
      detailPath: `/places/${p.id}`,
      score: Number(p.rating) || 0,
      context:
        `Địa điểm "${p.name}" ở ${p.province?.name ?? ''}${p.city ? `, ${p.city}` : ''}.` +
        `${cat}${fee} Mô tả: ${detail}${tags}`,
    };
  }
}
