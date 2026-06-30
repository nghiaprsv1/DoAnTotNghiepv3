import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Place } from './entities/place.entity';
import { PlaceImage } from './entities/place-image.entity';
import { Category } from './entities/category.entity';
import { Province } from './entities/province.entity';
import { CreatePlaceDto, QueryPlacesDto, UpdatePlaceDto } from './dto/place.dto';
import { PaginatedResponse } from '@/common/types/api-response.type';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place) private readonly places: Repository<Place>,
    @InjectRepository(PlaceImage) private readonly images: Repository<PlaceImage>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Province) private readonly provinces: Repository<Province>,
  ) {}

  async list(q: QueryPlacesDto): Promise<PaginatedResponse<Place>> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const qb = this.places
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.province', 'prov')
      .leftJoinAndSelect('p.gallery', 'img');

    if (q.category) qb.andWhere('cat.key = :cat', { cat: q.category });
    if (q.province) {
      // q.province có thể là SLUG ("da-nang") hoặc UUID. Chỉ so prov.id khi giá
      // trị đúng định dạng UUID — nếu không, Postgres cố cast slug → uuid và NÉM
      // lỗi "invalid input syntax for type uuid" làm hỏng cả query (400).
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.province);
      if (isUuid) {
        qb.andWhere(
          new Brackets((b) =>
            b
              .where('prov.slug = :prov', { prov: q.province })
              .orWhere('prov.id = :provId', { provId: q.province }),
          ),
        );
      } else {
        qb.andWhere('prov.slug = :prov', { prov: q.province });
      }
    }
    if (q.keyword) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('p.name ILIKE :kw', { kw: `%${q.keyword}%` })
            .orWhere('p.description ILIKE :kw', { kw: `%${q.keyword}%` }),
        ),
      );
    }

    const sortBy = q.sortBy ?? 'rating';
    const order = (q.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(`p.${sortBy}`, order);

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<Place> {
    const place = await this.places.findOne({
      where: { id },
      relations: ['category', 'province', 'gallery'],
    });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  async findBySlug(slug: string): Promise<Place> {
    const place = await this.places.findOne({
      where: { slug },
      relations: ['category', 'province', 'gallery'],
    });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  listCategories() {
    return this.categories.find({ order: { label: 'ASC' } });
  }

  listProvinces() {
    return this.provinces.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreatePlaceDto): Promise<Place> {
    const place = this.places.create({
      ...dto,
      gallery: (dto.gallery ?? []).map((url, sortOrder) =>
        this.images.create({ url, sortOrder }),
      ),
    });
    return this.places.save(place);
  }

  async update(id: string, dto: UpdatePlaceDto): Promise<Place> {
    const existing = await this.findById(id);
    Object.assign(existing, dto);
    // `category` & `province` are eager relations → `existing` still holds the
    // OLD relation objects. On save TypeORM derives the FK from those objects
    // and overwrites the new categoryId/provinceId from the DTO. Clear them so
    // the *_id columns we just assigned are the source of truth.
    existing.category = undefined as unknown as Place['category'];
    existing.province = undefined as unknown as Place['province'];
    if (dto.gallery) {
      existing.gallery = dto.gallery.map((url, sortOrder) =>
        this.images.create({ url, sortOrder }),
      );
    }
    await this.places.save(existing);
    // Reload with fresh relations so the response has category.key/province.name.
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.places.delete({ id });
  }
}
