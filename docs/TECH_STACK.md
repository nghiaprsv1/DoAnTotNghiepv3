# TECH_STACK — TripMate / TravelSocial

> Tài liệu chi tiết **từng công nghệ** sử dụng trong hệ thống: nó là gì, vì sao chọn, và được dùng cụ thể ở đâu trong dự án.
>
> Hệ thống gồm 3 phần: **Frontend** (web + đóng gói Android), **Backend** (REST API + WebSocket), và **AI Assistant** (trợ lý du lịch). Ngăn xếp chính: React + TypeScript + Vite (FE) ↔ NestJS + TypeORM + PostgreSQL (BE) + LLM tự host.

---

## Mục lục

1. [Ngôn ngữ & nền tảng chung](#1-ngôn-ngữ--nền-tảng-chung)
2. [Frontend](#2-frontend)
3. [Backend](#3-backend)
4. [Cơ sở dữ liệu & ORM](#4-cơ-sở-dữ-liệu--orm)
5. [Xác thực & bảo mật](#5-xác-thực--bảo-mật)
6. [Realtime (WebSocket)](#6-realtime-websocket)
7. [AI Travel Assistant](#7-ai-travel-assistant)
8. [Lưu trữ ảnh, Email, Thanh toán](#8-lưu-trữ-ảnh-email-thanh-toán)
9. [Mobile (Capacitor)](#9-mobile-capacitor)
10. [Kiểm thử, lint, tooling](#10-kiểm-thử-lint-tooling)
11. [Triển khai (Deploy)](#11-triển-khai-deploy)
12. [Bảng tổng hợp phiên bản](#12-bảng-tổng-hợp-phiên-bản)

---

## 1. Ngôn ngữ & nền tảng chung

### TypeScript (FE 5.5 · BE 5.9)
- **Là gì:** Ngôn ngữ mở rộng JavaScript bằng kiểu tĩnh, biên dịch ra JS thuần.
- **Vì sao dùng:** Bắt lỗi ngay khi viết code (sai kiểu dữ liệu, thiếu field), gợi ý tự động tốt, an toàn khi refactor — quan trọng với dự án lớn nhiều module.
- **Dùng ở đâu:** Toàn bộ dự án. FE bật `strict`; domain dùng `interface`, union/literal dùng `type`. BE dùng decorator + metadata (cần `reflect-metadata`).

### Node.js
- **Là gì:** Môi trường chạy JavaScript phía server.
- **Dùng ở đâu:** Chạy cả backend NestJS lẫn công cụ build FE (Vite). Backend nhắm runtime Node 22 (`@types/node` 22).

---

## 2. Frontend

### React 18.3
- **Là gì:** Thư viện xây giao diện theo component, render khai báo.
- **Vì sao dùng:** Hệ sinh thái lớn, tái sử dụng component, cộng đồng mạnh.
- **Dùng ở đâu:** Toàn bộ UI. Tổ chức 3 lớp component: `ui/` (primitive: Button, Input, Avatar…), `common/` (layout/tiện ích: TopNav, ImageUpload…), `features/` (gắn domain: TripCard, GuideCard…). Dùng lazy + `Suspense` để chia nhỏ bundle.

### Vite 5.3
- **Là gì:** Công cụ build & dev-server thế hệ mới (dùng ESBuild + Rollup).
- **Vì sao dùng:** Khởi động dev cực nhanh, HMR (hot reload) tức thì, cấu hình gọn hơn Webpack.
- **Dùng ở đâu:** `npm run dev` (dev :3000), `npm run build` (production). Cấu hình path alias `@components`, `@services`, `@types`… trong `vite.config.ts`.

### react-router-dom 6.24
- **Là gì:** Thư viện định tuyến cho React.
- **Vì sao dùng:** Điều hướng SPA, chia layout, route động.
- **Dùng ở đâu:** `src/routes/index.tsx` dùng `createBrowserRouter` với 3 nhóm layout (`MainLayout`, `AuthLayout`, `AdminLayout`), lazy-load mỗi page. Đã bật future flags `v7_startTransition` + `v7_relativeSplatPath` để tắt cảnh báo nâng cấp v7.

### Zustand 4.5 (state phía client)
- **Là gì:** Thư viện quản lý state nhẹ, không boilerplate như Redux.
- **Vì sao dùng:** API đơn giản, hỗ trợ `persist` (lưu localStorage), đọc state ngoài React (`getState()`) — tiện cho axios interceptor.
- **Dùng ở đâu:** `authStore` (user + token, persist), `currentUserStore`, `aiAssistantStore` (lịch sử chat AI, persist), `notificationStore`, `uiStore`.

### @tanstack/react-query 5.51 (state phía server)
- **Là gì:** Thư viện quản lý dữ liệu lấy từ server (caching, refetch, invalidate).
- **Vì sao dùng:** Tự cache, tự đồng bộ, giảm code fetch thủ công; tách bạch state-server khỏi state-client.
- **Dùng ở đâu:** Mỗi domain 1 file hook (`useTrips`, `usePosts`, `useGuides`, `useMessages`…). Cấu hình `staleTime 5m`, `retry 1`, `refetchOnWindowFocus false`. Dùng `invalidateQueries` để làm mới sau mutation (vd xoá tin nhắn, gửi bài).

### axios 1.7
- **Là gì:** HTTP client cho trình duyệt/Node.
- **Vì sao dùng:** Interceptor mạnh, dễ gắn token tự động.
- **Dùng ở đâu:** `axiosInstance` với request interceptor gắn `Authorization: Bearer`, response interceptor bắt 401 → gọi `/auth/refresh` → retry; thất bại thì `logout()` + redirect `/login`. Mỗi service unwrap `ApiResponse<T>` rồi `adapt` BE → FE shape.

### TailwindCSS 3.4 + clsx + tailwind-merge
- **Là gì:** Framework CSS theo utility-class; `clsx` ghép class có điều kiện; `tailwind-merge` gộp/khử trùng class Tailwind.
- **Vì sao dùng:** Style nhanh ngay trong JSX, nhất quán, tránh CSS rời rạc.
- **Dùng ở đâu:** Toàn bộ UI. Palette tùy biến theo Material 3 + concept "Saffron Horizon" (primary `#ab2d00`). Hàm tiện ích `cn()` = `twMerge(clsx(...))`.

### Leaflet 1.9 + react-leaflet 4.2
- **Là gì:** Thư viện bản đồ tương tác mã nguồn mở + binding React.
- **Vì sao dùng:** Miễn phí, không cần API key như Google Maps.
- **Dùng ở đâu:** Hiển thị vị trí điểm đến / điểm xuất phát của chuyến đi trên trang chi tiết (toạ độ lưu sẵn trong Trip để không phải geocode lại).

### socket.io-client 4.8
- **Là gì:** Client kết nối WebSocket tới server Socket.IO.
- **Dùng ở đâu:** `chatSocket.ts` — kết nối namespace `/chat`, gửi/nhận realtime: `send_message`, `typing`, `mark_as_read`, `message_deleted`, `conversation_deleted`. Tự suy ra origin từ `VITE_API_BASE_URL`.

---

## 3. Backend

### NestJS 10.4
- **Là gì:** Framework Node.js có cấu trúc (module, controller, service, DI), lấy cảm hứng từ Angular.
- **Vì sao dùng:** Tổ chức code rõ ràng theo domain, dependency injection sẵn, hỗ trợ guard/interceptor/filter toàn cục, tích hợp tốt TypeORM + Swagger + WebSocket.
- **Dùng ở đâu:** Toàn bộ API. 15 module domain (`auth, user, trip, post, guide, place, saved, message, notification, review, payment, upload, ai, admin, mail`). Cơ chế chung:
  - `ResponseInterceptor` — bọc mọi response thành `ApiResponse<T>` (`{data, message, success, statusCode}`).
  - `GlobalExceptionFilter` — chuẩn hoá lỗi, giữ field phụ (vd `code`, `email`).
  - `JwtAuthGuard` global — chặn mặc định, mở bằng `@Public()`.
  - `RolesGuard` + `@Roles(UserRole.ADMIN)` — phân quyền admin.

### @nestjs/config + dotenv 16
- **Là gì:** Module đọc biến môi trường (`.env`).
- **Dùng ở đâu:** `ConfigModule.forRoot({ isGlobal: true })` — đọc cấu hình DB, JWT secret, SMTP, SePay, Firebase, LLM provider…

### @nestjs/schedule 6.1
- **Là gì:** Module lập lịch cron job trong Nest.
- **Dùng ở đâu:** Đăng ký `ScheduleModule.forRoot()` cho các tác vụ định kỳ (vd dọn token hết hạn).

### @nestjs/swagger 7.4
- **Là gì:** Tự sinh tài liệu API chuẩn OpenAPI.
- **Dùng ở đâu:** UI Swagger tại `http://localhost:8080/docs` — test endpoint trực tiếp khi phát triển.

### RxJS 7.8
- **Là gì:** Thư viện lập trình reactive (Observable).
- **Dùng ở đâu:** Là nền tảng nội bộ của Nest — interceptor (`ResponseInterceptor`) map luồng response qua RxJS operator.

### class-validator 0.14 + class-transformer 0.5
- **Là gì:** Validate & biến đổi dữ liệu request dựa trên decorator trên DTO.
- **Vì sao dùng:** Kiểm tra đầu vào khai báo gọn (`@IsEmail()`, `@IsString()`, `@Min()`…), tự loại field lạ.
- **Dùng ở đâu:** Mọi DTO (`RegisterDto`, `GuideApplyDto`, `VerifyEmailDto`…). `ValidationPipe` global bật `whitelist: true` (loại field không khai báo) + `transform: true`.

---

## 4. Cơ sở dữ liệu & ORM

### PostgreSQL 16 (driver `pg` 8.13)
- **Là gì:** Hệ quản trị CSDL quan hệ mã nguồn mở mạnh mẽ.
- **Vì sao dùng:** Hỗ trợ kiểu nâng cao (mảng `text[]`, `jsonb`, `enum`, `uuid`), ràng buộc khoá ngoại, transaction — phù hợp dữ liệu quan hệ phức tạp (trip ↔ member ↔ itinerary…).
- **Dùng ở đâu:** 32 bảng (users, trips, guide_profiles, conversations, wallets…). Dùng `uuid` làm khoá chính, `jsonb` cho preferences/inclusions, `text[]` cho tags/gallery/certificate_images.

### TypeORM 0.3
- **Là gì:** ORM cho TypeScript — ánh xạ class ↔ bảng bằng decorator.
- **Vì sao dùng:** Viết entity bằng TS, quan hệ khai báo (`@OneToMany`, `@ManyToOne`), QueryBuilder linh hoạt, hỗ trợ migration.
- **Dùng ở đâu:** Mọi entity (`@Entity`). Quan hệ vd Trip ↔ TripMember ↔ ItineraryDay ↔ ItineraryActivity. Dùng `select: false` ẩn dữ liệu nhạy cảm (passwordHash, idCardImage, certificateImages) — chỉ pull khi cần qua `addSelect`. `DB_SYNCHRONIZE=true` (dev tự đồng bộ schema) + hỗ trợ migration (`migration:generate/run/revert`).

---

## 5. Xác thực & bảo mật

### Passport 0.7 + passport-jwt + passport-local
- **Là gì:** Middleware xác thực chuẩn cho Node, theo "strategy".
- **Dùng ở đâu:** `JwtStrategy` xác minh access token mỗi request; tích hợp qua `@nestjs/passport`.

### @nestjs/jwt 10.2
- **Là gì:** Module ký & xác minh JSON Web Token.
- **Dùng ở đâu:** Cấp **access token** (15 phút) + **refresh token** (7 ngày). Refresh token được hash (sha256) lưu bảng `refresh_tokens` (whitelist, hỗ trợ rotation + logout-all).

### bcrypt 5.1
- **Là gì:** Thuật toán băm mật khẩu có salt.
- **Vì sao dùng:** Lưu mật khẩu an toàn, không thể đảo ngược.
- **Dùng ở đâu:** `auth.service` băm mật khẩu khi đăng ký/đổi mật khẩu (`BCRYPT_SALT_ROUNDS`), so khớp khi đăng nhập.

### Xác thực email bằng OTP
- **Là gì:** Quy trình bắt buộc xác minh email khi đăng ký.
- **Dùng ở đâu:** Đăng ký tạo user `emailVerified=false`, sinh OTP 6 số (hash sha256, hạn 15 phút, tối đa 5 lần thử, gửi lại cooldown 60s) lưu bảng `email_verifications`, gửi qua Nodemailer. Chỉ cấp token khi xác thực thành công; đăng nhập bị chặn nếu chưa xác thực (`code: EMAIL_NOT_VERIFIED`).

---

## 6. Realtime (WebSocket)

### socket.io 4.8 + @nestjs/websockets + @nestjs/platform-socket.io
- **Là gì:** Thư viện giao tiếp realtime hai chiều (WebSocket + fallback polling), tích hợp Nest qua gateway.
- **Vì sao dùng:** Chat cần đẩy tin nhắn tức thời, hiển thị "đang gõ", đã đọc, xoá tin realtime.
- **Dùng ở đâu:** `MessagesGateway` (namespace `/chat`):
  - Xác thực JWT khi kết nối, tự join mọi phòng user thuộc về.
  - Sự kiện: `send_message`, `join_room`, `typing`/`stop_typing`, `mark_as_read`, `message_deleted`, `conversation_deleted`.
  - Broadcast tới phòng để mọi thiết bị/tab đồng bộ.

---

## 7. AI Travel Assistant

### node-llama-cpp 3.18 (LLM tự host — mặc định)
- **Là gì:** Binding Node cho `llama.cpp`, chạy mô hình ngôn ngữ local định dạng GGUF.
- **Vì sao dùng:** Chạy AI offline, không tốn phí API, kiểm soát dữ liệu; tận dụng GPU.
- **Dùng ở đâu:** `LocalLlmProvider` nạp **Qwen2.5-3B Instruct** (GGUF, GPU offload, queue serialize request). Tải model bằng `npm run model:download`. Cấu hình `LLM_MODEL_FILE`, `LLM_GPU_LAYERS`, `LLM_MAX_TOKENS`.

### Google Gemini (LLM cloud — tùy chọn)
- **Là gì:** Mô hình ngôn ngữ của Google qua API.
- **Dùng ở đâu:** `GeminiProvider` — bật khi `LLM_PROVIDER=gemini` + `GEMINI_API_KEY`. Phương án thay thế khi không chạy model local.

### Kiến trúc AI (pipeline 3 bước + RAG)
- **Provider pattern:** Inject qua DI token `LLM_PROVIDER` (factory trong `ai.module.ts`), interface chung `LlmProvider { isReady, complete, generateJson }`. 3 provider: `local` / `gemini` / `template` (fallback không cần LLM).
- **Pipeline:** **HIỂU** (LLM parse câu user → `ParsedTask`) → **LÀM VIỆC** (code thuần query DB tìm trip/place/tỉnh thật) → **TRẢ VỀ** (LLM viết câu trả lời chỉ từ dữ liệu thật).
- **RAG:** Kho kiến thức 63 tỉnh (`provinces-kb.ts`) seed vào bảng `provinces` — LLM chỉ được dùng địa danh/đặc sản có thật, cấm bịa.
- **Tạo chuyến qua hội thoại:** Bot phân loại `edit_place`/`finalize`, parser tiếng Việt đọc "2 triệu rưỡi", "ngày 20 tháng 12"… rồi materialize thành Trip thật.
- Lưu lịch sử ở `ai_chat_sessions` + `ai_chat_messages`.

---

## 8. Lưu trữ ảnh, Email, Thanh toán

### Firebase Admin 14 (Firebase Storage) + Multer
- **Là gì:** SDK quản trị Firebase; **Multer** xử lý upload file multipart.
- **Vì sao dùng:** Lưu ảnh lên cloud bền vững; fallback local khi chưa cấu hình.
- **Dùng ở đâu:** Module `upload` — khi có `FIREBASE_STORAGE_BUCKET` + credential thì đẩy lên bucket, ngược lại lưu local `uploads/`. Dùng cho avatar, ảnh bài viết, ảnh CCCD, ảnh chứng chỉ HDV, ảnh thông báo admin.

### Nodemailer 6.10
- **Là gì:** Thư viện gửi email qua SMTP cho Node.
- **Vì sao dùng:** Gửi mã OTP xác thực email khi đăng ký.
- **Dùng ở đâu:** `MailModule` (global) + `MailService` — đọc `SMTP_*` (vd Gmail App Password), gửi email HTML chứa OTP 6 số. Nếu chưa cấu hình SMTP → in mã ra console (chế độ dev) để vẫn test được.

### SePay (cổng thanh toán / nạp ví)
- **Là gì:** Dịch vụ trung gian thanh toán qua chuyển khoản ngân hàng VN (sinh QR + webhook).
- **Dùng ở đâu:** `POST /payments/sepay/intent` tạo `WalletTransaction` PENDING + QR; `POST /payments/sepay/webhook` (header `Authorization: Apikey`) xác nhận → cộng ví. FE: `paymentService` + `SepayTopUpModal`.

---

## 9. Mobile (Capacitor)

### Capacitor 8.4 (`@capacitor/core`, `/android`, `/cli`)
- **Là gì:** Runtime đóng gói ứng dụng web thành app native (Android/iOS), cho phép gọi API thiết bị.
- **Vì sao dùng:** Tái sử dụng toàn bộ code React để ra app Android, không phải viết lại native.
- **Dùng ở đâu:** `capacitor.config.ts` — appId `com.tripmate.app`, webDir `dist/`. Scripts: `cap:sync`, `cap:open:android`, `android:apk` (build APK qua Gradle), `android:install` (adb).

---

## 10. Kiểm thử, lint, tooling

### Vitest 2.0 + @testing-library/react + jest-dom
- **Là gì:** Framework test nhanh cho Vite; thư viện test component React; matcher cho DOM.
- **Dùng ở đâu:** Hạ tầng test FE (`test/setup.ts`). Scripts `test`, `test:ui`, `test:coverage` (coverage v8).

### ESLint 8 + Prettier 3 (+ typescript-eslint)
- **Là gì:** Linter bắt lỗi/chuẩn code; formatter định dạng code tự động.
- **Dùng ở đâu:** Cả FE và BE. FE thêm `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. BE dùng `eslint-config-prettier` + `eslint-plugin-prettier`. Scripts `lint`, `lint:fix`, `format`.

### ts-node + tsconfig-paths
- **Là gì:** Chạy file TypeScript trực tiếp không cần build; resolve path alias khi chạy.
- **Dùng ở đâu:** Các script seed dữ liệu (`seed`, `seed:trips`, `seed:guides`, `seed:provinces`, `seed:ai-trips`).

### concurrently
- **Là gì:** Chạy nhiều lệnh song song trong 1 terminal.
- **Dùng ở đâu:** Tiện chạy đồng thời nhiều tiến trình khi phát triển.

### PostCSS + Autoprefixer
- **Là gì:** Bộ xử lý CSS; tự thêm vendor prefix.
- **Dùng ở đâu:** Pipeline build Tailwind (`postcss.config.js`).

---

## 11. Triển khai (Deploy)

| Thành phần | Nền tảng | File cấu hình |
|---|---|---|
| Frontend (web) | **Vercel** | `vercel.json` |
| Backend (API) | **Render** | `render.yaml` |
| Mobile | **APK Android** qua Capacitor + Gradle | `capacitor.config.ts`, `android/` |
| Build FE theo LAN | `npm run build --mode lan` (đổi `VITE_API_BASE_URL`) | — |

---

## 12. Bảng tổng hợp phiên bản

### Frontend
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| TypeScript | 5.5 | Ngôn ngữ |
| React | 18.3 | UI framework |
| Vite | 5.3 | Build / dev server |
| react-router-dom | 6.24 | Routing |
| Zustand | 4.5 | State client (persist) |
| @tanstack/react-query | 5.51 | State server / cache |
| axios | 1.7 | HTTP client |
| TailwindCSS | 3.4 | Styling |
| clsx / tailwind-merge | 2.1 / 2.4 | Ghép class |
| Leaflet / react-leaflet | 1.9 / 4.2 | Bản đồ |
| socket.io-client | 4.8 | Realtime client |
| Capacitor | 8.4 | Đóng gói Android |
| Vitest | 2.0 | Test |

### Backend
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| TypeScript | 5.9 | Ngôn ngữ |
| NestJS | 10.4 | Framework API |
| TypeORM | 0.3 | ORM |
| PostgreSQL (pg) | 16 / 8.13 | CSDL |
| @nestjs/jwt | 10.2 | JWT |
| passport / passport-jwt | 0.7 / 4.0 | Xác thực |
| bcrypt | 5.1 | Băm mật khẩu |
| class-validator / transformer | 0.14 / 0.5 | Validate DTO |
| socket.io | 4.8 | Realtime server |
| @nestjs/swagger | 7.4 | API docs |
| @nestjs/schedule | 6.1 | Cron job |
| node-llama-cpp | 3.18 | LLM tự host |
| firebase-admin | 14 | Lưu ảnh cloud |
| nodemailer | 6.10 | Gửi email OTP |
| rxjs | 7.8 | Reactive (nội bộ Nest) |

---

> **Ngăn xếp tóm tắt:** React 18 + TypeScript + Vite + Tailwind + Zustand + React Query (FE) ↔ NestJS 10 + TypeORM + PostgreSQL + JWT + Socket.IO (BE), kèm AI tự host **Qwen2.5-3B + RAG 63 tỉnh**, lưu ảnh **Firebase**, email **Nodemailer**, thanh toán **SePay**, đóng gói mobile **Capacitor**.




