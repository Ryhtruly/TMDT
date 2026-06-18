# TỪ ĐIỂN CHỨC NĂNG: CHI TIẾT TỪNG FILE TRONG HỆ THỐNG

Báo cáo này là danh mục liệt kê chức năng của từng file cụ thể (những file quan trọng nhất định hình lên nền tảng) chia theo từng phân hệ thư mục.

---

## 🏗️ 1. BACKEND API (`webservice/src/`)
Nơi đây chứa não bộ của hệ thống.

### 📌 Thư mục `config/` và `db/`
* `db.ts`: Cấu hình thư viện `pg` (PostgreSQL). Đây là nơi khai báo Host, Port, Password kết nối vào CSDL.
* `ensureSchema.ts`: File chứa hàng trăm lệnh `CREATE TABLE` và `ALTER TABLE`. Mỗi khi Backend khởi động, file này chạy để đảm bảo CSDL không bị thiếu bảng hay thiếu cột.

### 📌 Thư mục `routes/` (Người phân luồng API)
* `index.ts`: (Nằm ở góc src) Trạm trung chuyển gom toàn bộ các file `.routes` lại và gắn tiền tố (ví dụ `/api/shop/...`).
* `auth.routes.ts`: Mở cửa cho các luồng Đăng nhập (Login), Đăng ký (Register), Sinh OTP.
* `shop.routes.ts`: Cửa vào cho Chủ Shop (Tạo đơn, xem danh sách đơn, xem ví).
* `admin.routes.ts`: Cửa vào cho Quản trị viên (Xem biểu đồ tổng, thêm cấu trúc bảng giá, thao tác nhân viên).
* `shipper.routes.ts`: Cửa cho App Shipper (Lấy danh sách đơn cần lấy/giao, nộp COD).
* `stockkeeper.routes.ts`: Cửa cho Kiosk Kho Bãi (Quét mã nhập kho, gom bao, rã bao).
* `general.routes.ts`: Cửa phụ không cần đăng nhập (Lấy danh sách tỉnh thành/xã, nhận tín hiệu Webhook từ ngân hàng PayOS).

### 📌 Thư mục `controllers/` (Tiếp Tân - Xử lý Đầu vào/Đầu ra)
* `auth.controller.ts`: Nhận Tài khoản/Mật khẩu từ FE -> Quăng vào Service mã hóa -> Trả về Token (Chìa khóa JWT) cho người dùng.
* `shop.controller.ts`: Đọc khối lượng (weight), kích thước hàng hóa để xác thực định dạng trước khi ra lệnh tạo đơn.
* `admin.controller.ts`: Nhận lệnh trích xuất dữ liệu, tổng hợp doanh thu và số lượng đơn thành cục JSON trả cho đồ thị Admin.
* `stockkeeper.controller.ts`: Nhận tín hiệu Quét mã vạch (Barcode string) -> Báo với kho bãi đang xử lý kiện số mấy.
* `webhook.controller.ts`: File túc trực 24/7 nhận thông báo từ PayOS. Nó kiểm tra `signature` bảo mật của ngân hàng gửi về xem có chuẩn không để chống hack.

### 📌 Thư mục `services/` (Khối Logic Tính Toán)
* `payment.service.ts`: Mã lõi xử lý tiền tệ. Chứa cơ chế mã hóa yêu cầu PayOS URL, cộng trừ tiền trong ví (Wallet). Nó quyết định xem có khóa Pessimistic Locking hay không.
* `order.service.ts`: Tính toán Cước phí (Pricing) tự động dựa trên khoảng cách (Nội tỉnh, Liên vùng) và Khối lượng (Weight bước nhảy 500g). Quyết định trừ tiền người gửi (SENDER) hay người nhận (RECEIVER).
* `routing.service.ts`: Trái tim luân chuyển kho bãi. Chứa hàm xử lý vòng đời: Chuyển Bao (Bag) thành `IN_TRANSIT` -> Giải nén Bao (Unbag) -> Ép các đơn con thành `RECEIVED`.

### 📌 Thư mục `repositories/` (Kho Lưu Trữ - Gọi lệnh SQL)
* `order.repository.ts`: Chứa lệnh `SELECT`, `INSERT orders...`. Các hàm `findOrderByTrackingCode`, `findWalletForUpdate` móc thẳng Data để trả về.
* `routing.repository.ts`: Chứa cực kì nhiều logic cập nhật liên hoàn. Ví dụ: `UPDATE bag_items SET status = ... WHERE id_bag = ...`. Đây là file thao tác bảng Log_hành_trình_đơn.
* `user.repository.ts`: Lệnh móc dữ liệu Shop, Thông tin Shipper theo mã.

---

## 🎨 2. FRONTEND - CỬA HÀNG (`client/src/`)
Giao diện để Shop vào lên đơn.

