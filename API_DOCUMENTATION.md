# TỔNG HỢP DANH SÁCH API (LOGISTICS BACKEND)

Hệ thống được thiết kế theo tiêu chuẩn RESTful API. Base URL mặc định là: `http://localhost:3000/api`

Tất cả các API yêu cầu xác thực cần truyền header:
`Authorization: Bearer <token_cua_ban>`

---

## 1. 🔐 AUTHENTICATION (Xác thực & Bảo mật)
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Đăng nhập hệ thống (Lấy Token) |
| `GET` | `/auth/me` | Mọi user | Tải lại thông tin User bằng Token |
| `GET` | `/auth/test-role-admin` | ADMIN, SHIPPER | Test chức năng lọc phân quyền |

---

## 2. 👑 ADMIN (Quản trị hệ thống)
*Tất cả API nhóm này đều yêu cầu quyền `ADMIN`.*

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/admin/dashboard-stats` | Thống kê tổng số Đơn, User, Shop, Dòng tiền nền tảng |
| `GET` | `/admin/infrastructure` | Liệt kê toàn bộ hệ thống Kho (Hub, Spoke) |
| `GET` | `/admin/roles` | Lấy danh sách chức vụ mặc định |
| `POST` | `/admin/employees` | Tuyển dụng & Thêm tài khoản nhân sự mới |
| `POST` | `/admin/hubs` | Khởi tạo Hub (Kho trung tâm điểm) |
| `PUT` | `/admin/hubs/:id` | Sửa thông tin Hub |
| `POST` | `/admin/spokes` | Mở bưu cục (Spoke) khu vực |
| `PUT` | `/admin/spokes/:id` | Cập nhật thông tin Spoke |
| `POST` | `/admin/areas` | Đặc quyền phân vùng thu phát cho Spoke |
| `PUT` | `/admin/pricing-rules` | Cấu hình biểu Phí Giao Hàng cơ sở |
| `PUT` | `/admin/insurance-config` | Cấu hình khung % Phí Bảo hiểm hàng hóa |
| `POST` | `/admin/user-roles` | Cấp Role chéo cho Nhân viên |
| `DELETE` | `/admin/user-roles` | Tước quyền (Role) của Nhân sự |

---

## 3. 🏪 SHOP (Quản lý Cửa Hàng & Lên Đơn)

| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/shop/register` | Public | Đăng ký tài khoản dành cho Chủ Shop |
| `GET` | `/shop/profile` | SHOP | Tải Profile và sơ lược Ví |
| `GET` | `/shop/wallet` | SHOP | Quản lý thông tin Ví Điện Tử và Lịch sử GD |
| `POST` | `/shop/wallet/topup` | SHOP | Nạp tiền vào hệ thống trả trước (Mock) |
| `GET` | `/shop/banks` | SHOP | Liệt kê tài khoản Ngân hàng (Để nhận COD) |
| `POST` | `/shop/banks` | SHOP | Thêm số tài khoản Bank |
| `DELETE` | `/shop/banks/:id` | SHOP | Xóa số TK Bank |
| `GET` | `/shop/stores` | SHOP | Liệt kê các địa chỉ kho lấy hàng của Shop |
| `POST` | `/shop/stores` | SHOP | Thêm địa chỉ lấy hàng |
| `PUT` | `/shop/stores/:id` | SHOP | Sửa địa chỉ kho hàng |
| `DELETE` | `/shop/stores/:id` | SHOP | Xóa địa chỉ kho hàng |
| `GET` | `/shop/orders/service-types` | SHOP | Liệt kê gói Vận chuyển (Tiêu chuẩn, Hỏa tốc...) |
| `POST` | `/shop/orders/preview-fee` | SHOP | Giả lập tính trước chi phí Ship (Preview) |
| `POST` | `/shop/orders` | SHOP | LÊN ĐƠN (Trừ thẳng tiền Ví) |
| `GET` | `/shop/orders` | SHOP | Xem DS đơn của Shop (Lọc theo Query: `?status=`) |
| `DELETE` | `/shop/orders/:id/cancel` | SHOP | Hủy Đơn Hàng (Nếu trạng thái = CHỜ LẤY HÀNG) |

---

## 4. 🚖 SHIPPER (Giao Nhận - Lấy Hàng)
*Nhóm tính năng dành riêng cho app của Bưu tá (`SHIPPER`).*

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/shipper/tasks` | Tải danh sách đơn hàng được chia cho tài xế |
| `POST` | `/shipper/scan/:tracking_code` | Quét quét mã để BÁO LẤY / BÁO GIAO thành công |
| `POST` | `/shipper/fail/:tracking_code` | Quét để báo cáo giao/ lấy thất bại (Kèm Cớ, up file) |
| `GET` | `/shipper/fee/:tracking_code` | Kiểm tra số tiền Cước, COD phải thu Khách khi đến nhà |

---

## 5. 📦 STOCKKEEPER (Thủ Kho Xử Lý)
*Nhóm điều phối vòng đời tồn kho (`STOCKKEEPER`).*

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/stockkeeper/inbound-order` | Bắn súng Barcode: Xác nhận Nhập Kho 1 Kiện Lẻ |
| `POST` | `/stockkeeper/outbound-order` | Bắn súng Barcode: Bàn giao hàng Lẻ -> Túi Shipper |
| `POST` | `/stockkeeper/inbound-bag` | Bắn mã Niêm phong: Nhận Bao Tải hàng từ Xe Tải |
| `POST` | `/stockkeeper/outbound-bag` | Bắn mã Niêm phong: Xuất Bao Tải tải lên Xe Tải đi Hub khác |
| `GET` | `/stockkeeper/inventory` | Quét DS Hàng Tồn trong kho (Highlight hàng kẹt > 24h) |

