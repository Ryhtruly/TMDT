# 🚚 TMDT Logistics — Hệ thống Quản lý Kho Vận

Một hệ thống quản lý kho vận toàn diện được xây dựng theo kiến trúc Monorepo, bao gồm 4 ứng dụng hoạt động đồng bộ với nhau.

---

## 📁 Cấu trúc Dự án

```
TMDT/
├── webservice/     # Backend API — Node.js + Express + PostgreSQL
├── client/         # Ứng dụng Web — Dành cho Shop (Shipper khách)
├── admin/          # Bảng điều khiển — Dành cho quản trị viên hệ thống
└── mobile/         # Ứng dụng Web Mobile — Dành cho Shipper & Thủ kho
```

---

## 🧩 Chi tiết từng Module

### 1. `webservice` — Backend API
- **Công nghệ:** Node.js, Express 5, TypeScript, PostgreSQL (`pg`), JWT, Bcrypt, dotenv
- **Cổng mặc định:** `3000`
- **Tính năng chính:**
  - Xác thực & phân quyền (SHOP / SHIPPER / STOCKKEEPER / ADMIN)
  - Quản lý đơn hàng toàn chu trình (tạo → lấy hàng → giao → đối soát)
  - Quản lý kho (nhập/xuất kho, kiểm hàng)
  - Quản lý tài chính (ví Shop, COD, nộp tiền)
  - Quản lý hạ tầng (Hub → Spoke, tuyến đường)
  - Tích hợp thanh toán PayOS

### 2. `client` — Ứng dụng Web Khách hàng (Shop)
- **Công nghệ:** React 19, TypeScript, Vite, React Router, Recharts
- **Cổng mặc định:** `5173`
- **Tính năng chính:**
  - Đăng nhập / Đăng ký cửa hàng
  - Dashboard tổng quan (doanh thu, đơn hàng)
  - Tạo và theo dõi đơn hàng
  - Quản lý kho mặc định & địa chỉ
  - Quản lý thông tin cửa hàng & tài khoản ngân hàng
  - Nạp tiền ví / Rút tiền

### 3. `admin` — Bảng điều khiển Quản trị
- **Công nghệ:** React 19, TypeScript, Vite, React Router, Recharts, Three.js, `react-force-graph-3d`
- **Cổng mặc định:** `5174`
- **Tính năng chính:**
  - Dashboard phân tích dữ liệu toàn hệ thống
  - Quản lý hạ tầng Hub-Spoke với biểu đồ 3D tương tác
  - Quản lý nhân viên (Shipper, Thủ kho)
  - Quản lý Promotions & Chương trình khuyến mãi
  - Phê duyệt Payouts cho Shop
  - Hỗ trợ khách hàng

### 4. `mobile` — Ứng dụng Web Mobile Vận hành
- **Công nghệ:** React 19, TypeScript, Vite, React Router, `html5-qrcode`
- **Cổng mặc định:** `5175`
- **Tính năng chính (Shipper):**
  - Dashboard ca làm việc & thống kê
  - Quản lý danh sách lấy/giao hàng
  - Quét mã QR/Barcode vận đơn (hỗ trợ chọn Webcam USB rời)
  - Nộp COD & Đối soát thu tiền
  - Xem thu nhập theo kỳ
- **Tính năng chính (Thủ kho):**
  - Quản lý tồn kho kho vận
  - Quét mã nhập/xuất kho

---

## ⚙️ Hướng dẫn Cài đặt & Chạy

### Yêu cầu hệ thống
- Node.js >= 18.x
- npm >= 9.x
- PostgreSQL >= 14

### 1. Cài đặt Backend (webservice)

```bash
cd webservice
npm install
```

Tạo file `.env` trong thư mục `webservice/` với nội dung:

```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ten_database_cua_ban
DB_USER=postgres
DB_PASSWORD=mat_khau_cua_ban

# JWT
JWT_SECRET=your_super_secret_key

# Server
PORT=3000
```

```bash
# Chạy ở chế độ Development
npm run dev
```

### 2. Cài đặt các Frontend

```bash
# Client (Shop)
cd client && npm install && npm run dev

# Admin Dashboard
cd admin && npm install && npm run dev

# Mobile (Shipper / Thủ kho)
cd mobile && npm install && npm run dev
```

---

## 📡 API Endpoints chính

| Prefix | Mô tả |
|---|---|
| `POST /api/auth/login` | Đăng nhập |
| `POST /api/auth/register` | Đăng ký Shop |
| `GET /api/orders` | Danh sách đơn hàng |
| `POST /api/orders` | Tạo đơn hàng mới |
| `POST /api/shipper/scan/pickup` | Shipper xác nhận lấy hàng |
| `POST /api/shipper/scan/delivered` | Shipper xác nhận giao thành công |
| `POST /api/shipper/scan/failed` | Shipper báo giao thất bại |
| `GET /api/stockkeeper/inventory` | Xem tồn kho |
| `GET /api/admin/employees` | Quản lý nhân viên |
| `GET /api/admin/infrastructure` | Xem hạ tầng Hub/Spoke |

> Chi tiết đầy đủ xem trong file `API_DOCUMENTATION.md`

---

## 🔐 Bảo mật

- Tất cả các file `.env` đã được thêm vào `.gitignore` và **không được đẩy lên repository**.
- Xác thực bằng **JWT Bearer Token**.
- Mật khẩu được mã hóa bằng **bcrypt**.
- Token nhạy cảm trên mobile được lưu bằng **localStorage** (phiên bản Web).

---

## 👥 Các Role trong hệ thống

| Role | Mô tả |
|---|---|
| `SHOP` | Chủ cửa hàng — quản lý đơn hàng, ví tiền |
| `SHIPPER` | Tài xế giao hàng — lấy hàng, giao hàng, nộp COD |
| `STOCKKEEPER` | Thủ kho — quản lý nhập xuất kho |
| `ADMIN` | Quản trị viên hệ thống toàn quyền |

---

## 📄 License

Dự án phục vụ mục đích học thuật — Đồ án môn học Thương mại điện tử.
