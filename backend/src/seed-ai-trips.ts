/**
 * Sinh 30 chuyến đi "tự sinh lộ trình" (mỗi chuyến có itinerary_days + activities)
 * và gán sẵn số liệu tương tác giả lập (view/click/request) để demo thuật toán
 * gợi ý có trọng số. Chạy: `npm run seed:ai-trips`. An toàn chạy lại nhiều lần
 * (xoá các chuyến có tiền tố [AI] trước khi tạo mới).
 */
import 'reflect-metadata';
import dataSource from './datasource';
import { User } from './modules/user/entities/user.entity';
import { Category } from './modules/place/entities/category.entity';
import { Trip, TripStatus } from './modules/trip/entities/trip.entity';
import { TripMember, TripMemberRole } from './modules/trip/entities/trip-member.entity';
import { ItineraryDay } from './modules/trip/entities/itinerary-day.entity';
import { ItineraryActivity } from './modules/trip/entities/itinerary-activity.entity';

const N = 30;
const PREFIX = '[AI] ';

interface Dest {
  name: string;
  catKey: string;
  tags: string[];
  spots: string[];
  food: string[];
}

const DESTS: Dest[] = [
  { name: 'Đà Nẵng', catKey: 'beach', tags: ['beach', 'food', 'city'], spots: ['Bà Nà Hills', 'Cầu Vàng', 'Bãi biển Mỹ Khê', 'Bán đảo Sơn Trà', 'Ngũ Hành Sơn'], food: ['Mì Quảng', 'Bún chả cá', 'Hải sản'] },
  { name: 'Hội An', catKey: 'culture', tags: ['culture', 'food'], spots: ['Phố cổ', 'Chùa Cầu', 'Làng gốm Thanh Hà', 'Rừng dừa Bảy Mẫu'], food: ['Cao lầu', 'Bánh mì Phượng', 'Hoành thánh'] },
  { name: 'Sa Pa', catKey: 'mountain', tags: ['mountain', 'culture', 'trekking'], spots: ['Fansipan', 'Bản Cát Cát', 'Thác Bạc', 'Đèo Ô Quy Hồ'], food: ['Thắng cố', 'Cá hồi', 'Lợn cắp nách'] },
  { name: 'Phú Quốc', catKey: 'island', tags: ['island', 'beach'], spots: ['Bãi Sao', 'Hòn Thơm', 'VinWonders', 'Suối Tranh'], food: ['Gỏi cá trích', 'Nhum biển', 'Bún quậy'] },
  { name: 'Đà Lạt', catKey: 'mountain', tags: ['mountain', 'culture'], spots: ['Hồ Xuân Hương', 'Thung lũng Tình Yêu', 'Đồi chè Cầu Đất', 'Langbiang'], food: ['Bánh căn', 'Lẩu gà lá é', 'Sữa đậu nành'] },
  { name: 'Hạ Long', catKey: 'island', tags: ['island', 'beach'], spots: ['Vịnh Hạ Long', 'Hang Sửng Sốt', 'Đảo Titop', 'Làng chài Cửa Vạn'], food: ['Chả mực', 'Sá sùng', 'Ngán'] },
  { name: 'Huế', catKey: 'culture', tags: ['culture', 'food'], spots: ['Đại Nội', 'Lăng Khải Định', 'Chùa Thiên Mụ', 'Sông Hương'], food: ['Bún bò Huế', 'Cơm hến', 'Bánh bèo'] },
  { name: 'Nha Trang', catKey: 'beach', tags: ['beach', 'island'], spots: ['VinWonders', 'Tháp Bà Ponagar', 'Đảo Bình Ba', 'Suối khoáng nóng'], food: ['Bún cá', 'Nem nướng', 'Hải sản'] },
  { name: 'Hà Giang', catKey: 'mountain', tags: ['mountain', 'adventure'], spots: ['Đèo Mã Pí Lèng', 'Cột cờ Lũng Cú', 'Dinh Vua Mèo', 'Sông Nho Quế'], food: ['Cháo ấu tẩu', 'Thắng dền', 'Bánh cuốn trứng'] },
  { name: 'Ninh Bình', catKey: 'culture', tags: ['culture', 'mountain'], spots: ['Tràng An', 'Tam Cốc', 'Hang Múa', 'Chùa Bái Đính'], food: ['Cơm cháy', 'Dê núi', 'Ốc núi'] },
];

const TITLE_TPL = [
  'Hành trình khám phá {dest} {d} ngày',
  '{dest} trọn vẹn {d} ngày {n} đêm',
  'Cung đường {dest}: trải nghiệm khó quên',
  '{dest} cho nhóm bạn — {d}N{n}Đ',
  'Tự sinh lộ trình {dest} {d} ngày',
];

