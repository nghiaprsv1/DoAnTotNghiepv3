# CLAUDE.md — Project Memory

> File ngữ cảnh dự án dành cho AI agent (Claude/Augment). Đọc file này trước khi làm bất cứ thay đổi nào để hiểu nhanh toàn bộ dự án và tiếp tục công việc đúng hướng.

## 1. Tổng quan dự án

- **Tên repo:** `Front-end-ReactJS` (thư mục: `d:\Front-end-ReactJS - Sao chép`)
- **Loại sản phẩm:** Web app **TravelSocial** — mạng xã hội du lịch + nền tảng đặt/khám phá chuyến đi (trips), guides, community posts. Tập trung vào thị trường Việt Nam.
- **Concept thiết kế:** "Saffron Horizon — The Digital Concierge" (palette cam saffron, typography editorial). Thiết kế gốc nằm trong `stitch_web_protocol_mapper/` (mockup HTML từ Stitch/Google).
- **Trạng thái:** Đang ở giai đoạn **scaffold + UI tĩnh với mock data**. Chưa kết nối backend thật, đã chuẩn bị đầy đủ axios + auth store + interceptor refresh token để cắm API sau.

## 2. Tech stack

| Layer | Công nghệ |
|---|---|
| Framework | React 18.3 + TypeScript 5.5 |
| Build tool | Vite 5.3 |
| Routing | react-router-dom 6.24 (createBrowserRouter, lazy + Suspense) |
| State (client) | Zustand 4.5 (có persist middleware cho auth) |
| State (server) | @tanstack/react-query 5.51 |
| HTTP | axios 1.7 (instance + interceptor refresh token) |
| Styling | TailwindCSS 3.4 (custom palette Material 3 tokens) + CSS thường |
| Test | Vitest 2 + Testing Library + jsdom |
| Lint/Format | ESLint 8 + Prettier 3 |

## 3. Scripts (package.json)

- `npm run dev` — Vite dev server (port 3000, auto-open, proxy `/api` → `http://localhost:8080`)
- `npm run build` — `tsc && vite build`
- `npm run type-check` — `tsc --noEmit`
- `npm run lint` / `lint:fix`
- `npm run format`
- `npm test` / `test:ui` / `test:coverage`

## 4. Cấu trúc thư mục `src/`

```
src/
  App.tsx                 # RouterProvider
  main.tsx                # ReactDOM + QueryClientProvider
  routes/index.tsx        # createBrowserRouter, lazy pages, MainLayout vs AuthLayout
  layouts/
    MainLayout/           # TopNav + Footer + BottomNav (mobile) + ErrorBoundary
    AuthLayout/           # Layout cho Login/Register
  pages/                  # Mỗi page 1 thư mục: <Name>Page.tsx + index.ts
    Home, Login, Register, ForgotPassword, Trips, TripDetail, CreateTrip,
    Profile, EditProfile, Messages, Social, Places, Guides, GuideApply, GuideDetail, GuideDashboard, MyBookings, UserProfile, Notifications, NotFound
  components/
    ui/                   # Primitives: Icon, Button, Input, Badge, Avatar
    common/               # ProtectedRoute, ErrorBoundary, TopNav, BottomNav, Footer
    features/             # TripCard, GuideCard, PostCard, FilterBar
  services/
    axiosInstance.ts      # baseURL từ VITE_API_BASE_URL, interceptor refresh /auth/refresh
    authService.ts        # login/register/logout/refreshToken/getProfile
  store/
    authStore.ts          # Zustand persist (localStorage key 'auth-storage')
    uiStore.ts
  hooks/                  # useAuth, useDebounce, useDisclosure
  types/                  # common, user, trip, post (TypeScript interfaces domain)
  constants/              # app.ts, routes.ts (ROUTES + helpers), mockData.ts
  utils/                  # cn (clsx+tailwind-merge), formatDate, string
  styles/                 # index.css (Tailwind base) + components.css
  test/setup.ts           # Vitest setup (jest-dom)
```

## 5. Path aliases (vite.config.ts + tsconfig)

