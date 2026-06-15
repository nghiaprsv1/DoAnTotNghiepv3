/**
 * Seed kho kiến thức 63 tỉnh/thành vào bảng provinces.
 * Idempotent: upsert theo slug — chạy lại nhiều lần an toàn, cập nhật dữ liệu mới.
 *
 *   npm run seed:provinces
 */
import 'reflect-metadata';
import dataSource from './datasource';
import { Province } from './modules/place/entities/province.entity';
import { PROVINCES_KB } from './data/provinces-kb';

async function run() {
  const ds = dataSource;
  await ds.initialize();
  const repo = ds.getRepository(Province);

  let created = 0;
  let updated = 0;
  for (const p of PROVINCES_KB) {
    const existing = await repo.findOne({ where: { slug: p.slug } });
    if (existing) {
      repo.merge(existing, {
        name: p.name,
        region: p.region,
        knownFor: p.knownFor,
        bestSeason: p.bestSeason,
        summary: p.summary,
        specialties: p.specialties,
        highlights: p.highlights,
      });
      await repo.save(existing);
      updated++;
    } else {
      await repo.save(repo.create(p));
      created++;
    }
  }

  console.log(`✓ Seed provinces xong: ${created} tạo mới, ${updated} cập nhật (tổng ${PROVINCES_KB.length}).`);
  await ds.destroy();
}

run().catch((e) => {
  console.error('Seed provinces lỗi:', e);
  process.exit(1);
});
