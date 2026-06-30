# Test ứng dụng Android TripMate bằng Android Studio

> Hướng dẫn cài đặt môi trường và chạy thử app **TripMate** (đóng gói từ web React bằng **Capacitor**) trên Android Studio — emulator hoặc điện thoại thật.

---

## 0. App Android của TripMate hoạt động thế nào?

TripMate **không phải native app** — nó là bản web React (`frontend/`) được **Capacitor** bọc vào một vỏ Android:

```
frontend/src  ──(vite build)──►  frontend/dist  ──(cap sync)──►  frontend/android  ──(Android Studio / Gradle)──►  app-debug.apk
   (React)                         (HTML/CSS/JS)                   (project Gradle)                                  (APK cài lên máy)
```

- `appId`: `com.tripmate.app` · `appName`: `TripMate` · `webDir`: `dist/` (xem `frontend/capacitor.config.ts`).
- Web build dùng `base: './'` (đường dẫn tương đối) nên chạy được trong WebView `capacitor://`.
- **APK tự chứa toàn bộ JS/CSS** — chỉ gọi ra ngoài để lấy **API backend**. Vì vậy phần quan trọng nhất khi test là **trỏ đúng địa chỉ API** (xem §5).
- Thư mục `frontend/android/` **đã được tạo sẵn** (`cap add android` đã chạy). Không cần tạo lại.

---

## 1. Yêu cầu cài đặt

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| **Node.js** | ≥ 18 | đã dùng cho `frontend/` rồi |
| **JDK** | **17** | Capacitor 8 + AGP cần JDK 17. Android Studio có sẵn JDK đi kèm (JBR) nên thường không cần cài tay |
| **Android Studio** | Ladybug / Koala trở lên | kèm Android SDK + emulator |
| **Android SDK** | API 34 (Android 14) | cài qua SDK Manager |

App là `frontend/` — mọi lệnh trong tài liệu này chạy trong thư mục `frontend/` (trừ khi nói rõ khác).

<!-- PLACEHOLDER -->

---

## 2. Cài Android Studio

1. Tải tại **https://developer.android.com/studio** → chạy installer (chọn cả *Android Virtual Device*).
2. Mở Android Studio → wizard **Setup** đầu tiên chọn **Standard** → để nó tải về: Android SDK, SDK Platform mới nhất, **Android Emulator**.
3. Mở **SDK Manager** (icon hình hộp, hoặc *More Actions → SDK Manager*):
   - Tab **SDK Platforms**: tick **Android 14.0 (API 34)** (hoặc cao hơn).
   - Tab **SDK Tools**: tick **Android SDK Build-Tools**, **Android SDK Platform-Tools** (chứa `adb`), **Android Emulator**, **Android SDK Command-line Tools**.
   - Apply → chờ tải xong.

### Đặt biến môi trường (để chạy `adb`, `cap`, Gradle ngoài terminal)

SDK thường nằm ở `C:\Users\<bạn>\AppData\Local\Android\Sdk`. Thêm vào **PATH** (System Properties → Environment Variables), tạo biến `ANDROID_HOME` và bổ sung PATH:

```
ANDROID_HOME = C:\Users\<bạn>\AppData\Local\Android\Sdk
PATH += %ANDROID_HOME%\platform-tools
PATH += %ANDROID_HOME%\emulator
```

Mở **PowerShell mới** rồi kiểm tra:

```powershell
adb version       # phải in ra "Android Debug Bridge version ..."
```

> Nếu `adb` không nhận: kiểm tra lại đường dẫn `platform-tools` và mở lại terminal.

---

## 3. Tạo máy ảo (Emulator)

1. Android Studio → **Device Manager** (icon điện thoại) → **Create Device**.
2. Chọn **Pixel 6** (hoặc Pixel bất kỳ) → **Next**.
3. Chọn system image **API 34** (tải về nếu chưa có) → **Next** → **Finish**.
4. Bấm ▶ để khởi động emulator. Để mở sẵn trước khi cài app cho nhanh.

> Máy yếu có thể dùng **LDPlayer / BlueStacks** thay emulator (cùng dùng `10.0.2.2` để gọi host — xem §5). Nhưng emulator của Android Studio là chuẩn nhất để debug.

---

## 4. Mở project Android trong Android Studio

### Cách A — một lệnh (build web + sync + mở Studio)

```powershell
cd C:\DoAnTotNghiepv3\frontend
npm run android:build
```

`android:build` = `vite build && cap sync android && cap open android` (xem `package.json`). Nó build web, đẩy `dist/` vào project Android, rồi mở Android Studio.

### Cách B — từng bước (hiểu rõ từng giai đoạn)

```powershell
cd C:\DoAnTotNghiepv3\frontend
npm run build          # 1. build web React → dist/
npm run cap:sync       # 2. copy dist/ + plugin vào android/  (= vite build && cap sync android)
npm run cap:open:android   # 3. mở project android/ trong Android Studio
```

