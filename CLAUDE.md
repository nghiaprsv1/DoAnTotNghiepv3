# CLAUDE.md — Project Memory

> **File ngữ cảnh dự án dành cho AI agent. Đọc TOÀN BỘ trước khi thay đổi bất cứ gì. Đây là nguồn sự thật duy nhất.**

---

## 1. Tổng quan

| | |
|---|---|
| **Workspace** | `c:\DoAnTotNghiepv3` |
| **Cấu trúc** | **Monorepo 2 folder tách biệt:** `frontend/` (React/Vite) + `backend/` (NestJS). Root chỉ chứa: `frontend/`, `backend/`, `documemtRAG/` (tài liệu RAG v2), `docs/` (báo cáo + `docs/CHATBOT.md`: kiến trúc/mọi case câu hỏi chatbot + `docs/CO-SO-LY-THUYET-CHATBOT.md`: cơ sở lý thuyết + công thức (RAG/BM25/RRF/cosine/ReAct…) + `docs/TIEN-XU-LY-DU-LIEU-RAG.md`: tiền xử lý dữ liệu RAG (đọc→chuẩn hoá→chunk theo câu→embedding→vector store + tokenize/stopword query-time) + `docs/THIET-KE-VECTOR-DATABASE.md`: thiết kế nâng cấp vector store sang pgvector + HNSW (CHƯA code, kèm trang web `tien-xu-ly-du-lieu-rag.html`) + `docs/co-so-ly-thuyet-recommend.html`: cơ sở lý thuyết hybrid recommender chuyến đi (weighted 0.3 match + 0.3 interaction + 0.4 hot) + `docs/so-do-usecase.html`: trang web sơ đồ Use Case toàn hệ thống (SVG UML tự layout + 28 use case ánh xạ endpoint REST, sinh bằng `docs/diagrams/tripmate-usecase-web.build.mjs`) + `docs/diagrams/`: sơ đồ .drawio dựng bằng drawio-ai-kit), `CLAUDE.md`, `render.yaml`, `.gitignore`. |
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

### Đánh giá địa điểm (Place review) — hoạt động giống review HDV
- `PlaceDetailPage` dùng component dùng chung `ReviewList` (`components/features/ReviewList`, có like + reply + tự refresh) + `ReviewModal`.
- ⚠️ **`ReviewModal` BẮT BUỘC truyền `target.targetId`** — thiếu sẽ rơi vào nhánh "preview-only" (chỉ hiện "Cảm ơn", KHÔNG POST). Đã fix: truyền `targetId: place.id` + `onSuccess` invalidate `['reviews','place',id]` và `['place',id]` để rating/reviewCount cập nhật ngay. BE review polymorphic + `recalcTarget` đã sẵn sàng cho place (đã verify E2E: post review → place rating 0→5, xoá → về 0).

### Chat nhóm nhúng trong trang chi tiết chuyến đi (chỉ member/owner)
- `TripDetailPage` render `<TripGroupChat>` (sau `TripReviewsList`) **chỉ khi `(joined || isOwner)`**.
- BE thêm `GET /messages/trip/:tripId` → `MessagesService.openTripConversation()`: tìm conversation theo `tripId` (404 nếu chưa có nhóm), gọi `listMessages` (tự ném **403 nếu không phải member**). Đã verify: owner 200, người lạ 403.
- FE: `messageService.tripConversation(tripId)` + `useTripConversation(tripId, enabled)` (retry:false). Component `TripDetail/components/TripGroupChat.tsx` tái dùng socket (`getChatSocket`) + `MessageBubble` + `MessageComposer` của trang Messages, khung cao cố định `h-[480px]`. Nút "Mở nhóm chat" trong JoinedPanel vẫn giữ song song.

### Admin xem chi tiết (modal giống duyệt HDV)
- Component dùng chung `Admin/components/AdminDetailDialog.tsx` (export `AdminDetailDialog` + `AdminSection` + `AdminRow`) — overlay mờ, hộp `max-w-3xl`, header/footer sticky.
- 5 trang admin đều có nút **"Chi tiết"** mở modal: `AdminPostsPage`, `AdminTripsPage`, `AdminPlacesPage`, `AdminWithdrawalsPage`, `AdminUsersPage`. **Dùng data sẵn trong list-row** (không fetch thêm endpoint mới). Footer modal chứa hành động tương ứng (Xoá / Mở trang / Chỉnh sửa / Duyệt-Từ chối / Nạp tiền-Khoá); nút quick-action inline vẫn giữ.

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

