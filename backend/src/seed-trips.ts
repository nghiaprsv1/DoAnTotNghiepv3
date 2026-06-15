/**
 * Bulk-seed ~200 demo trips so the explore page feels alive. Idempotent:
 * if there are already 100+ published trips in the DB it does nothing,
 * so it's safe to re-run. Run with `npm run seed:trips`.
 */
import 'reflect-metadata';
import dataSource from './datasource';
import { User } from './modules/user/entities/user.entity';
import { Category } from './modules/place/entities/category.entity';
import { Trip, TripStatus } from './modules/trip/entities/trip.entity';
import {
  TripMember,
  TripMemberRole,
} from './modules/trip/entities/trip-member.entity';

const TARGET = 200;

const DESTINATIONS: Array<{ name: string; tags: string[]; categoryKeys: string[] }> = [
  { name: 'Hạ Long', tags: ['UNESCO', 'Du thuyền', 'Biển'], categoryKeys: ['island', 'beach'] },
  { name: 'Sa Pa', tags: ['Trekking', 'Bản làng', 'Núi'], categoryKeys: ['mountain', 'culture'] },
  { name: 'Hà Giang', tags: ['Cao nguyên đá', 'Phượt', 'Núi'], categoryKeys: ['mountain', 'adventure'] },
  { name: 'Ninh Bình', tags: ['Tràng An', 'Tam Cốc', 'Văn hoá'], categoryKeys: ['culture', 'mountain'] },
  { name: 'Mộc Châu', tags: ['Hoa mận', 'Đồi chè', 'Núi'], categoryKeys: ['mountain'] },
  { name: 'Mai Châu', tags: ['Bản Lác', 'Homestay'], categoryKeys: ['culture', 'mountain'] },
  { name: 'Cao Bằng', tags: ['Bản Giốc', 'Hồ Ba Bể'], categoryKeys: ['adventure', 'mountain'] },
  { name: 'Cát Bà', tags: ['Đảo', 'Biển', 'Lan Hạ'], categoryKeys: ['island', 'beach'] },
  { name: 'Đà Nẵng', tags: ['Bà Nà', 'Cầu Vàng', 'Biển'], categoryKeys: ['city', 'beach'] },
  { name: 'Hội An', tags: ['Đèn lồng', 'Phố cổ', 'Ẩm thực'], categoryKeys: ['culture', 'food'] },
  { name: 'Huế', tags: ['Đại Nội', 'Lăng tẩm', 'Sông Hương'], categoryKeys: ['culture'] },
  { name: 'Phong Nha', tags: ['Hang động', 'Sơn Đoòng'], categoryKeys: ['adventure'] },
  { name: 'Quy Nhơn', tags: ['Eo Gió', 'Kỳ Co', 'Biển'], categoryKeys: ['beach'] },
  { name: 'Nha Trang', tags: ['Vinpearl', 'Lặn biển'], categoryKeys: ['beach', 'island'] },
  { name: 'Đà Lạt', tags: ['Hoa', 'Khí hậu mát', 'Cao nguyên'], categoryKeys: ['mountain', 'culture'] },
  { name: 'Phú Yên', tags: ['Mũi Điện', 'Ghềnh Đá Đĩa'], categoryKeys: ['beach'] },
  { name: 'Phan Thiết', tags: ['Mũi Né', 'Đồi cát'], categoryKeys: ['beach', 'adventure'] },
  { name: 'Vũng Tàu', tags: ['Biển gần Sài Gòn'], categoryKeys: ['beach'] },
  { name: 'Côn Đảo', tags: ['Lịch sử', 'Biển hoang sơ'], categoryKeys: ['island', 'beach'] },
  { name: 'Phú Quốc', tags: ['Đảo ngọc', 'Bãi Sao'], categoryKeys: ['island', 'beach'] },
  { name: 'Cần Thơ', tags: ['Chợ nổi', 'Sông nước'], categoryKeys: ['food', 'culture'] },
  { name: 'Châu Đốc', tags: ['Núi Sam', 'Tâm linh'], categoryKeys: ['culture'] },
  { name: 'Buôn Ma Thuột', tags: ['Cà phê', 'Voi Bản Đôn'], categoryKeys: ['food', 'adventure'] },
  { name: 'Pleiku', tags: ['Biển Hồ', 'Tây Nguyên'], categoryKeys: ['mountain'] },
  { name: 'Kon Tum', tags: ['Nhà Rông', 'Tây Nguyên'], categoryKeys: ['culture'] },
  { name: 'Bình Liêu', tags: ['Cột mốc', 'Núi'], categoryKeys: ['mountain', 'adventure'] },
  { name: 'Tà Xùa', tags: ['Săn mây', 'Sống lưng khủng long'], categoryKeys: ['mountain', 'adventure'] },
  { name: 'Y Tý', tags: ['Mây', 'Bản làng'], categoryKeys: ['mountain'] },
  { name: 'Mù Cang Chải', tags: ['Ruộng bậc thang'], categoryKeys: ['mountain'] },
  { name: 'Hà Nội', tags: ['Phố cổ', 'Ẩm thực'], categoryKeys: ['city', 'food'] },
  { name: 'TP.HCM', tags: ['Sài Gòn', 'Đêm thành phố'], categoryKeys: ['city', 'food'] },
];

