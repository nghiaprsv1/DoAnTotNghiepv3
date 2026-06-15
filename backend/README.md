# TripMate Backend

Backend cho **TravelSocial / TripMate** — NestJS 10 + TypeORM + PostgreSQL 16.

Khớp 1-1 với 12 nhóm use case trong `Usecase.docx` và data shapes trong `src/types/*.ts` của frontend.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node 20+, TypeScript 5.6 |
| Framework | NestJS 10 (Express + Passport JWT) |
| ORM | TypeORM 0.3 |
| DB | PostgreSQL 16 |
| Auth | JWT access (15m) + refresh (7d) rotated, hashed in DB |
| Realtime | Socket.IO (chuẩn bị, chưa dùng) |
| Docs | Swagger UI (`/docs`) |
| AI | Google Gemini 1.5 Flash (fallback keyword matcher) |

## Cài đặt

```bash
cd backend
npm install
```

Tạo database `tripmate` trong PostgreSQL local:

```sql
CREATE DATABASE tripmate;
```

Đổi `backend/.env` cho khớp credentials của bạn (mặc định `postgres/postgres`).

## Chạy dev

```bash
npm run start:dev          # http://localhost:8080/api · Swagger /docs
npm run seed               # tạo admin + traveler demo + 1 trip
```

Tài khoản seed:
- `admin@tripmate.local` / `admin1234` (role admin)
- `linh@tripmate.local` / `demo1234` (role user)

Frontend muốn dùng API thật:

```bash
# từ thư mục gốc
npm run dev:api            # http://localhost:3001 (đã set VITE_USE_MOCK=false)
```

## Cấu trúc thư mục

```
backend/
  src/
    main.ts                 # bootstrap, /api prefix, CORS, Swagger
    app.module.ts           # global guards/interceptors/filters
    datasource.ts           # CLI datasource cho migration
    common/                 # ApiResponse, RolesGuard, decorators
    database/typeorm.config # TypeORM options
    modules/
      auth/                 # register/login/refresh/logout/profile/change-password
      user/                 # follow/unfollow, public profile, update
      place/                # places + categories + provinces (admin CRUD)
      trip/                 # CRUD + join request + leave + kick + itinerary
      post/                 # post CRUD + like + comment
      guide/                # apply, list, booking lifecycle
      message/              # DM + group + history
      review/               # polymorphic review (place/trip/guide/member)
      notification/         # list, mark-read, unread-count
      admin/                # dashboard, lock user, approve guide
      ai/                   # /ai/ask Gemini-backed chatbot
      upload/               # local /uploads + /static/*
```

## Endpoint contract (tóm tắt)

Mọi response gói trong `ApiResponse<T> = { data, message, success, statusCode }`.
Auth bằng `Authorization: Bearer <accessToken>`. Routes có `@Public()` không cần token.

### Auth `/api/auth`
- `POST /register` `{ name, email, password, confirmPassword }` → `{ user, tokens }`
- `POST /login` `{ email, password }` → `{ user, tokens }`
- `POST /refresh` `{ refreshToken }` → `{ accessToken, refreshToken }`
- `POST /logout` (auth)
- `GET /profile` (auth)
- `PUT /password` (auth) `{ oldPassword, newPassword }`

### Users `/api/users`
- `GET /:id` public profile (public)
- `PUT /me` (auth) cập nhật profile
- `POST /:id/follow`, `DELETE /:id/follow` (auth)
- `GET /:id/followers`, `GET /:id/following` (public)

### Places `/api/places`
- `GET /` query: `category, province, keyword, page, pageSize, sortBy, sortOrder`
- `GET /:id`, `GET /slug/:slug`
- `GET /categories`, `GET /provinces`
- `POST /`, `PUT /:id`, `DELETE /:id` (admin)

### Trips `/api/trips`
- `GET /` query trip list
- `GET /:id` chi tiết
- `GET /mine/created`, `GET /mine/joined` (auth)
- `POST /` (auth) tạo trip — auto thêm creator làm leader
- `PUT /:id`, `DELETE /:id` (creator)
- `POST /:id/join` `{ message? }` (auth) gửi yêu cầu tham gia
- `POST /:id/requests/:reqId/accept|reject` (creator)
- `DELETE /:id/members/:userId` (creator) kick
- `POST /:id/leave` (auth) tự rời
- `POST /:id/hire-guide` `{ guideId }` (creator)
- `PUT /:id/itinerary` `{ days: ItineraryDayDto[] }` (creator) thay nguyên itinerary

### Posts `/api/posts`
- `GET /` query: `feed=foryou|following|trending, tag, authorId`
- `GET /:id`, `POST /` (auth), `DELETE /:id` (author)
- `POST /:id/like` (auth) toggle
- `GET /:id/comments`, `POST /:id/comments` (auth) `{ content, parentId? }`
- `DELETE /comments/:cid` (auth)

### Guides `/api/guides`
- `GET /` filter: region, category, language, minPrice/maxPrice
- `GET /:id`
- `POST /apply` (auth) đăng ký HDV
- `POST /:id/approve|reject` (admin)
- `POST /bookings` (auth) tạo booking
- `PUT /bookings/:id` `{ action: accept|reject|cancel|complete }` (auth)
- `GET /bookings/me/traveler|guide` (auth)

### Messages `/api/messages`
- `GET /conversations` (auth)
- `POST /direct` `{ peerId, content, attachment? }`
- `POST /groups` `{ groupName, memberIds[] }`
- `POST /:id/messages`, `GET /:id/messages` (auth, member)

### Reviews `/api/reviews`
- `GET ?targetType=place|trip|guide|member&targetId=...`
- `POST /` (auth) `{ targetType, targetId, rating, comment?, tags? }`
- `DELETE /:id` (author)

### Notifications `/api/notifications`
- `GET /`, `GET /unread-count` (auth)
- `GET /:id` chi tiết
- `PUT /:id/read`, `PUT /read-all`, `DELETE /:id` (auth)

### Admin `/api/admin` (admin role)
- `GET /dashboard`
- `GET /guides/pending`
- `GET /users?page=&pageSize=`
- `POST /users/:id/lock|unlock`

### AI `/api/ai`
- `POST /ask` `{ query }` → `{ answer, trips: Trip[] }` (public, attach session nếu có user)

### Upload `/api/upload`
- `POST /image` (multipart `file`) → `{ url }`
- `POST /images` (multipart `files[]`) → `{ urls }`
- File serve tại `/static/<filename>`

## DB schema

Synchronize đang BẬT (`DB_SYNCHRONIZE=true` cho dev). Khi chuyển sang prod:
1. Đặt `DB_SYNCHRONIZE=false`.
2. Generate migration: `npm run migration:generate -- src/database/migrations/Init`.
3. Run: `npm run migration:run`.

## Frontend wiring

Frontend đã có `axiosInstance` trỏ tới `VITE_API_BASE_URL`. Đổi service từ FE sang gọi API:

```ts
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const tripService = {
  getTrips: async () => {
    if (USE_MOCK) return mockTrips;
    const { data } = await axiosInstance.get<ApiResponse<{ data: Trip[] }>>('/trips');
    return data.data.data; // PaginatedResponse
  },
};
```

Hiện chỉ `tripService.ts` đã làm sẵn pattern này. Module FE còn lại (Posts, Places, Guides…) sẽ chuyển dần khi cần.

## TODO

- WebSocket (`/messages` realtime, notification push).
- Forgot password (gửi email reset).
- Migration thật thay cho `synchronize`.
- Cloudinary cho ảnh production.
- Gemini personalization dùng `user_preferences` + history.
