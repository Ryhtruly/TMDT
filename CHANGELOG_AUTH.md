# CHANGELOG — Hệ Thống Quản Lý Kho Vận (TMDT Logistics)

Tài liệu này ghi lại toàn bộ các thay đổi, cải tiến và tính năng mới được phát triển trong dự án.

---

## [Phiên 3] — 16/04/2026 · Auth & Xác Thực Người Dùng

### ✨ Tính Năng Mới

#### Luồng Đăng Ký 3 Bước (OTP-Based)
Luồng đăng ký tài khoản Shop được thiết kế lại hoàn toàn:

- **Bước 1:** Nhập số điện thoại → Hệ thống gọi `POST /api/shop/send-otp`, kiểm tra SĐT chưa tồn tại, sinh mã OTP 6 số và bắn ra terminal webservice (mock SMS).
- **Bước 2:** Nhập mã OTP 6 số nhận được → Gọi `POST /api/shop/verify-otp`, OTP hết hạn sau 5 phút.
- **Bước 3:** Điền form đăng ký gồm: **Tên tài khoản (Tên Cửa Hàng)**, **Email**, **Mật khẩu**, **Nhập lại mật khẩu**.

#### Chức Năng Quên Mật Khẩu
Trang `ForgotPassword.tsx` mới với 3 bước tương tự:

- Nhập SĐT đã đăng ký → Gửi OTP (hệ thống kiểm tra SĐT **phải TỒN TẠI**).
- Xác thực OTP.
- Nhập mật khẩu mới (áp dụng đầy đủ bộ validate). OTP bị hủy ngay sau khi dùng.

Link **"Quên mật khẩu?"** đã được thêm vào trang Đăng Nhập.

### 🔒 Validate Mật Khẩu Nâng Cao

| Tiêu chí | Yêu cầu |
|---|---|
| Độ dài | Tối thiểu **8 ký tự** |
| Chữ hoa | Ít nhất **1 ký tự IN HOA** |
| Chữ thường | Ít nhất **1 ký tự thường** |
| Chữ số | Ít nhất **1 chữ số** |
| Ký tự đặc biệt | Ít nhất **1 ký tự** (`!@#$%^&*...`) |
| Không chứa SĐT | Mật khẩu **không được chứa** số điện thoại |
| Không chứa tên TK | Mật khẩu **không được chứa** tên cửa hàng |
| Nhập lại khớp | Trường nhập lại phải **khớp hoàn toàn** |

### 🗄️ Thay Đổi Database
```sql
-- Thêm cột email vào bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```
Bỏ các trường `tax_code` và `representative` khỏi logic tạo Shop (không còn yêu cầu nhập khi đăng ký).

### 📁 File Thay Đổi
| File | Loại | Mô tả |
|---|---|---|
| `webservice/src/services/shop.service.ts` | Sửa | Thêm `sendOtp`, `verifyOtp`, `resetPassword` |
| `webservice/src/repositories/shop.repository.ts` | Sửa | Thêm `updatePassword`, cập nhật `createUser`/`createShop` |
| `webservice/src/controllers/shop.controller.ts` | Sửa | Thêm 4 controllers mới cho OTP & reset |
| `webservice/src/routes/shop.routes.ts` | Sửa | Thêm 4 route public mới |
| `client/src/pages/auth/Register.tsx` | Sửa | Viết lại thành luồng 3 bước |
| `client/src/pages/auth/Login.tsx` | Sửa | Thêm link "Quên mật khẩu?" |
| `client/src/pages/auth/ForgotPassword.tsx` | **Mới** | Trang khôi phục mật khẩu 3 bước |
| `client/src/App.tsx` | Sửa | Thêm route `/forgot-password` |

