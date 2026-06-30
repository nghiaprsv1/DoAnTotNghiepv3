/**
 * seed-past-bookings.cjs
 * ----------------------------------------------------------------------------
 * Tạo ~N booking HDV ở trạng thái COMPLETED trong QUÁ KHỨ để demo:
 *   - Lịch sử đặt HDV (trang MyBookings / GuideDashboard)
 *   - Doanh thu HDV + hoa hồng admin (ví + lịch sử giao dịch)
 *
 * Mỗi booking hoàn tất sinh đúng chuỗi giao dịch như luồng thật (hoa hồng 10%):
 *   PAYMENT    (khách: trừ available)
 *   HOLD       (HDV: cộng frozen)
 *   RELEASE    (HDV: frozen → available, đã trừ 10%)
 *   COMMISSION (admin: cộng available 10%)
 * + nạp TOPUP cho khách trước đó để số dư khách không âm.
 *
 * Idempotent: mọi giao dịch/booking seed gắn note có tiền tố [SEED-PAST].
 * Chạy lại sẽ xoá dữ liệu seed cũ trước rồi tạo lại (không đụng dữ liệu thật).
 *
 * Chạy:  node scripts/seed-past-bookings.cjs           (mặc định 10 booking)
 *        COUNT=15 node scripts/seed-past-bookings.cjs
 * DB lấy từ .env: DB_HOST/PORT/USERNAME/PASSWORD/NAME (+ DB_SSL=true cho Render).
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const COUNT = Number(process.env.COUNT) || 10;
const COMMISSION_RATE = 0.1;
const TAG = '[SEED-PAST]';

const TOURS = [
  ['Khám phá phố cổ & ẩm thực', 'Hà Nội'],
  ['Trekking ruộng bậc thang', 'Lào Cai'],
  ['Tour biển đảo & lặn ngắm san hô', 'Khánh Hòa'],
  ['City tour & cầu Rồng về đêm', 'Đà Nẵng'],
  ['Miệt vườn sông nước', 'Cần Thơ'],
  ['Hang động & sông ngầm', 'Quảng Bình'],
  ['Cao nguyên & thác nước', 'Lâm Đồng'],
  ['Di sản cố đô', 'Thừa Thiên Huế'],
  ['Đảo ngọc & hoàng hôn', 'Kiên Giang'],
  ['Vịnh kỳ quan & chèo kayak', 'Quảng Ninh'],
];
const COVER = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const pick = (arr, i) => arr[i % arr.length];

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

  // 0) Dọn dữ liệu seed cũ (idempotent) — chỉ thứ có tag.
  await client.query(`DELETE FROM wallet_transactions WHERE note LIKE $1`, [`${TAG}%`]);
  await client.query(`DELETE FROM guide_bookings WHERE message LIKE $1`, [`${TAG}%`]);

  // 1) HDV approved (kèm userId + giá ngày).
  const guides = (await client.query(
    `SELECT gp.id AS guide_id, gp.user_id, gp.price_per_day, gp.region, u.name
       FROM guide_profiles gp JOIN users u ON u.id = gp.user_id
      WHERE gp.status = 'approved' ORDER BY gp.created_at LIMIT 20`,
  )).rows;
  if (guides.length === 0) { console.error('✗ Chưa có HDV approved. Chạy seed:guides trước.'); process.exit(1); }

  // 2) Khách = user thường (không phải HDV, không admin).
  const guideUserIds = new Set(guides.map((g) => g.user_id));
  const travelers = (await client.query(
    `SELECT id, name FROM users WHERE role = 'user' ORDER BY created_at`,
  )).rows.filter((u) => !guideUserIds.has(u.id));
  if (travelers.length === 0) { console.error('✗ Không có user khách nào.'); process.exit(1); }

  // 3) Một ví admin để nhận hoa hồng.
  const admin = (await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];

  // Helper: lấy/khởi tạo ví theo userId, trả {id, available, frozen}.
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

  let created = 0;
  for (let i = 0; i < COUNT; i++) {
    const guide = pick(guides, i);
    const traveler = pick(travelers, i + 1); // lệch để khách ≠ thứ tự HDV
    if (traveler.id === guide.user_id) continue; // không tự đặt mình
    const [tourTitle, destination] = pick(TOURS, i);
    const duration = 2 + (i % 4); // 2..5 ngày
    const groupSize = 1 + (i % 4);
    const pricePerDay = Number(guide.price_per_day) || 800000;
    const amount = pricePerDay * duration; // công thức demo: giá ngày × số ngày
    const currency = 'VND';

    // Ngày trong QUÁ KHỨ: rải 1..6 tháng trước, mỗi booking cách nhau ~16 ngày.
    const daysAgo = 20 + i * 16;
    const start = addDays(new Date(), -daysAgo);
    const end = addDays(start, duration - 1);
    const acceptedAt = addDays(start, -3);
    const paidAt = addDays(start, -2);
    const completedAt = addDays(end, 1);

    // 4) Gắn trip nếu khách có trip ĐÃ HOÀN THÀNH cùng điểm đến (mềm: chỉ cần completed).
    const trip = (await client.query(
      `SELECT id FROM trips WHERE creator_id = $1 AND status != 'cancelled' AND end_date < $2 ORDER BY end_date DESC LIMIT 1`,
      [traveler.id, isoDate(new Date())],
    )).rows[0];
    const tripId = trip ? trip.id : null;

    // 5) Tạo booking COMPLETED.
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

    // 6) Ví khách: nạp đủ tiền rồi thanh toán (net 0, nhưng có lịch sử thật).
    const travelerWallet = await getWallet(traveler.id);
    await txn(travelerWallet.id, 'topup', amount, currency, `${TAG} Nạp ví demo`, null, addDays(paidAt, -1));
    await txn(travelerWallet.id, 'payment', -amount, currency, `${TAG} Thanh toán tour: ${tourTitle}`, bookingId, paidAt);

    // 7) Ví HDV: HOLD lúc thanh toán, rồi RELEASE (trừ hoa hồng) lúc hoàn tất.
    const commission = +(amount * COMMISSION_RATE).toFixed(2);
    const net = +(amount - commission).toFixed(2);
    const guideWallet = await getWallet(guide.user_id);
    await txn(guideWallet.id, 'hold', amount, currency, `${TAG} Giữ tiền tour`, bookingId, paidAt);
    await txn(guideWallet.id, 'release', net, currency, `${TAG} Tour hoàn tất (đã trừ 10% hoa hồng)`, bookingId, completedAt);
    guideWallet.available += net; // tiền HDV thực nhận

    // 8) Ví admin: hoa hồng 10%.
    if (admin) {
      const adminWallet = await getWallet(admin.id);
      await txn(adminWallet.id, 'commission', commission, currency, `${TAG} Hoa hồng tour: ${tourTitle}`, bookingId, completedAt);
      adminWallet.available += commission;
    }
    created++;
  }

  // 9) Ghi lại số dư ví đã cộng dồn (chỉ ví đụng tới trong seed).
  for (const w of walletCache.values()) {
    await client.query(
      `UPDATE wallets SET balance_available = $1, balance_frozen = $2, updated_at = now() WHERE id = $3`,
      [w.available, w.frozen, w.id],
    );
  }

  console.log(`✓ Đã tạo ${created} booking COMPLETED trong quá khứ (+ giao dịch ví, hoa hồng 10%).`);
  console.log(`  Dọn lại bằng: xoá WHERE note/message LIKE '${TAG}%' (chạy lại script cũng tự dọn).`);
  await client.end();
})().catch((e) => { console.error(e); process.exit(1); });