`@`, `@components`, `@pages`, `@hooks`, `@services`, `@store`, `@utils`, `@types`, `@assets`, `@layouts`, `@routes`, `@constants` → `./src/...`

## 6. Routing (src/constants/routes.ts)

- Public (MainLayout): `/`, `/trips`, `/trips/create`, `/trips/:id`, `/profile`, `/profile/edit`, `/messages`, `/messages/:id`, `/social`, `/guides`, `/guides/:id`
- Auth (AuthLayout): `/login`, `/register`
- Khác: `/trips/:id/joined`, `/dashboard`, `/settings`, `*` (NotFound)
- Helpers: `tripDetailPath(id)`, `tripJoinedPath(id)`, `messageThreadPath(id)`, `guideDetailPath(id)`
- `ProtectedRoute` đã có sẵn nhưng **chưa được áp vào router** — cần wrap khi bật auth thật.

## 7. Domain models chính (src/types)

- **User** `{ id, email, name, avatar?, role: 'admin'|'user'|'moderator', createdAt, updatedAt }`, `AuthTokens { accessToken, refreshToken }`, `LoginCredentials`, `RegisterCredentials`.
- **Trip** `{ id, title, description, destination, category, coverImage, gallery?, startDate, endDate, durationDays, priceFrom, currency, rating, maxMembers, memberCount, members: TripMember[], creator, guide?: TripGuide, tags, itinerary: ItineraryDay[], isJoined?, isSaved? }`. Category: `beach|mountain|food|culture|city|island|adventure`.
- **TripGuide** (hướng dẫn viên gắn với trip — khác với regular member): `{ id, name, avatar, region, rating, reviewCount?, yearsExperience?, languages?, specialties?, bio?, verified? }`.
- **TripsPage** chia 2 tab: "Đang tham gia" (`isJoined`) và "Khám phá" (chưa tham gia, có FilterBar category). TripCard có badge "Đã tham gia" ở góc trên trái.
- **TripDetailPage** đổi sidebar theo trạng thái: chưa tham gia → `JoinPanel` (có nút Tham gia ngay, disabled khi đầy); đã tham gia → `JoinedPanel` (nút Mở nhóm chat + Rời chuyến). Có thêm `TripGuidePanel` (chỉ render khi `trip.guide` tồn tại) và `MembersPanel` (capacity bar + creator + members). State joined/leaved local trong page (chưa cắm API).
- **Post** (community feed) + **Guide** (local guide profile) trong `post.ts`. `Post` enriched cho social feed: `gallery?`, `body?`, `tags?`, `shares?`, `topComments?: PostComment[]`, `authorVerified?`. `Story` cho story bar.
- **SocialPage** (`/social`): feed mạng xã hội du lịch, layout 3 cột (left rail + center feed + right rail). Tính năng: story bar, post composer (mở rộng inline với attachment ảnh + tools), tabs feed (Dành cho bạn / Đang theo dõi / Thịnh hành), feed card (gallery carousel, like/comment/share/bookmark, expand body, tags clickable, reactions summary), comment section inline, share menu popup. Mock data ở `constants/mockFeed.ts` (`mockFeedPosts`, `mockStories`).
- **Messaging** (`message.ts`): `ChatUser`, `ChatMessage` (status: sending|sent|delivered|read, attachment?), `Conversation` (peer 1:1, lastMessage, unreadCount, pinned, typing). Mock data ở `constants/mockMessages.ts` (`mockConversations`, `mockMessagesByConversation`, `CURRENT_USER_ID = 'me'`).

## 8. Auth flow (đã chuẩn bị, chưa hoạt động cuối)

1. `authService.login/register` POST `/auth/login` | `/auth/register` → `{ user, tokens }`.
2. Lưu vào `useAuthStore` (persist localStorage `auth-storage`).
3. `axiosInstance` request interceptor gắn `Authorization: Bearer <accessToken>`.
4. Response interceptor: 401 → POST `/auth/refresh` với `refreshToken` → `setTokens` rồi retry; fail → `logout()` + redirect `/login`.

