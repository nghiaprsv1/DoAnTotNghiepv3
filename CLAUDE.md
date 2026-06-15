# CLAUDE.md — Project Memory

> **File ngữ cảnh dự án dành cho AI agent. Đọc TOÀN BỘ trước khi thay đổi bất cứ gì. Đây là nguồn sự thật duy nhất.**

---

## 1. Tổng quan

| | |
|---|---|
| **Workspace** | `c:\DoAnTotNghiepv3` |
| **Tên sản phẩm** | TripMate / TravelSocial |
| **Loại** | Mạng xã hội du lịch + đặt/khám phá chuyến đi, HDV, địa điểm. Thị trường VN. |
| **Design concept** | "Saffron Horizon — The Digital Concierge". Primary `#ab2d00`, gradient `editorial-gradient`. Font: `Plus Jakarta Sans` (headline) + `Inter` (body). |
| **FE port** | 3000 (`npm run dev`) |
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
| Backend | NestJS 10 + TypeORM 0.3 + PostgreSQL 16 + Passport JWT |

---

## 3. Scripts

```bash
# Frontend (root)
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
npm run model:download  # tải model LLM local (Qwen2.5-3B GGUF) về backend/models/
```

---

## 4. Cấu trúc `src/`

```
src/
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
  constants/               # routes.ts, mock*.ts (fallback UI)
  utils/                   # cn, formatDate, string, tripStatus
```

### Pages hiện có
`Home, Login, Register, ForgotPassword, Trips, TripDetail, CreateTrip, EditTrip, Profile, EditProfile, Messages, Social, Places (PlaceDetail), Guides (GuideDetail, GuideApply, GuideDashboard), MyBookings (BookingDetail), Wallet, Notifications (NotificationDetail), UserProfile, NotFound`

Admin (layout riêng `/admin/*`): `AdminOverview, AdminUsers, AdminGuides, AdminWithdrawals, AdminRevenue, AdminNotifications, AdminPosts, AdminTrips, **AdminPlaces**`

---

## 5. Path Aliases

`@` `@components` `@pages` `@hooks` `@services` `@store` `@utils` `@types` `@assets` `@layouts` `@routes` `@constants` → đều trỏ vào `./src/...`

> ⚠️ `@types` trỏ `src/types` — **KHÔNG phải** `node_modules/@types`. Không bao giờ nhầm.

---

## 6. Routes đầy đủ (`src/constants/routes.ts`)

```
/                     HOME
/login  /register  /forgot-password   (AuthLayout)
/trips              TRIPS
/trips/create       TRIP_CREATE
/trips/:id          TRIP_DETAIL
/trips/:id/edit     TRIP_EDIT
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
/admin/trips  /admin/places          ← MỚI
```

**Helper functions:** `tripDetailPath(id)` `tripEditPath(id)` `guideDetailPath(id)` `messageThreadPath(id)` `bookingDetailPath(id)` `placeDetailPath(id)` `userProfilePath(id)` `userFollowersPath(id)` `userFollowingPath(id)` `notificationDetailPath(id)`

---

## 7. Domain Types (`src/types/`)

### User (`user.ts`)
```ts
User { id, email, name, avatar?, role: 'admin'|'user'|'moderator'|'guide', createdAt, updatedAt }
AuthTokens { accessToken, refreshToken }
UserRole = 'admin' | 'user' | 'moderator' | 'guide'
```

### Trip (`trip.ts`)
```ts
TripCategory = 'beach'|'mountain'|'food'|'culture'|'city'|'island'|'adventure'
Trip { id, title, description, destination, category: TripCategory, coverImage, gallery?,
  startDate, endDate, durationDays, priceFrom, currency, rating, maxMembers, memberCount,
  members: TripMember[], creator: TripMember, guide?: TripGuide, tags, inclusions?,
  itinerary: ItineraryDay[], isJoined?, isOwner?, status?, joinRequestStatus?,
  pendingRequests?, isSaved?, recommendScore?, recommendReasons? }
TripGuide { id, name, avatar, region, rating, reviewCount?, yearsExperience?, languages?,
  specialties?, bio?, verified? }
HireableGuide extends TripGuide { userId?, coverImage, gallery?, pricePerDay, currency,
  availability: 'available'|'busy'|'fully-booked', availabilityLabel?, toursCompleted?,
  responseTime?, highlights?, regionKeys?, categoryKeys? }
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
  address?, coverImage, gallery?, rating, reviewCount, duration?, bestTime?,
  entranceFee?, tags?, highlights?, coordinates?, isSaved? }
```

### Common (`common.ts`)
```ts
ApiResponse<T> { data: T, message, success, statusCode }
PaginatedResponse<T> { data: T[], total, page, pageSize, totalPages }
```

---

## 8. Services (`src/services/`)

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
| `authService.ts` | `/auth/login|register|refresh|logout|profile` |
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
| `aiAssistantService.ts` | `/ai/ask` (query + history + draft) + `/ai/create-trip` |

### `placeService` — admin-specific exports
```ts
placeService.listRaw(params?)      → AdminPlaceRow[]   // giữ categoryId/provinceId cho edit form
placeService.create(payload)       → Place
placeService.update(id, payload)   → Place
placeService.remove(id)            → void
interface AdminPlacePayload { name,slug,description,categoryId,provinceId,coverImage,... }
interface AdminPlaceRow { id,name,slug,categoryId?,categoryLabel,provinceId?,provinceName,... }
```

---

## 9. Hooks (`src/hooks/`)

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

## 10. Stores (`src/store/`)