### 🌐 API Endpoints Mới
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/shop/send-otp` | Gửi OTP đăng ký (SĐT chưa tồn tại) |
| `POST` | `/api/shop/send-otp-forgot` | Gửi OTP khôi phục (SĐT đã tồn tại) |
| `POST` | `/api/shop/verify-otp` | Xác thực mã OTP |
| `POST` | `/api/shop/reset-password` | Đặt lại mật khẩu sau xác thực OTP |

---

## [Phiên 2] — 15–16/04/2026 · Shipper, Admin & Sửa Lỗi Logic

### ✨ Tính Năng Mới

#### API Lấy Hàng Thất Bại (Shipper)
Endpoint `POST /api/shipper/scan/failed-pickup` hỗ trợ quy trình Shipper báo cáo lấy hàng thất bại:
- Cập nhật trạng thái đơn → `ĐÃ HỦY`.
- **Tự động hoàn tiền** cước phí dịch vụ về ví Shop (nếu đã thanh toán trước).
- Ghi log transaction hoàn tiền vào bảng `wallet_logs`.

#### Admin — Quản Lý Đơn Hàng
Sửa lỗi trang `Orders.tsx` trong Admin không hiển thị danh sách đơn hàng:
- **Nguyên nhân:** API trả về `res` nhưng Frontend đang đọc `res.data` (lớp `.data` bị dư thừa do `apiClient` đã tự unwrap).
- **Sửa:** Loại bỏ lớp `.data` dư thừa, đọc trực tiếp từ `res`.

#### Admin — Quản Lý Tuyến Đường
Sửa lỗi trang `Routes.tsx` trong Admin hiển thị sai cấu trúc dữ liệu:
- Đồng bộ lại giao diện với cấu trúc API mới (Backend trả về chi tiết từng node Hub/Spoke thay vì tổng quát).
- Hiển thị đầy đủ: Bưu cục xuất phát, các chặng dừng trung gian, Bưu cục đích.

#### Admin — Sidebar Scroll
Sửa lỗi menu Sidebar bị cắt khi màn hình nhỏ:
- Thêm `overflow-y: auto` + custom scrollbar vào `.sidebar-nav` trong `Layout.css`.

### 🐛 Sửa Lỗi

#### Số Dư Ví Bị Âm
**Vấn đề:** Sau khi tạo đơn, logic trừ tiền trừ cả `used_credit` lẫn `balance` gây số dư âm.

**Nguyên nhân:** Hàm `deductWalletAndLog` chưa ưu tiên đúng thứ tự trừ tiền.

**Giải pháp:** Chuẩn hóa lại logic — ưu tiên trừ `used_credit` (hạn mức tín dụng đã dùng) trước, sau đó mới trừ `balance` (số dư thật), có kiểm tra không cho xuống dưới 0.

#### SQL Error — Đếm Đơn Hàng Admin
**Vấn đề:** `AdminRepository.getAllOrders` ném lỗi 500 do dùng regex `replace` không hợp lệ để đếm tổng số đơn hàng.

**Giải pháp:** Loại bỏ regex, dùng truy vấn `COUNT(*)` SQL trực tiếp.

### 📁 File Thay Đổi
| File | Loại | Mô tả |
|---|---|---|
| `webservice/src/repositories/admin.repository.ts` | Sửa | Fix truy vấn COUNT đơn hàng |
| `webservice/src/services/shipper.service.ts` | Sửa | Thêm logic `failed-pickup` + hoàn tiền |
| `webservice/src/controllers/shipper.controller.ts` | Sửa | Thêm controller `failedPickup` |
| `webservice/src/routes/shipper.routes.ts` | Sửa | Thêm route `POST /scan/failed-pickup` |
| `admin/src/pages/Orders.tsx` | Sửa | Fix truy cập dữ liệu response |
| `admin/src/pages/Routes.tsx` | Sửa | Đồng bộ giao diện với cấu trúc API mới |
| `admin/src/components/layout/Layout.css` | Sửa | Thêm overflow-y + custom scrollbar sidebar |

---

## [Phiên 1] — 15/04/2026 · Tích Hợp Thanh Toán & Nạp Tiền

### ✨ Tính Năng Mới

#### Tích Hợp PayOS — Nạp Tiền Thật
Tích hợp cổng thanh toán **PayOS** để nạp tiền vào ví Shop bằng QR Code động:
- Shop chọn số tiền muốn nạp → Hệ thống gọi PayOS API tạo link thanh toán + QR Code.
- Sau khi thanh toán thành công, PayOS gọi **Webhook** về `POST /api/shop/webhook/payos`.
- Backend xác thực chữ ký webhook, cập nhật số dư ví và ghi log giao dịch.

#### Thanh Toán Đơn Hàng — 2 Phương Thức
Hỗ trợ 2 hình thức thanh toán cước vận chuyển:

1. **Thanh toán trước bằng Ví** (balance + hạn mức tín dụng): Trừ tiền ngay khi tạo đơn thành công, dùng PostgreSQL Transaction đảm bảo tính toàn vẹn.
2. **Thanh toán tiền mặt khi Shipper đến lấy hàng:** Shipper xác nhận nhận tiền hoặc có thể hủy đơn nếu Shop không trả.

#### Hệ Thống Định Tuyến Hub-and-Spoke (Tự Động)
- Tự động phân loại tuyến đường: `DIRECT` / `INTRA_HUB` / `INTER_HUB` dựa trên tọa độ GPS của Spoke/Hub nguồn và đích.
- Tạo các chặng dừng vận chuyển (nodes) tương ứng cho từng loại tuyến.

#### Quản Lý Bưu Kiện (Bag Scanning)
- Nhóm nhiều đơn hàng vào 1 Bưu Kiện (Bag).
- Nhân viên kho dùng máy scan QR/Barcode để check-in hàng loạt.

#### Đối Soát COD (Shipper)
- Màn hình đối soát COD cho Shipper trên App Mobile.
- Ghi nhận số tiền COD thu được và nộp về hệ thống.

### 🔒 Bảo Mật Tài Chính
- Toàn bộ thao tác tài chính (trừ tiền, hoàn tiền, cộng tiền) đều dùng **PostgreSQL Transaction** (`BEGIN/COMMIT/ROLLBACK`).
- Kiểm tra số dư trước khi trừ, không cho phép số dư xuống âm.
- Ghi log đầy đủ vào `wallet_logs` cho mỗi giao dịch.

### 📁 File Thay Đổi Chính
| File | Loại | Mô tả |
|---|---|---|
| `webservice/src/services/order.service.ts` | Sửa | Logic tạo đơn, tính phí, trừ tiền ví |
| `webservice/src/services/general.service.ts` | Sửa | Logic nạp tiền PayOS, xử lý webhook |
| `webservice/src/services/routing.service.ts` | Mới | Phân tuyến Hub-and-Spoke tự động |
| `webservice/src/repositories/order.repository.ts` | Sửa | Truy vấn tạo đơn, cập nhật trạng thái |
| `webservice/src/config/payos.ts` | Mới | Cấu hình PayOS SDK |
| `webservice/src/middlewares/upload.middleware.ts` | Mới | Middleware upload file |
| `webservice/src/services/cron.service.ts` | Mới | Cron job tự động xử lý đơn hàng |
| `client/src/pages/shop/Wallet.tsx` | Sửa | Giao diện nạp tiền PayOS |
| `client/src/pages/shop/CreateOrder.tsx` | Sửa | Giao diện tạo đơn hàng |
| `client/src/pages/shop/Orders.tsx` | Sửa | Danh sách đơn hàng Shop |
| `client/src/pages/shop/OrderDetail.tsx` | Mới | Chi tiết đơn hàng |
| `admin/src/pages/Payouts.tsx` | Sửa | Quản lý đối soát chi trả |
| `mobile/src/pages/Scanner.tsx` | Sửa | Màn hình scan QR cho Shipper |
| `mobile/src/pages/CODReconciliation.tsx` | Sửa | Đối soát COD Shipper |

---

## Tổng Quan Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────┐
│                    TMDT Logistics                    │
├──────────────┬──────────────┬────────────────────────┤
│  Client Web  │  Admin Web   │     Mobile (Shipper)   │
│  (Shop UI)   │  (Quản trị)  │     React Native       │
├──────────────┴──────────────┴────────────────────────┤
│              Webservice (Express + TypeScript)        │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────────┐ │
│  │  PayOS   │ │ Routing   │ │  Wallet / Ledger     │ │
│  │ Webhook  │ │Hub-Spoke  │ │  (Transaction Safe)  │ │
│  └──────────┘ └───────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────┤
│              PostgreSQL (QLKV Database)              │
└─────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (Transaction-safe)
- **Auth:** JWT (Access Token)
- **Payment:** PayOS (QR Code động)
- **Frontend:** React + Vite + TypeScript
- **Mobile:** React Native (Expo)