### Huỷ chuyến đi (nghiệp vụ đầy đủ)
- **Ai huỷ:** chủ chuyến HOẶC **admin** (xử lý vi phạm/đặc biệt). `cancelTrip(id, userId, reason?, actorRole?)` — controller `POST /trips/:id/cancel` truyền `dto.reason` + `user.role`.
- **Điều kiện:** chuyến **CHƯA khởi hành** (chặn `startDate <= hôm nay` → 400 "đã khởi hành"); không huỷ chuyến `completed`/`cancelled`.
- **Khi huỷ:** status→`CANCELLED` + lưu **`cancelReason`/`cancelledAt`/`cancelledById`** (3 cột MỚI trên bảng `trips`, KHÔNG tạo bảng mới) → thông báo mọi thành viên (`notifyMembersOfCancel`, nêu lý do + ai huỷ) → **giải phóng HDV**: `GuidesService.releaseGuideForTrip(tripId, reason)` huỷ mọi `guide_bookings` đang sống (pending/confirmed) của chuyến, **hoàn tiền** qua `handleCancel` (byGuide=true → khách được hoàn 100%, HDV không bị phạt), báo HDV (`BOOKING_CANCELLED`). Tái dùng bảng `guide_bookings` sẵn có.
- **Chặn đăng ký tiếp:** `requestJoin` + `respondJoin` ném 400 khi `status === CANCELLED` (cũng chặn `COMPLETED` ở requestJoin).
- **Module wiring:** `TripsModule` ↔ `GuidesModule` tham chiếu vòng → `forwardRef()` cả 2 phía (TripsService inject GuidesService qua `@Inject(forwardRef(...))`).
- **FE:** `tripService.cancel(id, reason?)`; `TripDetailPage` dùng `window.prompt` lấy lý do; banner đỏ hiện lý do khi `status==='cancelled'`; **nút "Huỷ (Admin)"** trên ảnh bìa cho admin không phải chủ chuyến (cạnh nút Chỉnh sửa của owner). `Trip.cancelReason` thêm vào type + adaptTrip + BackendTrip.

### Lịch làm việc HDV (trang chi tiết HDV)
- Tab **"Lịch làm việc"** trong `GuideDetailPage` (`tabs/WorkScheduleTab.tsx`): calendar 3 tháng (có nút ◀▶ chuyển trang tháng), **đánh dấu ĐỎ** những ngày HDV đã có lịch, ngày trống nền xám, hôm nay viền primary, ngày quá khứ mờ. Dữ liệu từ `GET /guides/:id/busy-dates` (đã có sẵn) — gộp booking đang hoạt động (pending/confirmed) + chuyến đi HDV tham gia (owner/member/guide). FE bung mỗi khoảng `{startDate,endDate}` thành Set ngày bận.
- ⚠️ **`busyDates` backend đã chuẩn hoá trả `yyyy-mm-dd`** qua helper `toIsoDate()` (cột `date` của PG từng trả Date object → `String()` ra "Sun Jun 07 2026 …" lệ thuộc locale, dễ lệch múi giờ). Nay luôn ISO ổn định → calendar + cảnh báo trùng lịch trong `BookingPanel` chính xác.
- **Gán booking ⇄ chuyến đi: chỉ chuyến ĐANG THAM GIA + SẮP DIỄN RA.** FE `BookingPanel.myTrips` lọc `computeTripStatus(t) === 'upcoming'` (bỏ ongoing/completed/cancelled). BE `createBooking` chốt chặn cứng: từ chối nếu trip `CANCELLED`/`COMPLETED` hoặc `startDate <= hôm nay` (đã/đang diễn ra) → 400. Đã verify E2E: gán chuyến sắp diễn ra OK, gán chuyến đã huỷ bị chặn.

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
3-5. (chỉ khi nguồn gồm `doc`) `embed_query` → `hybrid_search` (DENSE cosine + SPARSE BM25 → **RRF**) → `rerank` (**CROSS-ENCODER** chấm cặp câu hỏi–đoạn 0–10, lọc top-K — đổi sang LLM qua env). Nếu user chỉ hỏi chuyến/địa điểm → **bỏ qua cả 3 bước này** (tiết kiệm embed + rerank).
6. `build_context` — gộp đoạn tài liệu + **tóm tắt entity DB thật**.
7. `generate` — LLM sinh trả lời + giới thiệu dữ liệu thật. Grounded khi cosine≥0.3 HOẶC có ≥1 thẻ DB. **LLM chọn thẻ:** trả `{answer, selected[]}` → FE chỉ hiện thẻ LLM chọn (khớp câu trả lời).

