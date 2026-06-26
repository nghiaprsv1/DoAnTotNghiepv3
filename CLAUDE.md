# CLAUDE.md — Project Memory

> **File ngữ cảnh dự án dành cho AI agent. Đọc TOÀN BỘ trước khi thay đổi bất cứ gì. Đây là nguồn sự thật duy nhất.**

---

## 1. Tổng quan

| | |
|---|---|
| **Workspace** | `c:\DoAnTotNghiepv3` |
| **Cấu trúc** | **Monorepo 2 folder tách biệt:** `frontend/` (React/Vite) + `backend/` (NestJS). Root chỉ chứa: `frontend/`, `backend/`, `documemtRAG/` (tài liệu RAG v2), `docs/` (báo cáo), `CLAUDE.md`, `render.yaml`, `.gitignore`. |
| **Tên sản phẩm** | TripMate / TravelSocial |
| **Loại** | Mạng xã hội du lịch + đặt/khám phá chuyến đi, HDV, địa điểm. Thị trường VN. |
| **Design concept** | "Saffron Horizon — The Digital Concierge". Primary `#ab2d00`, gradient `editorial-gradient`. Font: `Plus Jakarta Sans` (headline) + `Inter` (body). |
| **FE port** | 3000 (`cd frontend && npm run dev`) |
| **BE port** | 8080 (`cd backend && npm run start:dev`) |

---

## 2. Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | React 18.3 + TypeScript 5.5 |
| Build | Vite 5.3 |
| Routing | react-router-dom **6.24** — `createBrowserRouter` + lazy/Suspense. Future flags `v7_startTransition` + `v7_relativeSplatPath` đã bật (tắt upgrade warnings). |
| State client | Zustand 4.5 + persist middleware |
| State server | @tanstack/react-query 5.51 (staleTime 5m, retry 1, refetchOnWindowFocus false) |
| HTTP | axios 1.7 — `axiosInstance` với interceptor tự gắn Bearer + auto-refresh 401 |
| Styling | TailwindCSS 3.4 custom palette Material 3 + `cn()` (clsx+tailwind-merge) |
| Backend | NestJS 10 + TypeORM 0.3 + PostgreSQL 16 + Passport JWT + Socket.IO (WS) + Nodemailer (OTP) |

---

## 3. Scripts

```bash
# Frontend (cd frontend/)
npm run dev          # Vite dev :3000
npm run build        # tsc + vite build
npm run build --mode lan  # build với VITE_API_BASE_URL LAN
npm run type-check   # tsc --noEmit
npm run lint / lint:fix / format

# Backend (cd backend/)
npm run start:dev    # Nest watch :8080, Swagger /docs
npm run seed         # admin@tripmate.local/admin1234 · linh@tripmate.local/demo1234
npm run seed:trips   # seed 200 trips (idempotent: skip nếu DB có ≥100)
npm run seed:guides  # seed hồ sơ HDV demo
npm run seed:provinces  # seed kho kiến thức 63 tỉnh (RAG cho AI)
npm run rag:ingest      # [RAG v2] nạp documemtRAG/*.txt|md → chunk → Gemini embedding → vector store
npm run model:download  # tải model LLM local (Qwen2.5-3B GGUF) về backend/models/

# ⚠️ Lệch thực tế: các script seed* trong package.json đang trỏ tới file đã xóa
#   (seed.ts, seed-guides.ts, seed-trips.ts, seed-ai-trips.ts, seed-provinces.ts).
#   File seed duy nhất còn lại: backend/src/seed-curated-trips.ts (20 trips curated,
#   idempotent theo title). Chạy bằng: ts-node -r tsconfig-paths/register src/seed-curated-trips.ts
#   (script npm "seed:curated" được nhắc trong file nhưng CHƯA khai báo trong package.json).
```

---

## 4. Cấu trúc `frontend/src/`

```
frontend/src/
  routes/index.tsx         # createBrowserRouter — 3 layout groups: MainLayout | AuthLayout | AdminLayout
  pages/                   # mỗi page: <Name>Page.tsx (named export) + index.ts re-export
  components/
    ui/                    # Icon, Button, Input, Badge, Avatar
    common/                # TopNav, BottomNav, Footer, AIChatBubble, ImageUpload, GlobalUserSearch…
    features/              # TripCard, GuideCard, PostCard, FilterBar
  services/                # 1 file/domain — gọi axiosInstance + unwrap + adapt
  hooks/                   # React Query wrappers — 1 hook file/domain
  store/                   # Zustand stores
  types/                   # domain interfaces
  constants/               # app.ts, routes.ts, notifications.ts, guideFilters.ts (KHÔNG còn mock*.ts)
  utils/                   # cn, formatDate, string, tripStatus
```

### Pages hiện có
`Home, Login, Register, VerifyEmail, ForgotPassword, Trips, TripDetail, CreateTrip, EditTrip, Profile, EditProfile, Messages, Social, Places (PlaceDetail), Guides (GuideDetail, GuideApply, GuideDashboard), MyBookings (BookingDetail), Wallet, Notifications (NotificationDetail), UserProfile, NotFound`

Admin (layout riêng `/admin/*`): `AdminOverview, AdminUsers, AdminGuides, AdminWithdrawals, AdminRevenue, AdminNotifications, AdminPosts, AdminTrips, **AdminPlaces**`

---

## 5. Path Aliases

`@` `@components` `@pages` `@hooks` `@services` `@store` `@utils` `@types` `@assets` `@layouts` `@routes` `@constants` → đều trỏ vào `./src/...` (tương đối từ `frontend/`, tức `frontend/src/...`)

> ⚠️ `@types` trỏ `frontend/src/types` — **KHÔNG phải** `node_modules/@types`. Không bao giờ nhầm.

