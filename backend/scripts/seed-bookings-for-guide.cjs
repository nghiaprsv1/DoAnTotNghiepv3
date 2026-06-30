/**
 * seed-bookings-for-guide.cjs
 * ----------------------------------------------------------------------------
 * Tạo 4 booking COMPLETED (quá khứ) cho MỘT HDV cụ thể (theo email), do 4 khách
 * khác nhau đặt → demo GuideDashboard + doanh thu/ví của HDV đó.
 *
 * Mỗi booking sinh đúng chuỗi giao dịch như luồng thật (hoa hồng 10%):
 *   khách: TOPUP → PAYMENT(-)   |   HDV: HOLD → RELEASE(90%)   |   admin: COMMISSION(10%)
 *
 * Idempotent theo tag [SEED-GUIDE]. Chạy lại tự dọn dữ liệu cũ của tag này.
 *
 * Chạy:  node scripts/seed-bookings-for-guide.cjs
 *        EMAIL=other@mail.com COUNT=4 node scripts/seed-bookings-for-guide.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const EMAIL = process.env.EMAIL || 'nghiaprodonghe123@gmail.com';
const COUNT = Number(process.env.COUNT) || 4;
const COMMISSION_RATE = 0.1;
const TAG = '[SEED-GUIDE]';

const TOURS = [
  ['Khám phá phố cổ & ẩm thực đêm', 'Hà Nội'],
  ['Trekking ruộng bậc thang mùa lúa', 'Lào Cai'],
  ['Tour biển đảo & lặn ngắm san hô', 'Khánh Hòa'],
  ['City tour & cầu Rồng về đêm', 'Đà Nẵng'],
  ['Miệt vườn sông nước miền Tây', 'Cần Thơ'],
  ['Hang động kỳ vĩ & sông ngầm', 'Quảng Bình'],
];
const COVER = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  // 1) HDV mục tiêu (theo email).
  const guide = (await client.query(
    `SELECT gp.id AS guide_id, gp.user_id, gp.price_per_day, u.name
       FROM guide_profiles gp JOIN users u ON u.id = gp.user_id
      WHERE u.email = $1`,
    [EMAIL],
  )).rows[0];
  if (!guide) { console.error(`✗ Không tìm thấy HDV với email ${EMAIL} (cần là user có guide_profile).`); process.exit(1); }

  // Dọn dữ liệu seed cũ CỦA RIÊNG HDV này (idempotent).
  await client.query(
    `DELETE FROM wallet_transactions WHERE note LIKE $1 AND booking_id IN (SELECT id FROM guide_bookings WHERE guide_id = $2 AND message LIKE $1)`,
    [`${TAG}%`, guide.guide_id],
  );
  await client.query(`DELETE FROM wallet_transactions WHERE note LIKE $1 AND note LIKE $2`, [`${TAG}%`, `%${guide.user_id}%`]);
  await client.query(`DELETE FROM guide_bookings WHERE guide_id = $1 AND message LIKE $2`, [guide.guide_id, `${TAG}%`]);

  // 2) Khách = user thường, KHÁC chính HDV này.
  const travelers = (await client.query(
    `SELECT id, name FROM users WHERE role = 'user' AND id <> $1 ORDER BY created_at LIMIT 30`,
    [guide.user_id],
  )).rows;
  if (travelers.length === 0) { console.error('✗ Không có user khách nào để đặt tour.'); process.exit(1); }

  const admin = (await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];

  const walletCache = new Map();
  async function getWallet(userId) {
    if (walletCache.has(userId)) return walletCache.get(userId);
    let row = (await client.query(`SELECT id, balance_available, balance_frozen FROM wallets WHERE user_id = $1`, [userId])).rows[0];
    if (!row) {
      row = (await client.query(
        `INSERT INTO wallets (user_id, balance_available, balance_frozen, currency) VALUES ($1,0,0,'VND') RETURNING id, balance_available, balance_frozen`,
        [userId],
      )).rows[0];
    }
    const w = { id: row.id, available: Number(row.balance_available), frozen: Number(row.balance_frozen) };
    walletCache.set(userId, w);
    return w;
  }
  async function txn(walletId, type, amount, currency, note, bookingId, createdAt) {
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, type, status, amount, currency, note, booking_id, created_at)
       VALUES ($1,$2,'success',$3,$4,$5,$6,$7)`,
      [walletId, type, amount, currency, note, bookingId, createdAt],
    );
  }

  const pricePerDay = Number(guide.price_per_day) || 800000;
  let created = 0;
  for (let i = 0; i < COUNT; i++) {
    const traveler = travelers[i % travelers.length];
    const [tourTitle, destination] = TOURS[i % TOURS.length];
    const duration = 2 + (i % 4);
    const groupSize = 1 + (i % 3);
    const amount = pricePerDay * duration;
    const currency = 'VND';

    const daysAgo = 18 + i * 22;
    const start = addDays(new Date(), -daysAgo);
    const end = addDays(start, duration - 1);
    const acceptedAt = addDays(start, -3);
    const paidAt = addDays(start, -2);
    const completedAt = addDays(end, 1);

    // Gắn trip nếu khách có chuyến đã kết thúc (mềm).
    const trip = (await client.query(
      `SELECT id FROM trips WHERE creator_id = $1 AND status <> 'cancelled' AND end_date < $2 ORDER BY end_date DESC LIMIT 1`,
      [traveler.id, isoDate(new Date())],
    )).rows[0];
    const tripId = trip ? trip.id : null;

    const bookingId = (await client.query(
      `INSERT INTO guide_bookings
         (guide_id, traveler_id, trip_id, tour_title, tour_cover, destination,
          start_date, end_date, duration_days, group_size, amount, currency,
          message, status, accepted_at, paid_at, completed_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'completed',$14,$15,$16,$17,$17)
       RETURNING id`,
      [
        guide.guide_id, traveler.id, tripId, tourTitle, COVER, destination,
        isoDate(start), isoDate(end), duration, groupSize, amount, currency,
        `${TAG} demo booking`, acceptedAt, paidAt, completedAt, acceptedAt,
      ],
    )).rows[0].id;

    const commission = +(amount * COMMISSION_RATE).toFixed(2);
    const net = +(amount - commission).toFixed(2);

    const travelerWallet = await getWallet(traveler.id);
    await txn(travelerWallet.id, 'topup', amount, currency, `${TAG} Nạp ví demo`, null, addDays(paidAt, -1));
    await txn(travelerWallet.id, 'payment', -amount, currency, `${TAG} Thanh toán tour: ${tourTitle}`, bookingId, paidAt);

    const guideWallet = await getWallet(guide.user_id);
    await txn(guideWallet.id, 'hold', amount, currency, `${TAG} Giữ tiền tour (${guide.user_id})`, bookingId, paidAt);
    await txn(guideWallet.id, 'release', net, currency, `${TAG} Tour hoàn tất, đã trừ 10% (${guide.user_id})`, bookingId, completedAt);
    guideWallet.available += net;

    if (admin) {
      const adminWallet = await getWallet(admin.id);
      await txn(adminWallet.id, 'commission', commission, currency, `${TAG} Hoa hồng tour: ${tourTitle}`, bookingId, completedAt);
      adminWallet.available += commission;
    }
    created++;
    console.log(`  • ${tourTitle} — khách ${traveler.name} · ${amount.toLocaleString('vi-VN')}đ · HDV nhận ${net.toLocaleString('vi-VN')}đ`);
  }

  for (const w of walletCache.values()) {
    await client.query(
      `UPDATE wallets SET balance_available = $1, balance_frozen = $2, updated_at = now() WHERE id = $3`,
      [w.available, w.frozen, w.id],
    );
  }

  console.log(`✓ Đã tạo ${created} booking COMPLETED cho HDV "${guide.name}" (${EMAIL}).`);
  await client.end();
})().catch((e) => { console.error(e); process.exit(1); });