**TẠO LỘ TRÌNH (khác với tìm chuyến có sẵn):** Router phát hiện ý định tạo (`detectItineraryIntent`: động từ tạo/lập/lên/dựng/gợi ý + lộ trình/lịch trình/kế hoạch) → `RouteResult.wantsItinerary` → ép sources=`['doc','place']` → bước generate gọi `generateItinerary()` dựng JSON `RagItinerarySuggestion` (cùng shape `AiTripSuggestion` của v1) **CHỈ từ ngữ cảnh truy hồi**. `RagAskResult.suggestion`. FE `ItineraryCard` hiện lộ trình từng ngày + nút **"Tạo chuyến"** → `ragV2Service.createTrip()` **tái dùng `POST /ai/create-trip`** (auth; khách → /login). KHÔNG viết API materialize mới. **CHỈNH SỬA:** FE gửi kèm `draft` (suggestion gần nhất) khi user nhắn tiếp → `ask(question, draft)` → `reviseItineraryFlow()` dựng lại JSON từ draft + yêu cầu (1 call LLM, không truy hồi lại).

- **Retriever (Modular — "lắp ghép LEGO"):** `lib/retrievers/retriever.interface.ts` (interface `RagRetriever` + `RetrievedCard` + `searchTokens`), `trip|place|guide|post.retriever.ts`. Thêm nguồn mới = thêm 1 class + đăng ký module + map trong `dbRetrievers()`. Các retriever ĐỌC entity domain qua repository (forFeature trong `ragv2.module.ts`), KHÔNG gọi service domain → không phụ thuộc vòng.
  - ⚠️ **PlaceRetriever — context giàu + xếp theo ĐỘ LIÊN QUAN (không chỉ rating):** `context` trả cho LLM gồm `longDescription` (ưu tiên, chứa giờ mở cửa/giờ phun lửa…) + **phí vào cổng** + loại hình + tags → trả lời được câu hỏi THUỘC TÍNH ("giá vé Bà Nà", "Cầu Rồng phun lửa mấy giờ") thay vì đổ sang `search_documents`. **Xếp hạng:** cộng điểm relevance (khớp TÊN +3/+5 > TAG +2 > MÔ TẢ +1; khớp tỉnh KHÔNG cộng) rồi `ORDER BY relevance DESC, rating DESC`. Tránh lỗi: query gồm điểm đến (vd "văn hóa Chăm Pa Đà Nẵng") khiến token "Đà"/"Nẵng" kéo về CẢ tỉnh rồi rating đẩy địa điểm đúng chủ đề (Bảo tàng Chăm) ra khỏi top. Tool `search_places` mô tả nêu rõ nó CHỨA giá vé/giờ/đặc điểm + system prompt agent có quy tắc "THUỘC TÍNH địa điểm → search_places".
  - ⚠️ **PlaceRetriever — chế độ `browse` PHẢI giữ lọc địa lý (fix Vịnh Hạ Long lọt vào "địa điểm ở Đà Nẵng"):** trước đây `browse=true` bỏ HẾT điều kiện text (cả tỉnh) → trả top-rating TOÀN QUỐC (Hạ Long 5.0★ lọt lên dù hỏi Đà Nẵng). Nay browse vẫn `locationBracket(phrase, tokens)` lọc tỉnh/thành khi câu nhắc địa danh; chỉ khi KHÔNG khớp tỉnh nào ("liệt kê tất cả địa điểm") mới browse toàn hệ thống. Browse lấy ≥12 ứng viên (thay vì `dbLimit=4`) làm "dự trữ" cho câu "địa điểm KHÁC/THÊM". Helper tách: `baseQuery()`, `locationBracket()`, `categoryClause()`, `toCard()`. System prompt agent thêm quy tắc "ĐÚNG ĐỊA PHƯƠNG" (bỏ mục khác tỉnh khỏi câu trả lời) + "HỎI ĐỊA ĐIỂM KHÁC/THÊM" (chọn mục CHƯA nhắc ở lượt trước, nhìn lại history).
  - **Seed địa điểm demo qua API admin:** `backend/scripts/seed-danang-places.mjs` (+ `danang-places.data.mjs` 15 địa điểm Đà Nẵng từ bestprice.vn) — login admin → `POST /places`, idempotent theo slug. Test chatbot: `scripts/test-chatbot-danang.mjs` (8 case). ⚠️ Test tiếng Việt qua curl trên Windows phải gửi payload từ **file UTF-8** (`--data-binary @file.json`) — truyền inline `-d '{...}'` bị **mojibake** (LLM nhận "?? N?ng" → đoán nhầm địa danh). Script `.mjs` dùng `fetch` + `JSON.stringify` nên an toàn UTF-8.
  - ⚠️ **Agent tạo lộ trình — KHÔNG tự chọn ngày + lọc thẻ chặt (fix):** (1) **Cấm tự chọn số ngày:** `RagV2Service.detectDaysSpecified(q, route)` (router.filters.days / "N ngày|đêm" / `extractDates`) → truyền `daysSpecified` vào `runRagAgent` + `ToolDeps`. Khi `wantsItinerary` mà CHƯA có ngày → `itineraryDirective` đổi sang "HỎI user số ngày, KHÔNG gọi create_itinerary"; chốt chặn cứng trong `executeTool('create_itinerary')`: `daysSpecified===false && !mentionsDays(request)` → trả observation yêu cầu hỏi, không dựng. User trả lời số ngày ở lượt sau (qua history) mới dựng. (2) **Lọc thẻ thừa:** `filterCardsByAnswer` (agent.ts) khớp **TÊN ĐẦY ĐỦ** (cụm liền, bỏ dấu + bỏ phần trong ngoặc) `ans.includes(name)` thay vì token lẻ — trước đây các thẻ "họ hàng" chung 1 từ (Cầu Vàng/Cầu Sông Hàn khi hỏi Cầu khóa tình yêu) lọt theo. Giờ chỉ hiện thẻ mà câu trả lời thực sự nêu tên.