---

## 6. Routes đầy đủ (`frontend/src/constants/routes.ts`)

```
/                     HOME
/login  /register  /verify-email  /forgot-password   (AuthLayout)
/trips              TRIPS
/trips/create       TRIP_CREATE
/trips/:id          TRIP_DETAIL
/trips/:id/edit     TRIP_EDIT
/trips/:id/joined   TRIP_JOINED
/profile            PROFILE
/profile/edit       PROFILE_EDIT
/messages  /messages/:id
/social             SOCIAL
/guides  /guides/:id  /guides/apply  /guide/dashboard
/places  /places/:id
/my-bookings  /bookings/:id
/wallet
/notifications  /notifications/:id
/users/:id  /users/:id/followers  /users/:id/following
/admin  /admin/users  /admin/guides  /admin/withdrawals
/admin/revenue  /admin/notifications  /admin/posts
/admin/trips  /admin/places
```

**Helper functions:** `tripDetailPath(id)` `tripEditPath(id)` `tripJoinedPath(id)` `guideDetailPath(id)` `messageThreadPath(id)` `bookingDetailPath(id)` `placeDetailPath(id)` `userProfilePath(id)` `userFollowersPath(id)` `userFollowingPath(id)` `notificationDetailPath(id)`

> **ProtectedRoute đã bật** (`frontend/src/routes/index.tsx`): nhóm public (Home, Trips, TripDetail, Social, Guides, Places, UserProfile) mở cho khách; nhóm cần đăng nhập (`/trips/create`, `/trips/:id/edit`, `/profile`, `/profile/edit`, `/messages*`, `/guides/apply`, `/guide/dashboard`, `/notifications*`, `/my-bookings`, `/bookings/:id`, `/wallet`) bọc `<ProtectedRoute>`; nhóm admin bọc `<ProtectedRoute roles={['admin']}>`.

---

## 7. Domain Types (`frontend/src/types/`)

### User (`user.ts`)
```ts
User { id, email, name, avatar?, role: 'admin'|'user'|'moderator'|'guide', createdAt, updatedAt }
AuthTokens { accessToken, refreshToken }
UserRole = 'admin' | 'user' | 'moderator' | 'guide'
```
> BE `User` entity (`backend/.../user.entity.ts`) còn có: `handle, cover, bio, location, phone, socialLinks(jsonb), preferences(jsonb TravelPreferences), isLocked, verified, **emailVerified, emailVerifiedAt**`. Entity phụ: `RefreshToken` (lưu hash + rotate), `EmailVerification` (OTP hash), `Follow`, `UserPreference`.

### Trip (`trip.ts`)
```ts
TripCategory = 'beach'|'mountain'|'food'|'culture'|'city'|'island'|'adventure'
Trip { id, title, description, destination, category: TripCategory, coverImage, gallery?,
  startDate, endDate, durationDays, priceFrom, currency, rating, maxMembers, memberCount,
  members: TripMember[], creator: TripMember, guide?: TripGuide, tags, inclusions?,
  itinerary: ItineraryDay[], isJoined?, isOwner?, status?, joinRequestStatus?,
  pendingRequests?, isSaved?, recommendScore?, recommendReasons?, scoreBreakdown? }
TripGuide { id, name, avatar, region, rating, reviewCount?, yearsExperience?, languages?,
  specialties?, bio?, verified? }
HireableGuide extends TripGuide { userId?, pricePerDay, currency,
  availability: 'available'|'busy'|'fully-booked', availabilityLabel?, toursCompleted?,
  regionKeys?, categoryKeys? }
ItineraryDay { dayNumber, date, title, activities: ItineraryActivity[] }
ItineraryActivity { time, title, description?, images? }
TripInclusions { accommodation?, transport?, meals? }
JoinRequestStatus = 'pending'|'accepted'|'rejected'|'cancelled'
PendingJoinRequest { id, message?, createdAt, user: {id,name,avatar?,handle?} }
```
`Trip.status` (backend lifecycle) = `'draft'|'published'|'cancelled'|'completed'`

### Post (`post.ts`)
```ts
Post { id, authorId, authorName, authorAvatar, authorVerified?, location, postedAt,
  title, excerpt, body?, image, gallery?, tags?, likes, comments, shares?,
  isBookmarked?, isLiked?, visibility?: 'public'|'friends', topComments? }
PostComment { id, authorId, authorName, authorAvatar, content, createdAt,
  parentId?, likes?, isLiked? }
```

### Place (`place.ts`)
```ts
PlaceCategory = 'beach'|'mountain'|'culture'|'food'|'city'|'island'|'nature'|'historical'|'adventure'
Place { id, name, slug, description, longDescription?, category, province, city?,
  address?, coverImage, gallery?, rating, reviewCount, entranceFee?, tags?, relatedIds?, reviews?, isSaved? }
```
> ⚠️ **Đã LƯỢC BỎ các field** (cả entity BE + DTO + FE type + form admin + UI): `duration`, `bestTime`, `highlights`, `coordinates(lat/lng)`, `openingHours`. Entity `PlaceOpeningHour` + bảng `place_opening_hours` đã xóa hẳn. Mô tả chung + thời tiết + mùa thích hợp gộp chung vào `description`/`longDescription`. **`entranceFee` (phí vào cổng) ĐƯỢC GIỮ** — hiển thị ở PlaceCard, PlaceDetail (quick stat + sidebar) + sửa được trong form admin. DB dùng `synchronize` (không migration) → cột cũ tự drop khi chạy lại.

### Common (`common.ts`)
```ts
ApiResponse<T> { data: T, message, success, statusCode }
PaginatedResponse<T> { data: T[], total, page, pageSize, totalPages }
```