const COVERS = [
  '1528127269322-539801943592', '1559592413-7cec4d0cae2b', '1528181304800-259b08848526',
  '1505739679850-7adfc8e8f4c5', '1517021897933-0e0319cfbc28', '1502933691298-84fc14542831',
  '1506905925346-21bda4d32df4', '1507525428034-b723cf961d3e', '1493558103817-58b2924bce98',
  '1473625247510-8ceb1760943f',
];

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]): T => a[rnd(a.length)];
const cover = () => `https://images.unsplash.com/photo-${pick(COVERS)}?auto=format&fit=crop&w=1600&q=80`;
const pad = (n: number) => String(n).padStart(2, '0');
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Bộ tự sinh lộ trình: mỗi ngày 3 hoạt động (sáng/chiều/tối) từ spots + food. */
function genItinerary(dest: Dest, start: Date, days: number) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const acts = [
      { time: '08:00', title: `Tham quan ${dest.spots[i % dest.spots.length]}`, description: 'Khám phá điểm nổi bật buổi sáng.' },
      { time: '14:00', title: `Trải nghiệm ${dest.spots[(i + 1) % dest.spots.length]}`, description: 'Hoạt động buổi chiều.' },
      { time: '19:00', title: `Thưởng thức ${pick(dest.food)}`, description: 'Ẩm thực địa phương buổi tối.' },
    ];
    out.push({
      dayNumber: i + 1,
      date: fmt(addDays(start, i)),
      title: i === 0 ? `Ngày 1: Đến ${dest.name}` : `Ngày ${i + 1}: Khám phá ${dest.name}`,
      activities: acts,
    });
  }
  return out;
}

run().catch((e) => { console.error(e); process.exit(1); });

async function run() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const catRepo = dataSource.getRepository(Category);
  const tripRepo = dataSource.getRepository(Trip);
  const memberRepo = dataSource.getRepository(TripMember);
  const dayRepo = dataSource.getRepository(ItineraryDay);
  const actRepo = dataSource.getRepository(ItineraryActivity);

  const creator = await userRepo.findOne({ where: { email: 'linh@tripmate.local' } });
  if (!creator) throw new Error('Chạy `npm run seed` trước để tạo user demo.');

  const cats = await catRepo.find();
  if (cats.length === 0) throw new Error('Chưa có categories; chạy `npm run seed` trước.');
  const catByKey = new Map(cats.map((c) => [c.key, c]));

  // Idempotent: xoá các chuyến [AI] cũ (cascade gỡ days/activities/members).
  const old = await tripRepo.find({ where: { creatorId: creator.id } });
  const stale = old.filter((t) => t.title.startsWith(PREFIX));
  if (stale.length) {
    await tripRepo.remove(stale);
    console.log(`🧹 Đã xoá ${stale.length} chuyến [AI] cũ.`);
  }

  const today = new Date();
  for (let i = 0; i < N; i++) {
    const dest = DESTS[i % DESTS.length];
    const cat = catByKey.get(dest.catKey) ?? cats[0];
    const days = 2 + rnd(4); // 2–5 ngày
    const start = addDays(today, 7 + rnd(180));
    const end = addDays(start, days - 1);
    const title =
      PREFIX +
      pick(TITLE_TPL)
        .replace('{dest}', dest.name)
        .replace('{d}', String(days))
        .replace('{n}', String(days - 1));

    // Số liệu tương tác giả lập — phân tán để thuật toán có dữ liệu phân biệt.
    const viewCount = rnd(500);
    const clickCount = rnd(200);
    const requestCount = rnd(40);
    const memberCount = 1 + rnd(6);

    const trip = await tripRepo.save(
      tripRepo.create({
        title,
        description: `Lộ trình ${days} ngày khám phá ${dest.name}: ${dest.spots.slice(0, 3).join(', ')}. Tự sinh bởi hệ thống.`,
        destination: dest.name,
        categoryId: cat.id,
        coverImage: cover(),
        galleryUrls: [cover(), cover()],
        startDate: fmt(start),
        endDate: fmt(end),
        durationDays: days,
        priceFrom: Math.round((1500 + Math.random() * 7000) / 50) * 50 * 1000,
        currency: 'VND',
        rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
        maxMembers: 6 + rnd(7),
        memberCount,
        viewCount,
        clickCount,
        requestCount,
        creatorId: creator.id,
        tags: dest.tags,
        status: TripStatus.PUBLISHED,
        inclusions: { accommodation: 'Khách sạn 3*', transport: 'Xe limousine', meals: 'Bữa sáng' },
      }),
    );

    await memberRepo.save(
      memberRepo.create({ tripId: trip.id, userId: creator.id, role: TripMemberRole.LEADER }),
    );

    // Sinh lộ trình chi tiết: days + activities.
    for (const d of genItinerary(dest, start, days)) {
      const day = await dayRepo.save(
        dayRepo.create({ tripId: trip.id, dayNumber: d.dayNumber, date: d.date, title: d.title }),
      );
      await actRepo.save(
        d.activities.map((a, idx) =>
          actRepo.create({ dayId: day.id, time: a.time, title: a.title, description: a.description, sortOrder: idx }),
        ),
      );
    }
    console.log(`✓ [${i + 1}/${N}] ${title}  (view=${viewCount} click=${clickCount} req=${requestCount})`);
  }

  await dataSource.destroy();
  console.log(`✅ Đã sinh ${N} chuyến tự sinh lộ trình + tương tác giả lập.`);
}