- **Lib thuần (không phụ thuộc ngoài/pgvector):** `lib/lexical.ts` (BM25 + tokenizer VN), `lib/fusion.ts` (RRF k=60), `lib/cosine.ts`. `lib/gemini-chat.ts` có `completeJson<T>()` (rewrite/router + rerank + sinh lộ trình).
- **Trang FE standalone:** `/chatbot-v2` (`ROUTES.CHATBOT_V2`) — NGOÀI `MainLayout`, không nav, không guard. `frontend/src/pages/ChatbotV2/ChatbotV2Page.tsx`. **Thẻ kết quả bấm được** (`ResultCards`) link sang `/trips/:id` `/places/:id` `/guides/:id` `/social`; **`ItineraryCard`** hiện lộ trình + nút Tạo chuyến. **TracePanel** hiển thị mọi bước gồm router (nguồn+filter+wantsItinerary), db_retrieval, hybrid, rerank, ngữ cảnh + prompt nguyên văn.
- **Service FE:** `frontend/src/services/ragV2Service.ts` → `/rag-v2/status|ingest|ask` + `createTrip()` (gọi `/ai/create-trip`). `RagAskResult` thêm `cards`, `suggestion`. `RagStep.key` thêm `db_retrieval`.
- **BE module `ragv2`** (`backend/src/modules/ragv2/`): entity `rag_knowledge_chunks` + import `Trip/Place/GuideProfile/Post` (chỉ đọc). Endpoint `@Public`.
- **LLM đa provider (KHÔNG khoá cứng Gemini):** 2 abstract token `RagEmbeddings` + `RagChat` (`lib/rag-llm.interface.ts`); factory trong `ragv2.module.ts` chọn implementation theo env `RAGV2_LLM_PROVIDER` (`gemini` mặc định | `openai`). Bản Gemini: `lib/gemini-embeddings.ts` + `lib/gemini-chat.ts`. Bản OpenAI: `lib/openai-embeddings.ts` (`/embeddings`, batch input, header Bearer) + `lib/openai-chat.ts` (`/chat/completions`, `response_format:json_object`). `RagV2Service` inject token trừu tượng → đổi provider KHÔNG sửa pipeline. Thêm provider mới = thêm 2 class implement interface + 1 nhánh trong factory. `status()` trả thêm `provider`. **Đổi OpenAI:** set `RAGV2_LLM_PROVIDER=openai` + `OPENAI_API_KEY` (+ tùy chọn `OPENAI_BASE_URL`) + đổi `RAGV2_EMBEDDING_MODEL=text-embedding-3-small` `RAGV2_CHAT_MODEL=gpt-4o-mini`. ⚠️ **Số chiều embedding khác nhau** (Gemini 3072 vs OpenAI 1536) → đổi provider PHẢI chạy lại `npm run rag:ingest` (cosine lệch chiều nếu không).
- ⚠️ **RERANK = CROSS-ENCODER (mặc định) — đúng bản chất reranker IR, thay LLM chấm điểm:** abstract token `RagReranker` (`lib/rag-reranker.interface.ts`, method `rerank(query, texts) → {index,score}[]` thang 0–10); factory trong module chọn theo env `RAGV2_RERANK_PROVIDER` (`cross-encoder` mặc định | `llm`). **Bản cross-encoder** (`lib/cross-encoder-reranker.ts`): chạy LOCAL bằng `@xenova/transformers` (ONNX, thuần JS — không cần Python), model `Xenova/bge-reranker-base` (đa ngôn ngữ, tiếng Việt tốt). Token hoá CẶP (query, đoạn) → cross-attention → 1 logit liên quan → sigmoid×10 → thang 0–10 (giữ ngưỡng `RAGV2_RERANK_MIN_SCORE=4` cũ). Tải model LAZY 1 lần (promise singleton) vào cache `backend/models/transformers/` (~283MB, đã gitignore); tải trước bằng `npm run rerank:download`. **Bản LLM** (`lib/llm-reranker.ts`): đóng gói cách cũ (gọi `RagChat.completeJson` chấm 0–10) — GIỮ để so sánh trong báo cáo, bật `RAGV2_RERANK_PROVIDER=llm`. `RagV2Service.rerankCandidates()` chỉ gọi `this.reranker.rerank()` (không còn logic LLM inline); `via` thành `'cross-encoder'|'llm'|'fallback'|'disabled'`. `status()` trả thêm `rerankProvider`+`rerankModel`; `DocSearchDetail` thêm `rerankModel`; FE `/chatbot-v2` hiện nhãn "Cross-Encoder" + tên model. **Bằng chứng giá trị:** test "đặc sản Cao Bằng" — cross-encoder LOẠI `Vungtau.txt` dù BM25 cao nhất (9.34) vì không đúng chủ đề, giữ đúng các chunk Cao Bằng. **Env mới:** `RAGV2_RERANK_PROVIDER`, `RAGV2_RERANK_MODEL`, `RAGV2_RERANK_CACHE_DIR`, `RAGV2_RERANK_QUANTIZED`, `RAGV2_RERANK_BATCH`, `RAGV2_RERANK_MAX_LEN`, `RAGV2_RERANK_OFFLINE`. ⚠️ Fallback RRF tự động khi model tải lỗi/thiếu mạng → chatbot không chết.
- **KIẾN TRÚC AGENT (tool-calling) — MẶC ĐỊNH bật `RAGV2_AGENT=true`:** thay vì pipeline 7 bước điều phối cứng, LLM TỰ QUYẾT gọi tool nào theo vòng ReAct (reason→act→observe). `chatWithTools()` thêm vào interface `RagChat` (OpenAI: `tools`+`tool_choice:auto`+parse `tool_calls`; Gemini: `functionDeclarations`+`functionCall`/`functionResponse`). 6 tool trong `lib/rag-tools.ts`: `search_trips|search_places|search_guides|search_posts` (bọc 4 retriever), `search_documents` (pipeline RAG đầy đủ: routeAndRewrite → embed → hybrid cosine+BM25→RRF → **rerank CROSS-ENCODER** → top-K), `create_itinerary` (bọc `generateItinerary`), `revise_itinerary` (chỉ nạp khi có draft). Vòng lặp ở `ragv2.agent.ts` (`runRagAgent`, trần `RAGV2_AGENT_MAX_STEPS=5`): gọi `chatWithTools` → chạy executor → nhồi observation (role 'tool') → lặp đến khi LLM trả lời thẳng. `ask(question, draft, history)` rẽ nhánh: `RAGV2_AGENT=true` → `askWithAgent()`; `false` → pipeline 7 bước cũ (GIỮ LẠI để so sánh trong báo cáo). **History + chống dính chủ đề:** history truyền thành các lượt user/assistant RIÊNG (6 lượt gần nhất), system prompt + câu hiện tại ở lượt cuối (nhãn "CÂU HỎI HIỆN TẠI"); system prompt dạy agent tự phát hiện đổi chủ đề (điểm đến khác → yêu cầu mới, không bám lộ trình cũ); KHÔNG mặc định `suggestion=draft` (chỉ hiện lộ trình khi lượt này thực sự tạo/sửa). Trace key mới: `agent_start|agent_tool|agent_final` (FE render lời dẫn LLM + từng tool gọi + args + observation nguyên văn). Materialize lộ trình vẫn tái dùng `/ai/create-trip`.
  - ⚠️ **`search_documents` HIỂN THỊ rõ embedding + ranking trên /chatbot-v2:** tool trả kèm `docSearch: DocSearchDetail` (embedModel, dimensions, totalChunks, candidateK, rerankVia + danh sách ứng viên với điểm `dense`(cosine)/`sparse`(BM25)/`rrf`/`relevance`(rerank 0–10)/`kept`). Luồng: `searchDocuments()` trả `{hits, detail}` → `executeTool` đính `docSearch` vào `ToolResult` → agent đẩy vào `agent_tool.detail.calls[].docSearch` → FE `DocSearchDetailView` (trong `AgentToolDetail`) render bảng ứng viên (hàng xanh = được giữ sau rerank). Trước đây pipeline embed→cosine+BM25→RRF→rerank chạy thật nhưng bị "nuốt" trong hàm, trace chỉ thấy observation text; nay phơi bày đầy đủ để minh hoạ "có embedding/ranking thật".
