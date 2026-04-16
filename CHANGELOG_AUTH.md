# Cập Nhật Tính Năng — Luồng Đăng Ký & Xác Thực Người Dùng

**Ngày:** 16/04/2026

---

## Tổng Quan

Phiên làm việc này tập trung vào việc cải thiện và hoàn thiện toàn bộ luồng xác thực người dùng cho ứng dụng **Client (Shop)**, bao gồm: đăng ký tài khoản có xác thực OTP qua số điện thoại và chức năng khôi phục mật khẩu khi quên.

---

## Chi Tiết Thay Đổi

### 1. Luồng Đăng Ký Tài Khoản Mới — 3 Bước (OTP-Based)

**Trước đây:** Form đăng ký chỉ có 1 trang duy nhất, không có xác thực OTP, vẫn còn trường Mã Số Thuế và Người Đại Diện không cần thiết, và thiếu nhiều validate.

**Sau khi cập nhật:**

Luồng đăng ký được chia thành **3 bước tường minh**:

- **Bước 1 — Nhập số điện thoại định danh:** Hệ thống sử dụng số điện thoại làm định danh chính. Khi nhấn "Tiếp Tục", Frontend gọi API `POST /api/shop/send-otp` để kiểm tra SĐT chưa tồn tại trong hệ thống, sau đó sinh mã OTP 6 số ngẫu nhiên và in ra terminal server (mock SMS).
- **Bước 2 — Xác thực OTP:** Người dùng nhập mã OTP nhận được. Frontend gọi `POST /api/shop/verify-otp` để xác thực. OTP có hiệu lực trong **5 phút**, sau đó tự hết hạn.
- **Bước 3 — Điền thông tin tài khoản:** Sau khi xác thực SĐT thành công, hiển thị form gồm 4 trường:
  - **Tên tài khoản** (Tên Cửa Hàng)
  - **Email**
  - **Mật khẩu**
  - **Nhập lại mật khẩu**

> **Lưu ý:** Đã bỏ các trường Mã Số Thuế và Người Đại Diện theo yêu cầu.

---

### 2. Validate Mật Khẩu — Bộ Tiêu Chí Nghiêm Ngặt

Mật khẩu được kiểm tra ở cả **Frontend** và **Backend** theo các tiêu chí:

| Tiêu chí | Yêu cầu |
|---|---|
| Độ dài | Tối thiểu **8 ký tự** |
| Chữ hoa | Ít nhất **1 ký tự IN HOA** |
| Chữ thường | Ít nhất **1 ký tự thường** |
| Chữ số | Ít nhất **1 chữ số** |
| Ký tự đặc biệt | Ít nhất **1 ký tự** như `!@#$%^&*...` |
| Không chứa SĐT | Mật khẩu **không được chứa** số điện thoại của chính mình |
| Không chứa tên TK | Mật khẩu **không được chứa** tên cửa hàng/tài khoản |
| Nhập lại khớp | Trường "Nhập lại mật khẩu" phải **khớp hoàn toàn** |

---

### 3. Chức Năng Quên Mật Khẩu

Bổ sung toàn bộ luồng **Khôi Phục Mật Khẩu** qua OTP với **3 bước** tương tự đăng ký:

- **Bước 1:** Nhập SĐT đã đăng ký. Hệ thống kiểm tra SĐT **phải tồn tại** trong DB rồi mới gửi OTP.
- **Bước 2:** Xác thực OTP (hiệu lực 5 phút).
- **Bước 3:** Nhập mật khẩu mới và nhập lại, vẫn áp dụng đầy đủ bộ validate như trên.

Sau khi đổi thành công, OTP bị hủy ngay lập tức (không thể tái sử dụng) và mật khẩu mới được mã hóa `bcrypt (12 rounds)` trước khi lưu vào DB.

**Điểm truy cập:** Trang Đăng Nhập đã có thêm liên kết **"Quên mật khẩu?"** ngay dưới trường nhập mật khẩu.

---

### 4. Cơ Chế OTP Mock (Không cần SIM thật)

Trong môi trường phát triển, OTP được in trực tiếp ra **terminal của webservice** với format:

```
================================
🚀 [SMS MOCK] HỆ THỐNG GỬI MÃ OTP
📱 Số điện thoại nhận: 0987654321
🔑 Mã OTP của bạn là: 894312
⏳ Hiệu lực trong 5 phút.
================================
```

OTP được lưu trong bộ nhớ (RAM cache), tự động hết hạn sau 5 phút mà không cần cơ sở dữ liệu riêng.

---

### 5. Thay Đổi Database

Bảng `users` đã được bổ sung thêm cột:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```

Hai cột `tax_code` và `representative` trên bảng `shops` đã được xóa khỏi logic tạo Shop (không dùng đến nữa).

---

## Danh Sách File Thay Đổi

### Backend (`webservice/`)

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `src/services/shop.service.ts` | Sửa đổi | Thêm `sendOtp`, `verifyOtp`, `resetPassword`; cập nhật `registerShop` với email và validate mới |
| `src/repositories/shop.repository.ts` | Sửa đổi | Thêm `updatePassword`; cập nhật `createUser` (thêm email), `createShop` (bỏ tax_code/representative) |
| `src/controllers/shop.controller.ts` | Sửa đổi | Thêm `sendOtp`, `sendOtpForgot`, `verifyOtp`, `resetPassword` controllers |
| `src/routes/shop.routes.ts` | Sửa đổi | Đăng ký các route public mới: `/send-otp`, `/send-otp-forgot`, `/verify-otp`, `/reset-password` |

### Frontend Client (`client/`)

| File | Loại thay đổi | Mô tả |
|---|---|---|
| `src/pages/auth/Register.tsx` | Sửa đổi | Viết lại thành luồng 3 bước với OTP thật từ API |
| `src/pages/auth/Login.tsx` | Sửa đổi | Thêm link "Quên mật khẩu?" dưới trường mật khẩu |
| `src/pages/auth/ForgotPassword.tsx` | **Tạo mới** | Trang khôi phục mật khẩu 3 bước hoàn chỉnh |
| `src/App.tsx` | Sửa đổi | Đăng ký route `/forgot-password` |

---

## API Endpoints Mới

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/api/shop/send-otp` | Gửi OTP cho đăng ký (SĐT chưa tồn tại) | Public |
| `POST` | `/api/shop/send-otp-forgot` | Gửi OTP khôi phục (SĐT đã tồn tại) | Public |
| `POST` | `/api/shop/verify-otp` | Xác thực mã OTP | Public |
| `POST` | `/api/shop/reset-password` | Đặt lại mật khẩu mới sau khi xác thực OTP | Public |