Khi Android Studio mở project `frontend/android`, chờ nó **Gradle Sync** xong (thanh tiến trình dưới đáy). Lần đầu tải Gradle + dependency khá lâu (vài phút).

> ⚠️ **Quan trọng:** mỗi lần sửa code React phải chạy lại `npm run cap:sync` (hoặc `android:build`) để bản web mới được đẩy vào app. Mở Studio không tự build lại web.

<!-- PLACEHOLDER2 -->

---

## 5. ⭐ Kết nối API backend (phần dễ sai nhất)

App chạy trong emulator/điện thoại **không hiểu `localhost`** — vì `localhost` ở đó là chính cái máy ảo, không phải máy tính chạy backend. Địa chỉ API được nhúng vào APK **lúc `vite build`** qua biến `VITE_API_BASE_URL`.

Backend đã được cấu hình sẵn để hỗ trợ việc này: `backend/src/main.ts` listen trên `0.0.0.0` (truy cập được từ máy khác) và bật CORS mở mặc định.

Chọn đúng địa chỉ theo môi trường test:

| Test trên | `VITE_API_BASE_URL` | Vì sao |
|---|---|---|
| **Emulator Android Studio** | `http://10.0.2.2:8080/api` | `10.0.2.2` là IP "ma thuật" trong emulator trỏ về `localhost` của máy host |
| **LDPlayer / BlueStacks** | `http://10.0.2.2:8080/api` | tương tự emulator |
| **Điện thoại thật (cùng Wi-Fi)** | `http://<IP-LAN-máy-bạn>:8080/api` | ví dụ `http://192.168.88.120:8080/api`. Lấy IP bằng `ipconfig` (dòng IPv4 của Wi-Fi) |
| **Backend đã deploy** | `https://<service>.onrender.com/api` | dùng server thật, không cần chạy BE local |

File `frontend/.env.production` **đã set sẵn `10.0.2.2`** (mặc định cho emulator) — chính là env mà `vite build` dùng. Nếu test bằng điện thoại thật, sửa dòng đó:

```bash
# frontend/.env.production
VITE_API_BASE_URL=http://192.168.88.120:8080/api   # đổi thành IP LAN máy bạn
```

### Quy trình chạy đủ (backend + app)

```powershell
# Terminal 1 — chạy backend (luôn cần, trừ khi dùng server đã deploy)
cd C:\DoAnTotNghiepv3\backend
npm run start:dev        # API tại :8080

# Terminal 2 — build app với địa chỉ API đúng rồi mở Studio
cd C:\DoAnTotNghiepv3\frontend
# (sửa .env.production nếu dùng điện thoại thật)
npm run android:build
```

> Sau khi đổi `.env.production` **phải build lại** (`npm run android:build` hoặc `npm run cap:sync`) — địa chỉ API chỉ được nhúng lúc build, không đổi được sau khi đã đóng gói.

### Điện thoại thật — checklist thêm

- Máy tính và điện thoại **cùng một mạng Wi-Fi**.
- Tắt/cấu hình **Windows Firewall** cho port 8080 (lần đầu Windows thường hỏi → chọn *Allow* cho mạng Private).
- Thử mở `http://<IP-LAN>:8080/docs` bằng trình duyệt **trên điện thoại** → thấy Swagger là kết nối OK.
- App dùng HTTP (không HTTPS) — đã cho phép sẵn qua `allowMixedContent: true` + `cleartext` trong cấu hình Android nên không bị chặn cleartext.

---

## 6. Chạy app

### Cách A — bấm Run trong Android Studio (khuyến nghị khi debug)

1. Emulator đang mở (hoặc điện thoại đã cắm cáp + bật **USB debugging**).
2. Trên thanh công cụ Android Studio chọn thiết bị ở dropdown → bấm **▶ Run 'app'** (Shift+F10).
3. Studio build APK, cài và mở app. Lần đầu mất 1–3 phút.

### Cách B — dòng lệnh (nhanh, không cần bấm trong Studio)

```powershell
cd C:\DoAnTotNghiepv3\frontend
npm run android:run     # = build web + sync + gradlew assembleDebug + adb install
```

Tách lẻ nếu cần:

```powershell
npm run android:apk      # build APK debug → android/app/build/outputs/apk/debug/app-debug.apk
npm run android:install  # adb install -r <apk ở trên> (cần thiết bị/emulator đang chạy)
```

File APK debug nằm ở: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` — có thể copy sang điện thoại cài tay (bật "Cài từ nguồn không xác định").

### Bật USB debugging trên điện thoại thật

Settings → About phone → bấm **Build number** 7 lần → quay lại → **Developer options** → bật **USB debugging**. Cắm cáp, chấp nhận hộp thoại "Allow USB debugging". Kiểm tra: `adb devices` phải liệt kê máy.

<!-- PLACEHOLDER3 -->

---

## 7. Debug & xem log

### Chrome DevTools cho WebView (mạnh nhất — vì app là web)

App là một WebView nên debug được như web bình thường:

1. Mở app trên emulator/điện thoại.
2. Trên máy tính mở Chrome → gõ `chrome://inspect/#devices`.
3. Thiết bị + WebView `com.tripmate.app` hiện ra → bấm **inspect**.
4. Có đủ Console, Network, Elements — xem lỗi JS, request API thất bại, response...