## 9. Theming / Design system

- Tailwind custom palette **Saffron Horizon** (Material 3 tokens: primary, secondary, tertiary, surface-container-*, on-*, outline...). Primary `#ab2d00`, gradient `editorial-gradient`.
- Fonts: `Plus Jakarta Sans` (headline), `Inter` (body/label).
- Box shadow `editorial`, `editorial-lg`. Border radius mở rộng tới `3xl: 2.5rem`.
- `darkMode: 'class'` (chưa triển khai dark UI).
- Dùng `cn()` (clsx + tailwind-merge) cho compose classes.

## 10. Mock data & trạng thái UI hiện tại

- `src/constants/mockData.ts` cấp `mockGuides`, `mockPosts`, ... cho HomePage, TripsPage hiển thị.
- Các page hiện render UI tĩnh dựa trên mock; **chưa gọi API** (trừ scaffolding `authService`).
- React Query đã setup ở `main.tsx` (staleTime 5 phút, retry 1, không refetch on focus) — sẵn sàng cho data fetching.

## 11. Quy ước code

- Mỗi page/component đặt trong **thư mục riêng** + `index.ts` re-export. Page export **named** (vd `HomePage`), router lazy-load qua `.then(m => ({ default: m.HomePage }))`.
- Import nội bộ ưu tiên alias `@...` thay vì relative deep.
- TypeScript strict; dùng `interface` cho domain, `type` cho union/literal.
- Tailwind utility-first; class composition qua `cn()`. Hạn chế CSS riêng, đặt ở `styles/components.css` nếu cần.
- ESLint cấm warning (`--max-warnings 0`).

## 12. Backlog / việc cần tiếp tục (ưu tiên gợi ý)

1. **Cắm API thật**: tạo `tripService`, `postService`, `userService` theo mẫu `authService`; thay mock bằng React Query hooks (`useTrips`, `useTrip(id)`, ...).
2. **Bật ProtectedRoute** cho `/profile`, `/profile/edit`, `/trips/create`.
3. **Form validation** cho Login/Register/CreateTrip/EditProfile (đề xuất: react-hook-form + zod — chưa cài).
4. **Dark mode** (Tailwind `darkMode: 'class'` đã bật, cần toggle + tokens).
5. **Tests**: hiện chưa có test file thực tế trong `src/` (chỉ `test/setup.ts`). Viết test cho services/hooks/components.
6. **i18n VN/EN** (UI hỗn hợp Việt-Anh).
7. **CI/CD, env**: `.env.development` / `.env.production` đã có, kiểm tra `VITE_API_BASE_URL`, `VITE_APP_TITLE`, `VITE_APP_ENV`.

## 13. Gotchas / lưu ý cho agent

- Đường dẫn workspace có **dấu cách + tiếng Việt** (`Sao chép`) → cần quote khi chạy lệnh shell.
- `import type ... from '@types/user'` — alias `@types` trỏ tới `src/types`, **không phải** `node_modules/@types`. Đừng nhầm.
- `axiosInstance` dùng `useAuthStore.getState()` (gọi ngoài React) — không gây re-render, đúng pattern Zustand.
- Khi thêm page mới: tạo `src/pages/<Name>/<Name>Page.tsx` (named export) + `index.ts` re-export, thêm route vào `src/routes/index.tsx` và path constant vào `src/constants/routes.ts`.
- Khi thêm component dùng chung: đặt vào `ui/` (primitive), `common/` (layout/util), hoặc `features/` (gắn domain), nhớ thêm vào `index.ts` của thư mục đó.
- Không có AGENTS.md riêng; CLAUDE.md này là nguồn ngữ cảnh chính.

## 14. Cập nhật file này khi nào

Sau mỗi thay đổi đáng kể: thêm page/route mới, đổi domain types, cắm API mới, thay đổi auth flow, đổi design tokens lớn, hoặc hoàn thành một mục trong Backlog. Giữ phần "Trạng thái" và "Backlog" đồng bộ với thực tế.