| Store | Persist key | Nội dung |
|---|---|---|
| `authStore.ts` | `auth-storage` | `user, tokens, isAuthenticated` + setAuth/logout |
| `currentUserStore.ts` | `travelsocial-current-user-v2` | `id,name,email,avatar,role` + syncFromAuth/update/reset/toggleGuide |
| `aiAssistantStore.ts` | `travelsocial-ai-assistant` | `enabled,isOpen,messages` + open/close/toggle/addMessage |
| `notificationStore.ts` | — | notifications từ mock + markAsRead/unreadCount |
| `uiStore.ts` | — | theme/sidebar/loading |

> `useCurrentUserStore.isGuide(role)` → `role === 'guide' || role === 'admin'`

---

## 11. Auth flow

1. `authService.login/register` → `{ user, tokens }`
2. `useAuthStore.setAuth(user, tokens)` + `currentUserStore.syncFromAuth(user)`
3. `axiosInstance` request interceptor: gắn `Authorization: Bearer <accessToken>`
4. Response interceptor 401: POST `/auth/refresh` → `setTokens` + retry; fail → `logout()` + redirect `/login`

---

## 12. Backend modules (`backend/src/modules/`)

| Module | Key entities | Notable |
|---|---|---|
| `auth` | User | JWT access 15m + refresh 7d |
| `user` | User | follow/unfollow, TravelPreferences |
| `trip` | Trip, TripMember, TripJoinRequest, ItineraryDay, ItineraryActivity | `assertNoDateConflict` chặn tạo trip trùng ngày với trip đã join |
| `post` | Post, PostComment | feed foryou/following/trending |
| `guide` | GuideProfile, GuideBooking, Wallet, WalletTransaction | `loadStats()` + `decorateWithStats()` + `attachStatsToGuides()` (public) — tính live rating/review từ DB |
| `place` | Place, Category, Province | admin CRUD guard `@Roles(ADMIN)` |
| `saved` | SavedItem | toggle + listPosts/Trips/Guides; **listGuides gọi guidesService.attachStatsToGuides** (forwardRef circular) |
| `message` | Conversation, Message | WebSocket gateway + REST |
| `notification` | Notification | push + mark-read |
| `review` | Review | polymorphic target: place|trip|guide|member |
| `payment` | WalletTransaction | SePay webhook |
| `upload` | — | Firebase Storage khi có env, fallback local `uploads/` |
| `ai` | AiChatSession, AiChatMessage | **Pipeline 3 bước (HIỂU→LÀM→TRẢ) + RAG 63 tỉnh + multi-provider LLM (local/gemini/template)**. Xem §AI bên dưới. |
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
| `local` (mặc định) | `local-llm.provider.ts` | Self-host Qwen2.5-3B GGUF qua `node-llama-cpp`. GPU offload, queue serialize request. |
| `gemini` | `gemini.provider.ts` | Google Gemini (env `GEMINI_API_KEY`) |
| `template` | `template.provider.ts` | Fallback không cần LLM — đi thẳng luồng DB |
- Inject qua DI token `LLM_PROVIDER` (factory trong `ai.module.ts`). Interface chung: `LlmProvider { name, isReady(), complete(), generateJson() }`.
- Mọi bước có fallback → chatbot không chết khi LLM lỗi.

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

### React Router future flags
```ts
createBrowserRouter(routes, {
  future: { v7_startTransition: true, v7_relativeSplatPath: true }
})
```
→ không còn warning console về v7 upgrade.

---

## 14. Quy ước code

- **Page:** `src/pages/<Name>/<Name>Page.tsx` (named export) + `index.ts` re-export → router lazy `.then(m => ({ default: m.XPage }))`
- **Component:** `ui/` (primitive) | `common/` (layout/util) | `features/` (domain-coupled)
- **Service:** gọi axiosInstance → unwrap → adapt → return FE type. **Không mock trong service.**
- **Mock fallback pattern:**
  ```tsx
  const { data: apiItems } = useItems()
  const items = apiItems?.length ? apiItems : mockItems
  ```
- Import nội bộ: alias `@...` không dùng relative deep
- TypeScript strict: `interface` cho domain, `type` cho union/literal
- Tailwind utility + `cn()`, tránh CSS riêng

---

## 15. Gotchas

- `@types` alias → `src/types` (KHÔNG phải `node_modules/@types`)
- `axiosInstance` dùng `useAuthStore.getState()` ngoài React — đúng, không re-render
- Workspace path có tiếng Việt → quote khi dùng shell
- `currentUserStore.role` dùng để check admin guard ở FE (AdminLayout redirect nếu role ≠ 'admin')
- `placeService.listRaw()` trả `AdminPlaceRow` giữ `categoryId`/`provinceId` — dùng cho edit form. `placeService.list()` trả `Place` đã flatten, không có ids.
- Circular dep guides↔saved đã xử lý bằng forwardRef — **không thêm import trực tiếp giữa 2 module này**
- `adaptTrip`, `adaptPost`, `adaptGuide` đã được **export** từ service file → savedService import để dùng

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
`capacitor.config.ts` — appId `com.tripmate.app`, webDir `dist/`, base `./`.
Scripts: `cap:add:android` | `cap:sync` | `cap:open:android` | `android:build`

---

## 18. Backlog (việc cần tiếp tục)

1. **ProtectedRoute** — bật cho `/profile`, `/profile/edit`, `/trips/create`, `/guide/dashboard`
2. **Form validation** — react-hook-form + zod (chưa cài)
3. **Dark mode** — `darkMode: 'class'` đã bật, cần toggle UI + token
4. **Tests** — vitest cho services/hooks (chỉ có `test/setup.ts`)
5. **i18n** — UI hỗn hợp Việt/Anh
6. **Nút lưu TripDetail** — hiện chỉ có ở TripCard, chưa có trong trang chi tiết
7. **Tab "Đánh giá"** trong Profile — hiện EmptyState "đang phát triển"