> Đây là cách tốt nhất để bắt lỗi "app trắng màn hình" hoặc "gọi API không được" — mở tab **Network** xem request đi tới đâu, đỏ ở đâu.

### Logcat (log tầng Android)

Trong Android Studio mở **Logcat** (đáy cửa sổ), lọc theo package `com.tripmate.app`. Hoặc dòng lệnh:

```powershell
adb logcat | findstr -i "tripmate chromium"
```

---

## 8. (Tuỳ chọn) Live-reload: sửa code thấy ngay không cần build lại

Mặc định APK đóng gói tĩnh — sửa React phải `cap:sync` lại. Khi đang phát triển nhiều, có thể trỏ app vào **Vite dev server** để hot-reload:

1. Lấy IP LAN máy bạn (`ipconfig`).
2. Mở `frontend/capacitor.config.ts`, bỏ comment block `server` và điền IP:
   ```ts
   server: {
     url: 'http://192.168.88.120:3000',   // IP LAN máy bạn, port dev của Vite
     cleartext: true,
   },
   ```
3. Chạy dev server: `npm run dev` (Vite tại :3000). Lưu ý dev server gọi API qua proxy `/api` → `localhost:8080`, nên backend vẫn phải chạy.
4. `npm run cap:sync` rồi Run lại app. Giờ app load thẳng từ dev server → sửa code thấy ngay.

> ⚠️ **Nhớ comment lại block `server`** trước khi build APK thật để phát hành — nếu không APK sẽ phụ thuộc máy dev đang bật.

---

## 9. Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách sửa |
|---|---|
| **App trắng màn hình** | Chưa `cap:sync` sau khi build, hoặc `dist/` rỗng. Chạy lại `npm run android:build`. Mở `chrome://inspect` xem lỗi Console. |
| **Đăng nhập / mọi API lỗi mạng** | Sai `VITE_API_BASE_URL`. Emulator phải là `10.0.2.2`, **không** phải `localhost`. Build lại sau khi sửa `.env.production`. |
| **Điện thoại thật không gọi được API** | Khác Wi-Fi, hoặc Firewall chặn 8080, hoặc dùng nhầm `10.0.2.2`. Test `http://<IP-LAN>:8080/docs` trên trình duyệt điện thoại trước. |
| **`adb` không phải lệnh hợp lệ** | Chưa thêm `platform-tools` vào PATH (§2). Mở lại terminal. |
| **Gradle sync fail / JDK** | Cần JDK 17. Trong Studio: *Settings → Build Tools → Gradle → Gradle JDK* chọn bản 17 (JBR đi kèm). |
| **`adb devices` trống (điện thoại thật)** | Chưa bật USB debugging, hoặc chưa chấp nhận hộp thoại trên máy, hoặc thiếu driver USB. |
| **`SDK location not found`** | Tạo `frontend/android/local.properties` với `sdk.dir=C\:\\Users\\<bạn>\\AppData\\Local\\Android\\Sdk` (hoặc đặt `ANDROID_HOME`). |
| **Sửa code mà app không đổi** | APK tĩnh — phải `npm run cap:sync` lại. Hoặc dùng live-reload (§8). |
| **Cảnh báo cleartext / HTTP bị chặn** | Đã xử lý sẵn (`allowMixedContent`). Nếu vẫn lỗi, kiểm tra đang gọi `http://` đúng IP. |

---

## 10. Tóm tắt lệnh nhanh

```powershell
# Backend (terminal riêng, luôn cần khi test với BE local)
cd C:\DoAnTotNghiepv3\backend ; npm run start:dev

# === App Android (trong frontend/) ===
cd C:\DoAnTotNghiepv3\frontend

npm run android:build   # build web + sync + mở Android Studio (rồi bấm ▶ Run)
npm run android:run     # build + cài thẳng lên emulator/điện thoại (không cần Studio)
npm run android:apk     # chỉ build ra app-debug.apk
npm run cap:sync        # đẩy bản web mới vào project android/ (sau mỗi lần sửa code)

adb devices             # liệt kê thiết bị đang kết nối
```

**Địa chỉ API theo môi trường** (sửa `frontend/.env.production`, build lại):
- Emulator / LDPlayer → `http://10.0.2.2:8080/api`
- Điện thoại thật → `http://<IP-LAN>:8080/api`
- Server đã deploy → `https://<service>.onrender.com/api`

---

> Tài liệu liên quan: cấu hình Capacitor xem `frontend/capacitor.config.ts`; biến môi trường xem `frontend/.env.production` & `.env.lan`; tổng quan dự án xem `CLAUDE.md` §17 (Capacitor Android).