---

## 6. 🌐 GENERAL (Các Nghiệp Vụ Xuyên Suốt Hệ Thống)
*Đây là nhóm tổng hợp vận hành cao độ. API có thể được gọi bởi Admin, Shop hoặc theo đặc quyền ngầm.*

### Điều Phối & Bao Tải Tuyến Đường
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/routes/resolve` | Bất kỳ | Tính toán Tự Động Định Tuyến đường đi rẻ & nhanh nhất |
| `GET` | `/routes` | ADMIN | Lấy tất lưới Ma Trận Tuyến Đường (Master Router Nodes) |
| `GET` | `/routes/:id` | Token | Xem vết chặng ghé dừng của 1 Tuyến Cụ Thể |
| `POST` | `/bags` | STOCKKEEPER| Gói (Đóng) Bao tải lớn nhét hàng trăm đơn lẻ vào |
| `POST` | `/bags/scan` | STOCKKEEPER| Quản lý đổi Trạng thái của cả 1 Bao Hàng (IN/OUT TRANSIT) |
| `GET` | `/bags/:code` | Token | Scan nội soi ruột Bao Tải để xem bên trong có các Đơn gì |

### Tra Cứu
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/orders/track/:tracking` | Bất kỳ (Public)| Tra cứu Vận Đơn theo chuỗi Timeline cho Web Guest |

### Nghiệp vụ Nâng cao hoàn thiện báo cáo (COD, Lương, Báo cáo) 
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders/:id/return` | SHOP | Yêu cầu đổi lệnh chuyển đơn -> HOÀN HÀNG (Sẽ bị thu phí đổi)|
| `GET` | `/admin/audit-log` | ADMIN | Nhật ký Hành động (Audit Trail). Truy xuất thao tác bảo mật.|
| `GET` | `/admin/hub/:id/safe-delete` | ADMIN | DB Check Logic: Hub này xóa có rủi ro kẹt đơn không? |
| `GET` | `/admin/spoke/:id/safe-delete`| ADMIN | DB Check Logic: Bưu cục nội thành này có đang om hàng không? |
| `GET` | `/shop/cashflow` | SHOP | Khai thác dòng tiền tổng quát ra vào hàng tháng|
| `GET` | `/shop/operations-report` | SHOP | Trực quan Dashboard Vận Hành: Đơn đi, Đơn Hoàn, Đơn kẹt |
| `GET` | `/shop/search-orders` | SHOP | Công cụ Search Tracking mạnh theo Filter Status/Thời Gian |
| `GET` | `/shipper/cod-summary` | SHIPPER | Cho bác Tài xế kiểm tra ca: Cuối ngày nộp Kho bao nhiêu tiền? |
| `GET` | `/shipper/income` | SHIPPER | Bác Tài xế xem Bảng kê Lương: Lương Cứng + Hoa Hồng thực nhận|
| `GET` | `/shipper/income/history` | SHIPPER | Lịch sử nhận lương nhiều tháng của Tài xế |
| `POST` | `/admin/shipper-salary` | ADMIN | Tự động Admin set chốt sổ Lương Cứng & Khoản Phạt tài xế|

### Sự Cố, Đối Soát Tiền Nong & Khuyến Mãi
| Method | Endpoint | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/promotions` | Bất kỳ | Lấy mã KM đang có trên Website. |
| `POST` | `/promotions/apply` | SHOP | Test nhúng mã giảm giá vào đơn -> Trả về Tiền còn lại. |
| `POST` | `/promotions` | ADMIN | Tung Campaign mã Phí Ship (Percent hoặc Fixed) | 
| `PUT` | `/promotions/:id/toggle`| ADMIN | Suspend/ Bật Mã bất chợt (Chặn dùng). |
| `POST` | `/cod/request` | SHOP | Chủ Shop bấm Rút Tiền Thu Hộ (Hơi Cáp cước phí).|
| `GET` | `/cod/pending` | ADMIN | Các lô tiền COD T2-T6 đang chờ Kế toán duyệt xả. |
| `PUT` | `/cod/:id/approve` | ADMIN | Lệnh ngân hàng giải ngân xong, báo Đã Chuyển Tiền. |
| `POST` | `/incidents` | Token | Báo cáo gói Mất, Rách, Ướt lủng |
| `PUT` | `/incidents/:id/resolve`| ADMIN | Chấp nhận Đền Bù thiệt hại vào ví dựa bảo hiểm tối đa 5 củ. |

### Feedback Dịch Vụ
| Method | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/feedbacks` | Token | Lời nhận xét và rate gửi Ban Điều Hành hệ thống. |
| `GET` | `/feedbacks` | ADMIN | Danh sách Ticket góp ý xây dựng. |
| `GET` | `/notifications` | Token | Danh sách Notification Box (Tin Push về máy tính/đt) |
| `PUT` | `/notifications/:id/read`| Token | Mark dòng thông báo là đã xem. |
| `PUT` | `/notifications/read-all`| Token | Quét Đọc một phát hết list chưa đọc. |

---
**Tài liệu này đánh dấu điểm hoàn thiện và Build 100% Endpoints hệ thống Node.js 4-layers Logistics.**