---

## 8. Services (`frontend/src/services/`)

### Pattern chuẩn
```ts
import axiosInstance from './axiosInstance'
import { unwrap, unwrapList, unwrapPage } from './unwrap'

// unwrap()       → ApiResponse<T>            → T
// unwrapList()   → ApiResponse<Paginated<T>> → T[]
// unwrapPage()   → ApiResponse<Paginated<T>> → PaginatedResponse<T>

export const xService = {
  list: async (): Promise<X[]> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<BackendX>>>('/x')
    return unwrapList(res).map(adaptX)
  },
}
```

### Adapter pattern — mỗi service có `adaptX()` map BE → FE shape
- `adaptTrip(b)` — `tripService.ts` — **exported** (dùng bởi savedService)
- `adaptPost(b)` — `postService.ts` — **exported**
- `adaptGuide(b)` — `guideService.ts` — **exported**

### Services hiện có
| File | Endpoints wrap |
|---|---|
| `authService.ts` | `/auth/login|register|verify-email|resend-verification|refresh|logout|profile|password` |
| `tripService.ts` | `/trips` CRUD + join/leave/requests/itinerary/recommended |
| `postService.ts` | `/posts` CRUD + like/comment/commentLike |
| `guideService.ts` | `/guides` list/detail + bookings/wallet/apply |
| `placeService.ts` | `/places` list/detail/categories/provinces + **admin create/update/remove/listRaw** |
| `savedService.ts` | `/saved/toggle` + `/saved/posts|trips|guides` |
| `userService.ts` | `/users/:id` profile/follow/unfollow/followers/following |
| `messageService.ts` | `/messages` conversations/direct/groups/history |
| `notificationService.ts` | `/notifications` list/read/unread-count |
| `bookingService.ts` | `/guides/bookings` CRUD + traveler/guide lists |
| `walletService.ts` | `/guides/wallet/me` + withdrawals |
| `paymentService.ts` | `/payments/sepay/intent` |
| `adminService.ts` | `/admin/*` dashboard/users/guides/posts/trips/revenue/wallets/notifications |
| `reviewService.ts` | `/reviews` create/list/like/delete |
| `uploadService.ts` | `/upload/image|images` |
| `aiAssistantService.ts` | **Bong bóng AIChatBubble giờ gọi `/rag-v2/ask` (BACKEND AGENT v2)**, KHÔNG hiện trace. `ask(query, history, draft)` gửi cả history → map `{answer,cards,suggestion}` (bỏ `trace`) về `AskResult{answer,intent,cards,suggestion}`. `createTrip` vẫn `/ai/create-trip`. (Endpoint v1 `/ai/ask` vẫn còn ở BE nhưng FE bong bóng không dùng nữa.) |
| `ragV2Service.ts` | `/rag-v2/status|ingest|ask` (chatbot RAG v2 thử nghiệm, độc lập) |
| `preferenceService.ts` | `/users/me/preferences` get/update (cá nhân hoá gợi ý — `user_preferences`) |
| `chatSocket.ts` | Socket.IO client cho messages realtime (kết nối WS gateway, không qua axios) |

### `placeService` — admin-specific exports
```ts
placeService.listRaw(params?)      → AdminPlaceRow[]   // giữ categoryId/provinceId cho edit form
placeService.create(payload)       → Place
placeService.update(id, payload)   → Place
placeService.remove(id)            → void
interface AdminPlacePayload { name,slug,description,longDescription?,categoryId,provinceId,city?,address?,coverImage,gallery?,entranceFee?,tags?,rating? }
interface AdminPlaceRow { id,name,slug,description,longDescription?,categoryId?,categoryLabel,provinceId?,provinceName,city?,address?,coverImage,gallery,entranceFee?,tags,rating }
```

---

## 9. Hooks (`frontend/src/hooks/`)

```
useAuth.ts          → login/register/logout
useTrips.ts         → useTrips, useTrip(id), useMyCreatedTrips, useMyJoinedTrips, useRecommendedTrips
usePosts.ts         → usePosts, usePost(id), usePostComments(id)
useGuides.ts        → useGuides, useGuide(id), useBookGuide
usePlaces.ts        → usePlaces, usePlace(id), usePlaceCategories, usePlaceProvinces
useSaved.ts         → useSavedPosts, useSavedTrips, useSavedGuides, useToggleSaved
useAdminPlaces.ts   → useAdminPlaces, useCreatePlace, useUpdatePlace, useDeletePlace, usePlaceCategories, usePlaceProvinces
useAdmin.ts         → useAdminDashboard, useAdminUsers, usePendingGuides, useLockUser, useApproveGuide...
useMessages.ts      → useConversations, useMessageHistory(id)
useNotifications.ts → useNotifications, useUnreadNotificationCount
useUserProfile.ts   → useUserProfile(id), useFollowers(id), useFollowing(id)
useBookings.ts      → useMyBookingsAsTraveler, useMyBookingsAsGuide
useWallet.ts        → useWallet, useWithdrawal
useDebounce.ts      useDisclosure.ts
```

---

## 10. Stores (`frontend/src/store/`)

| Store | Persist key | Nội dung |
|---|---|---|
| `authStore.ts` | `auth-storage` | `user, tokens, isAuthenticated` + setAuth/logout |
| `currentUserStore.ts` | `travelsocial-current-user-v2` | `id,name,email,avatar,role` + syncFromAuth/update/reset/toggleGuide |
| `aiAssistantStore.ts` | `travelsocial-ai-assistant` | `enabled,isOpen,messages` + open/close/toggle/addMessage |
| `notificationStore.ts` | — | items khởi tạo `[]` (setItems sau khi fetch API) + markAsRead/unreadCount |
| `uiStore.ts` | — | theme/sidebar/loading |