* `api/client.ts`: File đính kèm Token tự động bằng `Axios Interceptor` để mọi API gửi đi đều bảo mật.
* `pages/auth/Login.tsx & Register.tsx`: Giao diện 3 bước nhập SĐT nhận mã OTP đi kèm UI cực đẹp.
* `pages/shop/Dashboard.tsx`: Chứa các biểu đồ đường Line/Bar (chart.js/recharts) về trạng thái Tổng quan Cửa hàng.
* `pages/shop/Orders.tsx`: Bảng Table liệt kê hàng ngàn vận đơn. Chứa nút Modal tạo đơn mới (Tính cước Realtime).
* `pages/shop/Wallet.tsx`: Giao diện Ví chứa QR Code PayOS động. Khi nạp tiền xong màn hình tự nhảy số nhờ Polling/Refetch.
* `pages/shop/Stores.tsx`: Tính năng quản lý nhiều Điểm Lấy Hàng (Kho vệ tinh của Shop).

---

## 🏗️ 3. FRONTEND - KHO BÃI (`stockkeeper/src/`)
Công cụ Kiosk màn hình ngang thay thế máy quét cục rịch.

* `pages/Dashboard.tsx`: Tổng số lượng hàng đang tồn tại Trạm (Spoke) và Kho Tổng (Hub).
* `pages/SpokeReceive.tsx`: Màn hình Nhân viên nhập mã vạch bằng tay (hoặc súng quét) để chuyển hàng từ tay Shipper vào Nhập Kho nội bộ. Kích hoạt is_return nếu hàng hoàn.
* `pages/HubBagging.tsx`: Nơi thực thi Gom Bao (Đóng túi tời). Giao diện cho phép chọn Tuyến Đích rồi quét liên thanh các mã hàng đưa vào chung 1 Bao tải.
* `pages/HubUnbagging.tsx`: Nơi gỡ bao ở đầu đích. Quét mã bao 1 cái, hệ thống bung các đơn nhỏ bên trong báo là đã Tới Hub kia an toàn.
* `pages/SpokeDispatch.tsx`: Bắn hàng ra khỏi kho để gắn cho Shipper đi phát.

---

## 📱 4. FRONTEND - ĐIỆN THOẠI SHIPPER (`mobile/src/`)
Giao diện tối ưu theo chiều dọc Mobile-First.

* `pages/Dashboard.tsx`: Tóm tắt Shipper hôm nay phải lấy bao nhiêu đơn, đi giao bao nhiêu, và đang giữ bao nhiêu tiền mặt (COD) của công ty.
* `pages/Pickup.tsx`: Giao diện quẹt thẻ gạt. Bấm xác nhận Lấy Hàng Tại Shop. Nó sẽ gọi API chuyển trạng thái từ `Mới tạo` -> `ĐÃ NHẬN HÀNG`.
* `pages/Delivery.tsx`: Giao diện Giao Hàng. Có nút chọn "Thành công" hoặc "Thất bại" (Ví dụ: Khách boom hàng). Nếu báo Thất Bại 3 lần, Backend sẽ tự đánh dấu rớt đài `is_return`.
* `pages/CodHistory.tsx`: Trang đối soát COD. Shipper tới Kế Toán nộp tiền mặt, rồi xem lịch sử đếm tiền tại trang này.

---

## 👑 5. FRONTEND - TRUNG TÂM ĐIỀU HÀNH (`admin/src/`)
Con mắt vạn dặm của Ban Lãnh Đạo.

* `pages/Dashboard.tsx`: Vẽ Doanh Thu Tiền Tỷ. Chỉ tính dựa trên Đơn Hàng Đã Thành Công.
* `pages/AdminEmployees.tsx`: Hệ thống Thêm mới/Phân Việc tài xế Shipper và Kiosk.
* `pages/Shops.tsx`: Admin xem trộm được thông tin Shop và Dòng tiền âm dương của Shop, can thiệp đóng băng nếu Shop nợ nần xấu.
* `pages/SystemMap.tsx`: Khảo sát Cây Định Tuyến (Sơ đồ Tuyến đường luân chuyển Bắc Nam gồm các Hub và Spoke).
* `pages/CustomerSupport.tsx`: Công cụ Modal kéo ngược của CSKH. Check thẳng xem đơn này vì sao kẹt (Bằng cách đọc lịch sử Logs). Bấm nút 'Hoàn Tiền/Đền Bù' để bồi thường thẳng vào Ví của Shop.
* `pages/Pricings.tsx`: Nơi Admin nhập các Ma trận Bảng Giá (VD: Nội tỉnh - Nhẹ -> 15k, Xuyên Miền - Nặng -> 100k). Backend hoàn toàn bốc giá tự động dựa trên Data từ trang này chứ không fix cứng.
