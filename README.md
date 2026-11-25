# GODA.Frame

Nền tảng tạo **frame avatar** và **thiệp mời cá nhân hoá** cho doanh nghiệp — thuộc hệ sinh thái GODA.MEDIA.

Người tổ chức đăng ký tài khoản → tải frame/thiệp lên → tuỳ biến trang (giao diện, màu, logo, footer, link) → gửi **một đường link**. CBNV/khách mời mở link, tải ảnh (hoặc nhập tên), AI tự căn mặt & tách nền, rồi tải về đăng social. Người tổ chức theo dõi lượt dùng theo thời gian thực; Super Admin thấy toàn bộ dữ liệu và phân phối tính năng.

## Tính năng

| Vai trò | Tính năng |
|---|---|
| **Khách (CBNV, khách mời)** | Không cần tài khoản · Kéo/zoom/pinch/xoay ảnh · Chụp selfie · **AI căn khuôn mặt** · **AI tách nền** (xoá phông mờ / thay nền màu) · 7 bộ lọc màu · Nhập tên cho thiệp (font tự co cho vừa khung) · Tải PNG/JPG chất lượng gốc · Chia sẻ qua Web Share API · **AI gợi ý caption** + hashtag |
| **Người tổ chức** | Đăng ký/đăng nhập · Tải frame PNG — **tự nhận diện vùng trong suốt** để đặt ảnh · Trình bố cục kéo thả (vùng ảnh tròn/vuông/bo góc, tối đa 6 trường chữ) · 4 giao diện trang (Aura, Bold, Studio, Paper) · Tuỳ biến màu, font, bo góc, logo, ảnh bìa, tiêu đề, footer, liên kết · **Xem trước trực tiếp** mobile/desktop · Tự lưu · Xuất bản/tạm dừng/lưu trữ · Link tuỳ chỉnh, **QR code**, link theo kênh (`?src=zalo`) · Dashboard: khách truy cập, ảnh tạo, tỉ lệ chuyển đổi, phễu, nguồn, thiết bị, giờ cao điểm, mức dùng AI, danh sách tên khách · Xuất CSV |
| **Admin / Super Admin** | Tổng quan toàn hệ thống · Quản lý người dùng: gói (Free/Pro/Business), **bật/tắt từng tính năng & hạn mức riêng cho từng tài khoản**, khoá/mở, phân quyền (chỉ Super Admin), xoá · Xem/sửa mọi chiến dịch · Nhật ký thao tác |

### Quyền riêng tư theo thiết kế
Ảnh của khách **không bao giờ rời trình duyệt**: căn mặt, tách nền, ghép frame đều chạy on-device bằng Google MediaPipe (Apache-2.0). Máy chủ chỉ lưu frame/logo của người tổ chức và sự kiện thống kê ẩn danh (tên khách chỉ lưu khi người tổ chức bật "Ghi nhận tên khách"). Điểm này giúp giảm đáng kể rủi ro tuân thủ Nghị định 13/2023 về bảo vệ dữ liệu cá nhân.

## Kiến trúc

- **Next.js 15** (App Router, React 19) + Tailwind CSS 4 — một codebase cho UI và API.
- **SQLite qua libSQL**: chạy file local, hoặc trỏ `DATABASE_URL` sang **Turso** để chạy serverless. Schema tự tạo khi khởi động.
- **Auth**: bcrypt + JWT (httpOnly cookie, 30 ngày). Middleware chặn `/dashboard`, `/admin`; mọi API kiểm tra lại quyền ở server.
- **Phân quyền tính năng**: `src/lib/features.ts` — gói định nghĩa mặc định, admin ghi đè từng tính năng cho từng user. Quyền được kiểm tra **tại thời điểm render** trang khách, nên hạ gói/khoá tài khoản có hiệu lực ngay.
- **AI**: MediaPipe FaceDetector (BlazeFace) + ImageSegmenter (selfie multiclass). WASM tự host tại `/mediapipe/wasm`; model tải từ Google Storage lúc khách dùng lần đầu. AI caption dùng Claude API (tuỳ chọn — không có `ANTHROPIC_API_KEY` thì dùng caption mẫu).
- **Bảo mật**: kiểm tra magic bytes khi upload (chặn SVG/file giả mạo), chống path traversal, rate limit đăng nhập/đăng ký/tracking, validate toàn bộ input bằng Zod, link ngoài chỉ chấp nhận `https/mailto/tel`.

```
src/
  app/                 # pages + API routes
    f/[slug]/          # trang công khai cho khách
    dashboard/         # khu vực người tổ chức
    admin/             # khu vực quản trị
    preview/[id]/      # iframe xem trước (nhận state qua postMessage)
    api/               # auth, campaigns, upload, files, track, ai/caption, admin
  components/
    guest/             # FrameStudio (engine tạo ảnh), GuestView (4 template)
    editor/            # CampaignEditor, FramePlacer (kéo thả bố cục)
  lib/
    client/render.ts   # engine canvas dùng chung editor & khách
    client/ai.ts       # MediaPipe on-device
    db.ts features.ts stats.ts auth.ts ...
```

## Chạy local

```bash
cp .env.example .env      # đặt AUTH_SECRET (>= 32 ký tự)
npm install
npm run dev               # http://localhost:3000
```

Tài khoản **đăng ký đầu tiên** tự động là Super Admin (hoặc email khai báo trong `ADMIN_EMAIL`).

## Triển khai

**Docker (khuyến nghị — VPS, Railway, Render, Fly…)**

```bash
docker compose up -d --build
```

Dữ liệu (DB + file upload) nằm trong volume `/app/data` — nhớ backup volume này.

**Serverless (Vercel…)**: dùng `DATABASE_URL=libsql://…` (Turso). Lưu ý: file upload hiện ghi ra đĩa local (`src/lib/storage.ts`) — trên serverless cần thay bằng S3/R2/Vercel Blob trước khi deploy.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `AUTH_SECRET` | ✅ | Khoá ký phiên đăng nhập, ≥ 32 ký tự |
| `NEXT_PUBLIC_APP_URL` | ✅ (prod) | Domain công khai, dùng tạo link & QR |
| `ADMIN_EMAIL` | | Email sẽ là Super Admin khi đăng ký |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | | Mặc định `file:./data/goda-frame.db` |
| `UPLOAD_DIR` | | Mặc định `./data/uploads` |
| `ANTHROPIC_API_KEY` | | Bật AI caption thật (model Claude Opus 5.5) |

## Lộ trình đề xuất

1. **Storage S3/R2** + CDN cho frame (bắt buộc nếu chạy nhiều instance/serverless).
2. **Đăng nhập SSO** (Google Workspace / Microsoft 365) cho khách doanh nghiệp lớn như FPT.
3. **Thanh toán & tự nâng gói** (VNPay/MoMo) thay cho admin cấp gói thủ công.
4. **Custom domain** cho gói Business (`frame.congty.vn`).
5. **Leaderboard phòng ban / bức tường avatar** (opt-in) — biến chiến dịch thành trò chơi gắn kết.
6. Rate limiter phân tán (Redis) khi scale ngang.