> `useCurrentUserStore.isGuide(role)` → `role === 'guide' || role === 'admin'`

---

## 11. Auth flow

1. `authService.register` → BE tạo user `emailVerified: false`, **không trả token**, gửi OTP 6 số qua email → FE điều hướng `/verify-email`
2. `authService.verifyEmail(email, code)` → đúng OTP → BE set `emailVerified: true` + trả `{ user, tokens }` (đăng nhập luôn). `resendVerification` gửi lại mã (cooldown 60s)
3. `authService.login/register-after-verify` → `{ user, tokens }`. **Login bị chặn nếu chưa verify** (BE trả 401 code `EMAIL_NOT_VERIFIED`)
4. `useAuthStore.setAuth(user, tokens)` + `currentUserStore.syncFromAuth(user)`
5. `axiosInstance` request interceptor: gắn `Authorization: Bearer <accessToken>`
6. Response interceptor 401: POST `/auth/refresh` → `setTokens` + retry; fail → `logout()` + redirect `/login`

> OTP: TTL 15', tối đa 5 lần thử/mã, cooldown resend 60s. BE lưu **hash** OTP (`EmailVerification`) + hash refresh token (`RefreshToken`, rotate mỗi lần refresh).

---

## 12. Backend modules (`backend/src/modules/`)

| Module | Key entities | Notable |
|---|---|---|
| `auth` | User, RefreshToken, EmailVerification | JWT access 15m + refresh 7d (rotate, lưu hash); **xác thực email OTP 6 số** trước khi cho login |
| `user` | User, UserPreference | follow/unfollow, TravelPreferences (JSONB) + `user_preferences` (cá nhân hoá gợi ý); API `GET/PUT /users/me/preferences` |
| `trip` | Trip, TripMember, TripJoinRequest, ItineraryDay, ItineraryActivity, TripInteraction | `assertNoDateConflict` chặn tạo trip trùng ngày; **recommend() chấm điểm trọng số** 0.3 match + 0.3 interaction + 0.4 hot (min–max normalize); tracking `POST /trips/:id/view|click` |
| `post` | Post, PostComment | feed foryou/following/trending |
| `guide` | GuideProfile, GuideBooking, Wallet, WalletTransaction | `loadStats()` + `decorateWithStats()` + `attachStatsToGuides()` (public) — tính live rating/review/toursCompleted từ DB. ⚠️ **GuideProfile đã LƯỢC BỎ** `coverImage`, `gallery`, `highlights`, `responseTime` (BE entity+DTO+loadStats, FE type/service/UI, RAG retriever, admin duyệt hồ sơ). `loadStats` KHÔNG còn tính median responseTime (đã xóa query PERCENTILE_CONT + `formatResponseTime`). Card/Detail HDV dùng banner `editorial-gradient` + avatar thay ảnh cover; booking `tourCover` dùng `guide.avatar`. **Lọc** vẫn bằng `regionKeys`/`categoryKeys` (giữ nguyên). Giấy tờ (`idCardNumber/idCardImage/certificateImages`) GIỮ. |
| `place` | Place, Category, Province | admin CRUD guard `@Roles(ADMIN)` |
| `saved` | SavedItem | toggle + listPosts/Trips/Guides; **listGuides gọi guidesService.attachStatsToGuides** (forwardRef circular) |
| `message` | Conversation, Message | WebSocket gateway + REST |
| `notification` | Notification | push + mark-read |
| `review` | Review | polymorphic target: place\|trip\|guide\|member. ⚠️ **rating/reviewCount của Place & Trip tính từ review THẬT** — `ReviewsService.recalcTarget()` chạy sau mỗi create/remove review gốc, ghi lại `places.rating`/`review_count` + `trips.rating` (Trip không có cột review_count). KHÔNG còn số seed hardcode (vd 4.95/2100). Guide thì tính live qua `GuidesService.loadStats` (không dùng recalcTarget). FE hiện "Chưa có đánh giá"/"Mới" khi reviewCount=0. |
| `payment` | WalletTransaction | SePay webhook |
| `upload` | — | Firebase Storage khi có env, fallback local `uploads/` |
| `mail` | — | Nodemailer gửi OTP xác thực email. Cấu hình `SMTP_*`; **không có SMTP → log mã ra console** (dev/demo vẫn chạy). `MailService.sendVerificationCode()` |
| `ai` | AiChatSession, AiChatMessage | **Pipeline 3 bước (HIỂU→LÀM→TRẢ) + RAG 63 tỉnh + multi-provider LLM (local/gemini/template)**. Xem §AI bên dưới. |
| `ragv2` | KnowledgeChunk (`rag_knowledge_chunks`) | **Chatbot RAG v2 thử nghiệm, độc lập.** Mặc định chạy **kiến trúc AGENT (tool-calling/ReAct)**: LLM tự gọi 6 tool (4 retriever DB + tra tài liệu vector + dựng lộ trình). Pipeline 7 bước cũ giữ lại (bật `RAGV2_AGENT=false`). Embedding đa provider (Gemini/OpenAI) + vector store Postgres (jsonb) + cosine. Endpoints `@Public` `/rag-v2/status|ingest|ask`. Xem §Chatbot RAG v2. |
| `admin` | — | dashboard stats, lock/unlock users, bulk topup |

### BE circular dependency đã giải quyết
`GuidesModule ↔ SavedModule` dùng `forwardRef()` cả 2 chiều (module + constructor `@Inject(forwardRef(...))`).

### BE common
```
ResponseInterceptor global  → wrap mọi response thành ApiResponse<T>
GlobalExceptionFilter       → chuẩn hoá lỗi
JwtAuthGuard global         → opt-out qua @Public()
RolesGuard                  → @Roles(UserRole.ADMIN)
```