// ~30 distinct Unsplash photo IDs covering travel scenes in Vietnam-ish landscapes.
const PHOTO_IDS = [
  '1528127269322-539801943592',
  '1559592413-7cec4d0cae2b',
  '1528181304800-259b08848526',
  '1505739679850-7adfc8e8f4c5',
  '1517021897933-0e0319cfbc28',
  '1502933691298-84fc14542831',
  '1504457047772-27faf1c00561',
  '1494783367193-149034c05e8f',
  '1506905925346-21bda4d32df4',
  '1507525428034-b723cf961d3e',
  '1518684079-3c830dcef090',
  '1493558103817-58b2924bce98',
  '1500627964684-141351970a7f',
  '1473625247510-8ceb1760943f',
  '1465056836041-7f43ac27dcb5',
  '1469854523086-cc02fe5d8800',
  '1502780402662-acc01917214e',
  '1432405972618-c60b0225b8f9',
  '1418065460487-3e41a6c84dc5',
  '1530541930197-ff16ac917b0e',
  '1488646953014-85cb44e25828',
  '1539020140153-e4c3825ac8d9',
  '1531497865144-0464ef8fb9a9',
  '1533105079780-92b9be482077',
  '1522199755839-a2bacb67c546',
  '1483683804023-6ccdb62f86ef',
  '1505765050516-f72dcac9c60e',
  '1507608616759-54f48f0af0ee',
  '1504214208698-ea1916a2195a',
  '1467269204594-9661b134dd2b',
  '1551918120-9739cb430c6d',
  '1542038784456-1ea8e935640e',
  '1540541338287-41700207dee6',
  '1488646953014-85cb44e25828',
];

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhotoUrl(): string {
  const id = pickOne(PHOTO_IDS);
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
}

const TITLE_TEMPLATES = [
  'Hành trình {dest} {duration} ngày',
  'Khám phá {dest} cùng nhóm bạn trẻ',
  'Cung đường {dest} – {tag}',
  '{dest}: trải nghiệm {tag}',
  'Chuyến đi {dest} mùa đẹp nhất',
  'Tour {dest} {duration} ngày {nights} đêm',
  '{dest} retreat: chill và chữa lành',
  'Phiêu lưu {dest}: {tag}',
];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function run() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const catRepo = dataSource.getRepository(Category);
  const tripRepo = dataSource.getRepository(Trip);
  const memberRepo = dataSource.getRepository(TripMember);

  const existing = await tripRepo.count();
  if (existing >= TARGET / 2) {
    console.log(`Skip — already ${existing} trips in DB.`);
    await dataSource.destroy();
    return;
  }

  const creator = await userRepo.findOne({ where: { email: 'linh@tripmate.local' } });
  if (!creator) {
    throw new Error('Run `npm run seed` first to create the demo user.');
  }

  const allCats = await catRepo.find();
  if (allCats.length === 0) {
    throw new Error('No categories in DB; run `npm run seed` first.');
  }
  const catByKey = new Map(allCats.map((c) => [c.key, c]));

  const today = new Date();
  const trips: Trip[] = [];

  for (let i = 0; i < TARGET; i++) {
    const dest = pickOne(DESTINATIONS);
    const catKey = pickOne(dest.categoryKeys);
    const cat = catByKey.get(catKey) ?? allCats[0];
    const duration = 2 + Math.floor(Math.random() * 7); // 2–8 days
    const startOffset = 7 + Math.floor(Math.random() * 200); // 7–207 days from today
    const start = addDays(today, startOffset);
    const end = addDays(start, duration - 1);
    const tagPool = [...dest.tags, 'Nhóm bạn', 'Couple', 'Family-friendly', 'Cao cấp', 'Tiết kiệm'];
    const tags = pickN(tagPool, 3 + Math.floor(Math.random() * 2));
    const tagSeed = tags[0] ?? dest.tags[0] ?? 'khám phá';
    const titleTpl = pickOne(TITLE_TEMPLATES);
    const title = titleTpl
      .replace('{dest}', dest.name)
      .replace('{duration}', String(duration))
      .replace('{nights}', String(duration - 1))
      .replace('{tag}', tagSeed.toLowerCase());
    const priceFrom =
      Math.round((1500 + Math.random() * 8500) / 50) * 50 * 1000; // 1.5M–10M, step 50k
    const cover = randomPhotoUrl();
    const gallery = pickN(PHOTO_IDS, 3).map(
      (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`,
    );
    const trip = tripRepo.create({
      title,
      description: `${dest.name} là một trong những điểm đến đáng trải nghiệm nhất Việt Nam. Trong ${duration} ngày, nhóm sẽ cùng nhau khám phá ${dest.tags.join(', ').toLowerCase()}.`,
      destination: dest.name,
      categoryId: cat.id,
      coverImage: cover,
      galleryUrls: gallery,
      startDate: fmt(start),
      endDate: fmt(end),
      durationDays: duration,
      priceFrom,
      currency: 'VND',
      rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
      maxMembers: 4 + Math.floor(Math.random() * 9), // 4–12
      memberCount: 1,
      creatorId: creator.id,
      tags,
      status: TripStatus.PUBLISHED,
      inclusions: {
        accommodation: pickOne(['Khách sạn 3*', 'Homestay', 'Resort 4*', 'Cabin']),
        transport: pickOne(['Xe limousine', 'Tàu hoả', 'Xe máy', 'Du thuyền']),
        meals: pickOne(['3 bữa/ngày', 'Bữa sáng', 'Tự túc', 'Buffet']),
      },
    });
    trips.push(trip);
  }

  // Insert in batches to avoid query-size limits.
  const BATCH = 50;
  for (let i = 0; i < trips.length; i += BATCH) {
    const slice = trips.slice(i, i + BATCH);
    const saved = await tripRepo.save(slice);
    await memberRepo.save(
      saved.map((t) =>
        memberRepo.create({ tripId: t.id, userId: creator.id, role: TripMemberRole.LEADER }),
      ),
    );
    console.log(`✓ inserted ${i + saved.length}/${trips.length}`);
  }

  await dataSource.destroy();
  console.log(`✅ Seeded ${trips.length} trips.`);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