- **BE module `ragv2`** (`backend/src/modules/ragv2/`): entity `rag_knowledge_chunks` + import `Trip/Place/GuideProfile/Post` (chỉ đọc). Endpoint `@Public`.
- **Gemini dùng cho (pipeline cũ):** router/rewrite + (nếu có doc) embed + generate (rerank giờ là **cross-encoder local**, không tốn call LLM). ⚠️ Tối đa **3 call/câu khi có doc**, **2 call/câu khi chỉ DB** (router + generate). Tắt bớt: `RAGV2_QUERY_REWRITE=false`, `RAGV2_RERANK=false`, `RAGV2_DB_RETRIEVAL=false` (đều có fallback). Model 2.5 → thinking-budget=0.
- **Nạp tài liệu:** `cd backend && npm run rag:ingest` hoặc nút trên trang. Tài liệu: `documemtRAG/*.txt` (5 file). DB không cần ingest (query trực tiếp bảng thật).
- **Env:** `RAGV2_LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `RAGV2_EMBED_BATCH` (OpenAI), `RAGV2_AGENT`, `RAGV2_AGENT_MAX_STEPS`, `RAGV2_EMBEDDING_MODEL`, `RAGV2_CHAT_MODEL`, `RAGV2_TOP_K`, `RAGV2_CANDIDATE_K`, `RAGV2_QUERY_REWRITE`, `RAGV2_RERANK`, `RAGV2_RERANK_MIN_SCORE`, `RAGV2_RERANK_PROVIDER`, `RAGV2_RERANK_MODEL`, `RAGV2_RERANK_CACHE_DIR`, `RAGV2_RERANK_QUANTIZED`, `RAGV2_RERANK_BATCH`, `RAGV2_RERANK_MAX_LEN`, `RAGV2_RERANK_OFFLINE`, `RAGV2_DB_RETRIEVAL`, `RAGV2_DB_LIMIT`, `RAGV2_DOCS_DIR`.
- **Chống bịa & validate (đã hardening):** (1) `RagAskDto.question` có `@Transform(trim)+@IsNotEmpty` → câu rỗng/toàn space trả **400** (không 500). (2) `search_documents` observation kèm cảnh báo "mỗi đoạn thuộc chủ đề theo TÊN TỆP, chỉ dùng đoạn đúng nơi được hỏi" → tránh gán nội dung tỉnh A cho tỉnh B (vd hỏi Mù Cang Chải, doc trả CaoBang.txt → bot nói "chưa có dữ liệu" thay vì bịa). (3) System prompt agent có khối "CHỐNG BỊA" (không gán sai địa danh; chỉ khẳng định HDV "nói tiếng X" khi dữ liệu ghi rõ; **KHÔNG nâng mô tả chung thành tuyên bố cụ thể** — vd dữ liệu "đạt nhiều kỷ lục thế giới" thì KHÔNG được viết "cáp treo DÀI NHẤT thế giới"). (4) `GuideRetriever.context` thêm trường `ngôn ngữ` để LLM grounding khi user hỏi theo ngôn ngữ. (5) Ý định tạo lộ trình (`detectItineraryIntent`) nới regex để bắt "tạo chuyến du lịch/tour"; agent path nhận `wantsItinerary` → chèn chỉ thị BẮT BUỘC gọi `create_itinerary` (không chỉ liệt kê chuyến có sẵn). (6) ⚠️ **LỚP CHẶN DETERMINISTIC sau LLM — `stripUnsupportedSuperlatives(answer, evidence)` (agent.ts):** quét câu trả lời, mọi tuyên bố tuyệt đối kiểu "<X> nhất / duy nhất / đầu tiên … (thế giới|Việt Nam|châu Á…)" mà LÕI ĐẶC TÍNH (vd "dài nhất", "duy nhất") KHÔNG xuất hiện trong evidence (gộp mọi observation tool của lượt) → **tự cắt bỏ cụm đó** (nuốt kèm liên từ "và/," để câu không lủng củng). GIỮ nguyên khi dữ liệu thật có (Bảo tàng Chăm "duy nhất thế giới" được giữ). Đây là backstop vì system prompt (temp đã hạ 0.2) vẫn để lọt ~1/5-1/8 lần. (7) ⚠️ **`fixCurrencyUnits(answer, evidence)` — chặn LLM ĐỔI ĐƠN VỊ TIỀN:** LLM hay "sửa cho hợp lý" số liệu vô lý (dữ liệu "7 tỉ VND" → tự viết "7 triệu"). Hàm dò cặp `<số> <đơn vị>` trong câu trả lời; nếu evidence có CÙNG con số nhưng đơn vị khác → thay về đơn vị ĐÚNG của dữ liệu. System prompt cũng có chỉ thị "GIỮ NGUYÊN VĂN số/đơn vị/giá, không làm tròn, không đổi tỉ⇄triệu". (8) ⚠️ **PlaceRetriever cắt mô tả 360→900 ký tự:** nhiều địa điểm để GIÁ VÉ / giờ ở CUỐI longDescription, cắt 360 làm LLM không thấy → trả "chưa có giá". (9) SQL injection: an toàn sẵn nhờ TypeORM tham số hoá toàn bộ ILIKE.

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
- **Animations (design system):** keyframes/animation dùng lại đã khai báo trong `tailwind.config.js > theme.extend` — `animate-fab-pop`, `animate-panel-in`/`panel-out` (popover grow, set `transformOrigin` inline), `animate-msg-in` (slide-up fade cho item list/menu), `animate-halo-pulse` (vòng sáng FAB), `animate-shimmer` (sheen quét gradient header), `animate-float`, `animate-status-pulse` (dot "online"), `animate-typing-wave`. Shadow glow cam: `shadow-glow-primary` / `shadow-glow-primary-lg`. Animation lặp vô hạn bọc `motion-safe:` để tôn trọng `prefers-reduced-motion`. Áp dụng đầu tiên ở `AIChatBubble`.
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
`frontend/capacitor.config.ts` — appId `com.tripmate.app`, webDir `dist/`, base `./`. Native project ở `frontend/android/` (đã `cap add android`).
Scripts (chạy trong `frontend/`): `cap:add:android` | `cap:sync` (=`vite build && cap sync android`) | `cap:open:android` | `android:build` (sync+mở Studio) | `android:apk` (gradlew assembleDebug) | `android:install` (adb install) | `android:run` (apk+install).
**Test trên Android Studio:** xem `docs/ANDROID-TESTING.md` (cài Studio/SDK, emulator, kết nối API). ⚠️ Địa chỉ API nhúng lúc `vite build` qua `VITE_API_BASE_URL` (file `frontend/.env.production`): emulator/LDPlayer → `http://10.0.2.2:8080/api`, điện thoại thật cùng Wi-Fi → `http://<IP-LAN>:8080/api`. BE đã listen `0.0.0.0` + CORS mở. Đổi env phải build lại.

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