### Trip itinerary — CREATE flow
- `CreateTripPage.tsx` tự điền `date` cho mỗi ngày = `startDate + index` (fix: trước đây bị filter do date trống)
- Payload `itinerary[]` gửi lên BE, service `saveItinerary()` lưu vào `itinerary_days` + `itinerary_activities`
- Edit sau khi tạo: `ItineraryEditorModal` → `PUT /trips/:id/itinerary`

---

## 13. Tính năng đã implement (trạng thái hiện tại)

### Xác thực email OTP (đăng ký 2 bước)
- Đăng ký → BE tạo user `emailVerified: false`, gửi OTP 6 số (Nodemailer / log console nếu chưa cấu hình SMTP), **chưa cấp token**.
- FE `RegisterPage` → điều hướng `VerifyEmailPage` (`/verify-email`): nhập OTP, nút gửi lại mã (cooldown 60s).
- Verify đúng → BE cấp `{ user, tokens }` (đăng nhập luôn). Login chặn user chưa verify (401 `EMAIL_NOT_VERIFIED`).
- BE: bảng `email_verifications` (hash OTP, TTL 15', max 5 lần thử) + `refresh_tokens` (hash, rotate). Xem §11.

### Bookmark / Saved
- Nút **❤ lưu** có ở: `TripCard`, `GuideListingCard`, `FeedPostCard`
- Optimistic update + rollback on error
- Profile tab **"Đã lưu"** → 3 sub-section: Chuyến đi / HDV / Bài viết
- BE: `/saved/toggle` + `/saved/posts|trips|guides`

### Profile — "Chuyến đi của tôi"
Tách thành 2 nhóm dùng `computeTripStatus(trip)`:
- **Đang tham gia** — `upcoming | ongoing`
- **Đã hoàn thành** — `completed | cancelled`

### Admin — Places
Trang `/admin/places` đầy đủ: bảng + tìm kiếm + dialog Create/Edit (ảnh bìa upload, category/province select, tags, highlights) + Xoá có confirm.

### Trip date conflict
- BE `trips.service.assertNoDateConflict()` — **chặn** tạo trip (throw 400) nếu user đang tham gia trip trùng ngày, thông báo tiếng Việt tên trip bị trùng.
- BE `trips.service.findDateConflict(userId, start, end)` — phiên bản **không ném lỗi**, trả `Trip | null`. Dùng bởi AI assistant để cảnh báo nhẹ nhàng khi chốt chuyến.

### AI Travel Assistant (kiến trúc mới — quan trọng)
Trợ lý du lịch theo **pipeline 3 bước, KHÔNG khoá cứng vào Gemini**:
1. **HIỂU** — LLM đọc câu user → `ParsedTask { intent, destination, days, budget, prefs }`
2. **LÀM VIỆC** — code thuần + query DB tìm trips/places/provinces **thật** khớp task (không LLM, không bịa)
3. **TRẢ VỀ** — LLM viết câu trả lời / lộ trình tiếng Việt **chỉ từ dữ liệu thật** cho sẵn

**Multi-provider LLM** (`backend/src/modules/ai/llm/`), chọn qua env `LLM_PROVIDER`:
| Provider | File | Mô tả |
|---|---|---|
| `gemini` (**mặc định**) | `gemini.provider.ts` | Google Gemini (env `GEMINI_API_KEY` + `GEMINI_MODEL`, mặc định `gemini-2.0-flash`). Base URL đổi được qua `GEMINI_BASE_URL` (proxy bên thứ 3 rẻ hơn — phải gồm `/v1beta`, không có `/` cuối; để trống = endpoint Google). Dùng chung cho cả v1 + RAG v2. |
| `local` | `local-llm.provider.ts` | Self-host Qwen2.5-3B GGUF qua `node-llama-cpp`. GPU offload, queue serialize request. **GIỮ LẠI để chạy luân phiên đo hiệu quả** — đổi `LLM_PROVIDER=local`. |
| `template` | `template.provider.ts` | Fallback không cần LLM — đi thẳng luồng DB |
- Inject qua DI token `LLM_PROVIDER` (factory trong `ai.module.ts`). Interface chung: `LlmProvider { name, isReady(), complete(), generateJson() }`.
- Mọi bước có fallback → chatbot không chết khi LLM lỗi.
- ⚠️ **Đổi mặc định Qwen→Gemini:** factory default = `gemini`; `LocalLlmProvider` **không còn auto-load model trong constructor** (đã comment, không xóa) → Qwen chỉ nạp *lazy* khi `LLM_PROVIDER=local`. Bật lại Qwen: đổi env + bỏ comment 3 dòng `LLM_*` trong `.env`.
- ⚠️ **Gemini 2.5 là thinking model:** token suy luận (`thoughtsTokenCount`) **tính vào `maxOutputTokens`** → JSON lộ trình bị cắt cụt (`finishReason=MAX_TOKENS`) → `generateJson` trả null → fallback "Mình chưa dựng được lộ trình". **Fix:** tắt thinking bằng `thinkingConfig.thinkingBudget=0` (env `GEMINI_THINKING_BUDGET`, mặc định 0; chỉ gắn cho model `2.5`, model `2.0` không có tham số này). Áp dụng ở CẢ `gemini.provider.ts` (v1) và `ragv2/lib/gemini-chat.ts` (v2).

**RAG — Knowledge base 63 tỉnh** (`backend/src/data/provinces-kb.ts`, 718 dòng):
- Seed vào bảng `provinces` qua `npm run seed:provinces`. `Province` entity có: `summary, bestSeason, specialties[], highlights[], knownFor`.
- LLM **chỉ** được dùng địa danh/đặc sản trong "THÔNG TIN THẬT" này, cấm bịa.

**Hội thoại tạo chuyến (stateful qua `draft`):**
- FE gửi kèm `draft` (lộ trình đang dựng) → bot phân loại `edit_place` (thay địa điểm) hoặc `finalize` (chốt ngày/người/chi phí).
- Parser tiếng Việt `extractFinalizeSlots()`: đọc "2 triệu rưỡi", "1tr5", "ngày 20 tháng 12", số người, lưu trú/di chuyển/bữa ăn. Ngày trống → mặc định năm hiện tại, đã qua thì +1 năm.
- `finalize` gọi `tripsService.findDateConflict()` cảnh báo trùng lịch.
- Chốt xong → FE bấm "Tạo chuyến" → `POST /ai/create-trip` materialize thành Trip thật (creator = leader).
- `AiTripSuggestion`: `{ title, destination, durationDays, summary, itinerary[], tags, categoryKey, estimatedBudget, maxMembers, inclusions }`.

**Endpoints:** `POST /ai/ask` (Public, guest chat được; nhận `query + history + draft`) · `POST /ai/create-trip` (auth). Lịch sử lưu `AiChatSession` + `AiChatMessage`.

**Tải model local:** `cd backend && npm run model:download` (script `scripts/download-model.cjs`). Env: `LLM_PROVIDER`, `LLM_MODEL_FILE`, `LLM_GPU_LAYERS`, `LLM_MAX_TOKENS`.

### Chatbot RAG v2 (thử nghiệm — ĐỘC LẬP với trợ lý AI ở trên)
Phiên bản chatbot thứ 2, tách biệt hoàn toàn, KHÔNG đụng module `ai`/`AIChatBubble`/`aiAssistantService`. Mục đích: demo **MODULAR RAG** (Router + đa retriever + Fusion + rerank) và **hiển thị rõ phương pháp thực thi** trên UI.

**Pipeline Modular RAG (truy hồi ĐA NGUỒN: tài liệu vector + DB có cấu trúc):**
1. `query_rewrite` — **Router + rewrite gộp 1 lần gọi LLM**: viết lại câu hỏi + tách keywords + chọn NGUỒN (`doc|trip|place|guide|post`) + bóc filter (destination/category/maxBudget/days). Fallback: luật keyword (`heuristicRoute`).
2. `db_retrieval` — chạy các **Search module** Router chọn: TripRetriever/PlaceRetriever/GuideRetriever/PostRetriever query DB (SQL `ILIKE`+token, **0 token LLM**), trả thẻ bấm được. Trip lọc `status=published`, Guide `status=approved`, Post `visibility=public`. **Chế độ `browse`:** khi Router nhận ý định liệt kê chung ("liệt kê HDV", "có những chuyến nào", "tất cả địa điểm") — không có từ khoá lọc — retriever bỏ điều kiện khớp text, trả top-N theo rating. Liệt kê đã rõ nguồn DB thì bỏ `doc` (khỏi tốn embed/rerank).
3-5. (chỉ khi nguồn gồm `doc`) `embed_query` → `hybrid_search` (DENSE cosine + SPARSE BM25 → **RRF**) → `rerank` (LLM chấm 0–10, lọc top-K). Nếu user chỉ hỏi chuyến/địa điểm → **bỏ qua cả 3 bước này** (tiết kiệm embed + rerank).
6. `build_context` — gộp đoạn tài liệu + **tóm tắt entity DB thật**.
7. `generate` — LLM sinh trả lời + giới thiệu dữ liệu thật. Grounded khi cosine≥0.3 HOẶC có ≥1 thẻ DB. **LLM chọn thẻ:** trả `{answer, selected[]}` → FE chỉ hiện thẻ LLM chọn (khớp câu trả lời).

**TẠO LỘ TRÌNH (khác với tìm chuyến có sẵn):** Router phát hiện ý định tạo (`detectItineraryIntent`: động từ tạo/lập/lên/dựng/gợi ý + lộ trình/lịch trình/kế hoạch) → `RouteResult.wantsItinerary` → ép sources=`['doc','place']` → bước generate gọi `generateItinerary()` dựng JSON `RagItinerarySuggestion` (cùng shape `AiTripSuggestion` của v1) **CHỈ từ ngữ cảnh truy hồi**. `RagAskResult.suggestion`. FE `ItineraryCard` hiện lộ trình từng ngày + nút **"Tạo chuyến"** → `ragV2Service.createTrip()` **tái dùng `POST /ai/create-trip`** (auth; khách → /login). KHÔNG viết API materialize mới. **CHỈNH SỬA:** FE gửi kèm `draft` (suggestion gần nhất) khi user nhắn tiếp → `ask(question, draft)` → `reviseItineraryFlow()` dựng lại JSON từ draft + yêu cầu (1 call LLM, không truy hồi lại).

- **Retriever (Modular — "lắp ghép LEGO"):** `lib/retrievers/retriever.interface.ts` (interface `RagRetriever` + `RetrievedCard` + `searchTokens`), `trip|place|guide|post.retriever.ts`. Thêm nguồn mới = thêm 1 class + đăng ký module + map trong `dbRetrievers()`. Các retriever ĐỌC entity domain qua repository (forFeature trong `ragv2.module.ts`), KHÔNG gọi service domain → không phụ thuộc vòng.
- **Lib thuần (không phụ thuộc ngoài/pgvector):** `lib/lexical.ts` (BM25 + tokenizer VN), `lib/fusion.ts` (RRF k=60), `lib/cosine.ts`. `lib/gemini-chat.ts` có `completeJson<T>()` (rewrite/router + rerank + sinh lộ trình).
- **Trang FE standalone:** `/chatbot-v2` (`ROUTES.CHATBOT_V2`) — NGOÀI `MainLayout`, không nav, không guard. `frontend/src/pages/ChatbotV2/ChatbotV2Page.tsx`. **Thẻ kết quả bấm được** (`ResultCards`) link sang `/trips/:id` `/places/:id` `/guides/:id` `/social`; **`ItineraryCard`** hiện lộ trình + nút Tạo chuyến. **TracePanel** hiển thị mọi bước gồm router (nguồn+filter+wantsItinerary), db_retrieval, hybrid, rerank, ngữ cảnh + prompt nguyên văn.
- **Service FE:** `frontend/src/services/ragV2Service.ts` → `/rag-v2/status|ingest|ask` + `createTrip()` (gọi `/ai/create-trip`). `RagAskResult` thêm `cards`, `suggestion`. `RagStep.key` thêm `db_retrieval`.
- **BE module `ragv2`** (`backend/src/modules/ragv2/`): entity `rag_knowledge_chunks` + import `Trip/Place/GuideProfile/Post` (chỉ đọc). Endpoint `@Public`.
- **LLM đa provider (KHÔNG khoá cứng Gemini):** 2 abstract token `RagEmbeddings` + `RagChat` (`lib/rag-llm.interface.ts`); factory trong `ragv2.module.ts` chọn implementation theo env `RAGV2_LLM_PROVIDER` (`gemini` mặc định | `openai`). Bản Gemini: `lib/gemini-embeddings.ts` + `lib/gemini-chat.ts`. Bản OpenAI: `lib/openai-embeddings.ts` (`/embeddings`, batch input, header Bearer) + `lib/openai-chat.ts` (`/chat/completions`, `response_format:json_object`). `RagV2Service` inject token trừu tượng → đổi provider KHÔNG sửa pipeline. Thêm provider mới = thêm 2 class implement interface + 1 nhánh trong factory. `status()` trả thêm `provider`. **Đổi OpenAI:** set `RAGV2_LLM_PROVIDER=openai` + `OPENAI_API_KEY` (+ tùy chọn `OPENAI_BASE_URL`) + đổi `RAGV2_EMBEDDING_MODEL=text-embedding-3-small` `RAGV2_CHAT_MODEL=gpt-4o-mini`. ⚠️ **Số chiều embedding khác nhau** (Gemini 3072 vs OpenAI 1536) → đổi provider PHẢI chạy lại `npm run rag:ingest` (cosine lệch chiều nếu không).
- **KIẾN TRÚC AGENT (tool-calling) — MẶC ĐỊNH bật `RAGV2_AGENT=true`:** thay vì pipeline 7 bước điều phối cứng, LLM TỰ QUYẾT gọi tool nào theo vòng ReAct (reason→act→observe). `chatWithTools()` thêm vào interface `RagChat` (OpenAI: `tools`+`tool_choice:auto`+parse `tool_calls`; Gemini: `functionDeclarations`+`functionCall`/`functionResponse`). 6 tool trong `lib/rag-tools.ts`: `search_trips|search_places|search_guides|search_posts` (bọc 4 retriever), `search_documents` (embed→hybrid→RRF, không rerank — agent tự đánh giá), `create_itinerary` (bọc `generateItinerary`), `revise_itinerary` (chỉ nạp khi có draft). Vòng lặp ở `ragv2.agent.ts` (`runRagAgent`, trần `RAGV2_AGENT_MAX_STEPS=5`): gọi `chatWithTools` → chạy executor → nhồi observation (role 'tool') → lặp đến khi LLM trả lời thẳng. `ask(question, draft, history)` rẽ nhánh: `RAGV2_AGENT=true` → `askWithAgent()`; `false` → pipeline 7 bước cũ (GIỮ LẠI để so sánh trong báo cáo). **History + chống dính chủ đề:** history truyền thành các lượt user/assistant RIÊNG (6 lượt gần nhất), system prompt + câu hiện tại ở lượt cuối (nhãn "CÂU HỎI HIỆN TẠI"); system prompt dạy agent tự phát hiện đổi chủ đề (điểm đến khác → yêu cầu mới, không bám lộ trình cũ); KHÔNG mặc định `suggestion=draft` (chỉ hiện lộ trình khi lượt này thực sự tạo/sửa). Trace key mới: `agent_start|agent_tool|agent_final` (FE render lời dẫn LLM + từng tool gọi + args + observation nguyên văn). Materialize lộ trình vẫn tái dùng `/ai/create-trip`.
- **BE module `ragv2`** (`backend/src/modules/ragv2/`): entity `rag_knowledge_chunks` + import `Trip/Place/GuideProfile/Post` (chỉ đọc). Endpoint `@Public`.
- **Gemini dùng cho (pipeline cũ):** router/rewrite + (nếu có doc) embed + rerank + generate. ⚠️ Tối đa **4 call/câu khi có doc**, **2 call/câu khi chỉ DB** (router + generate). Tắt bớt: `RAGV2_QUERY_REWRITE=false`, `RAGV2_RERANK=false`, `RAGV2_DB_RETRIEVAL=false` (đều có fallback). Model 2.5 → thinking-budget=0.
- **Nạp tài liệu:** `cd backend && npm run rag:ingest` hoặc nút trên trang. Tài liệu: `documemtRAG/*.txt` (5 file). DB không cần ingest (query trực tiếp bảng thật).
- **Env:** `RAGV2_LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `RAGV2_EMBED_BATCH` (OpenAI), `RAGV2_AGENT`, `RAGV2_AGENT_MAX_STEPS`, `RAGV2_EMBEDDING_MODEL`, `RAGV2_CHAT_MODEL`, `RAGV2_TOP_K`, `RAGV2_CANDIDATE_K`, `RAGV2_QUERY_REWRITE`, `RAGV2_RERANK`, `RAGV2_RERANK_MIN_SCORE`, `RAGV2_DB_RETRIEVAL`, `RAGV2_DB_LIMIT`, `RAGV2_DOCS_DIR`.

### React Router future flags
```ts
createBrowserRouter(routes, {
  future: { v7_startTransition: true, v7_relativeSplatPath: true }
})
```
→ không còn warning console về v7 upgrade.

---

## 14. Quy ước code

- **Page:** `frontend/src/pages/<Name>/<Name>Page.tsx` (named export) + `index.ts` re-export → router lazy `.then(m => ({ default: m.XPage }))`
- **Component:** `ui/` (primitive) | `common/` (layout/util) | `features/` (domain-coupled)
- **Service:** gọi axiosInstance → unwrap → adapt → return FE type. **Không mock trong service.**
- ⚠️ **KHÔNG còn mock data / mock fallback pattern.** Toàn bộ file `constants/mock*.ts` (9 file) đã bị XÓA — mọi dữ liệu phải request từ DB qua hook/service. Khi API rỗng → hiển thị `<EmptyState>` (KHÔNG fallback sang mock). `constants/` giờ chỉ còn: `app.ts`, `routes.ts`, `notifications.ts` (NOTIFICATION_ICON/TONE), `guideFilters.ts` (REGION/CATEGORY_FILTERS), `index.ts` (barrel chỉ export app+routes).
- Import nội bộ: alias `@...` không dùng relative deep
- TypeScript strict: `interface` cho domain, `type` cho union/literal
- Tailwind utility + `cn()`, tránh CSS riêng

---

## 15. Gotchas

- `@types` alias → `frontend/src/types` (KHÔNG phải `node_modules/@types`)
- `axiosInstance` dùng `useAuthStore.getState()` ngoài React — đúng, không re-render
- Workspace path có tiếng Việt → quote khi dùng shell
- `currentUserStore.role` dùng để check admin guard ở FE (AdminLayout redirect nếu role ≠ 'admin')
- `placeService.listRaw()` trả `AdminPlaceRow` giữ `categoryId`/`provinceId` — dùng cho edit form. `placeService.list()` trả `Place` đã flatten, không có ids.
- Circular dep guides↔saved đã xử lý bằng forwardRef — **không thêm import trực tiếp giữa 2 module này**
- `adaptTrip`, `adaptPost`, `adaptGuide` đã được **export** từ service file → savedService import để dùng
- ⚠️ **Update entity có eager relation:** `places.service.update()` từng để `Object.assign(existing, dto)` rồi `save()` → vì `category`/`province` là `eager:true`, object relation CŨ ghi đè FK mới (`categoryId`/`provinceId`) → đổi tỉnh/danh mục KHÔNG lưu. **Fix:** sau assign phải set `existing.category = existing.province = undefined` để FK column là nguồn sự thật, rồi reload bằng `findById`. Pattern này áp dụng cho mọi update entity có eager FK.
- ⚠️ **`synchronize:true` chỉ chạy khi BE KHỞI ĐỘNG LẠI:** thêm/bớt `@Column` trong entity → phải restart `npm run start:dev` thì cột mới được tạo/drop trong DB. Nếu không, field mới (vd `entrance_fee`) gửi từ FE sẽ bị TypeORM bỏ qua dù DTO hợp lệ.

---

## 16. Seed accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@tripmate.local | admin1234 |
| Traveler | linh@tripmate.local | demo1234 |

Swagger: `http://localhost:8080/docs`

---

## 17. Firebase / SePay / Capacitor

### Firebase Storage
`backend/src/modules/upload/firebase-storage.service.ts` — khi set `FIREBASE_STORAGE_BUCKET` + credential → upload lên bucket, còn lại fallback `uploads/` local.

### SePay
- `POST /api/payments/sepay/intent` → WalletTransaction PENDING + QR
- `POST /api/payments/sepay/webhook` (header `Authorization: Apikey <SEPAY_WEBHOOK_TOKEN>`) → mark SUCCESS + cộng wallet
- FE: `paymentService.ts` + `Wallet/components/SepayTopUpModal.tsx`

### Capacitor Android
`frontend/capacitor.config.ts` — appId `com.tripmate.app`, webDir `dist/`, base `./`. Native project ở `frontend/android/`.
Scripts (chạy trong `frontend/`): `cap:add:android` | `cap:sync` | `cap:open:android` | `android:build`

---

## 18. Backlog (việc cần tiếp tục)

1. ✅ ~~**ProtectedRoute**~~ — ĐÃ XONG: bật cho `/profile`, `/profile/edit`, `/trips/create`, `/guide/dashboard`, `/messages*`, `/wallet`, `/my-bookings`... + admin guard `roles={['admin']}` (xem §6, `src/routes/index.tsx`)
2. **Form validation** — react-hook-form + zod (chưa cài)
3. **Dark mode** — `darkMode: 'class'` đã bật, cần toggle UI + token
4. **Tests** — vitest cho services/hooks (chỉ có `test/setup.ts`)
5. **i18n** — UI hỗn hợp Việt/Anh
6. **Nút lưu TripDetail** — hiện chỉ có ở TripCard, chưa có trong trang chi tiết
7. **Tab "Đánh giá"** trong Profile — hiện EmptyState "đang phát triển"
8. **Script seed** — `package.json` còn trỏ tới file seed đã xóa; cần dọn lại hoặc thêm script `seed:curated` cho `seed-curated-trips.ts` (xem §3)
