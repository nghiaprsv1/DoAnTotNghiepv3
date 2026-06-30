/**
 * Seed 15 địa điểm du lịch Đà Nẵng (trích từ bài bestprice.vn) vào hệ thống
 * QUA ĐÚNG API ADMIN (POST /api/places, role ADMIN) — mô phỏng admin thêm địa
 * điểm trên trang /admin/places.
 *
 * Idempotent: trước khi tạo, kiểm tra GET /places/slug/:slug — đã có thì bỏ qua.
 * Chạy: cd backend && node scripts/seed-danang-places.mjs
 * Yêu cầu: backend đang chạy ở http://localhost:8080.
 */

const API = process.env.API_BASE || 'http://localhost:8080/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tripmate.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

// Province Đà Nẵng (lấy từ GET /places/provinces)
const PROVINCE_DANANG = '7ffbceea-be12-4e81-84d5-b00cb0d86531';

// Category key → id (lấy từ GET /places/categories)
const CAT = {
  food: '22163be9-6ad6-4c38-b238-1e55f9dc7ddf',
  beach: '2116ca4e-8b39-47fd-9863-801cc6fb2550',
  island: '5d7747cd-7cf5-48bd-9e7b-a3a24487932b',
  mountain: '85def9b1-7f34-4196-b3a1-81c53cd8e4b1',
  adventure: '80849be6-71bb-4e5a-b985-1cd4c385c3bd',
  city: '9aa36af5-be4d-4ab6-948a-910f3f9709ae',
  culture: 'cac86b48-d362-462b-a1cb-3d3251814ea3',
};

// Ảnh bìa: dùng picsum seed cố định (luôn có ảnh, ổn định cho demo/test).
const cover = (seed) => `https://picsum.photos/seed/${seed}/1200/800`;

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login thất bại: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const token = json?.data?.tokens?.accessToken;
  if (!token) throw new Error('Không lấy được accessToken từ phản hồi login.');
  return token;
}

async function slugExists(slug) {
  const res = await fetch(`${API}/places/slug/${slug}`);
  return res.ok; // 200 = đã tồn tại, 404 = chưa có
}

async function createPlace(token, place) {
  const res = await fetch(`${API}/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(place),
  });
  if (!res.ok) throw new Error(`Tạo "${place.name}" lỗi: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// PLACES được nạp từ file dữ liệu cùng thư mục để giữ script gọn.
import { PLACES } from './danang-places.data.mjs';

async function main() {
  console.log(`→ Đăng nhập admin (${ADMIN_EMAIL})...`);
  const token = await login();
  console.log('✓ Đăng nhập thành công.\n');

  let created = 0;
  let skipped = 0;
  for (const p of PLACES) {
    if (await slugExists(p.slug)) {
      console.log(`• [BỎ QUA] ${p.name} (slug "${p.slug}" đã tồn tại)`);
      skipped++;
      continue;
    }
    await createPlace(token, p);
    console.log(`✓ [TẠO]    ${p.name}`);
    created++;
  }

  console.log(`\n=== XONG: tạo mới ${created}, bỏ qua ${skipped}, tổng ${PLACES.length} ===`);
}

main().catch((e) => {
  console.error('\n✗ LỖI:', e.message);
  process.exit(1);
});
