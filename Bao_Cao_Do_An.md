# BÁO CÁO ĐỒ ÁN: HỆ THỐNG QUẢN LÝ KHO VẬN (LOGISTICS & E-COMMERCE PLATFORM)

---

## MỞ ĐẦU

### 1. Đặt vấn đề
Trong bối cảnh Thương mại điện tử (E-commerce) phát triển bùng nổ, bài toán Logistics và quản lý kho vận trở thành yếu tố cốt lõi quyết định sự thành bại của chuỗi cung ứng. Nhu cầu về một hệ thống toàn diện giúp kết nối các chủ cửa hàng (Shop), nhân viên giao hàng (Shipper), nhân viên kho (Stockkeeper) và nhà quản trị (Admin) trên cùng một nền tảng số là vô cùng cấp thiết. Hệ thống không chỉ cần xử lý quy trình tạo đơn, điều phối tuyến đường mà còn phải đối soát dòng tiền (COD) một cách minh bạch và hiệu quả.

### 2. Mục tiêu đồ án
Đồ án hướng tới việc xây dựng một hệ thống Quản lý Kho Vận (TMDT Logistics) với kiến trúc hiện đại, khả năng mở rộng cao, phục vụ đa nền tảng và cung cấp trải nghiệm số hoá toàn diện cho tất cả các bên tham gia vào chuỗi giao hàng.

---

## KIẾN TRÚC HỆ THỐNG VÀ CÔNG NGHỆ ÁP DỤNG

### 1. Tổng quan Kiến trúc (Monorepo)
Hệ thống được thiết kế theo kiến trúc **Monorepo**, chia thành 4 phân hệ (module) chính hoạt động đồng bộ với nhau:
- **`webservice` (Backend):** Xử lý API, nghiệp vụ logic và tương tác cơ sở dữ liệu.
- **`client` (Frontend Web - Theo góc nhìn Shop):** Dành cho khách hàng/chủ shop quản lý và lên đơn.
- **`admin` (Frontend Web - Quản trị):** Dành cho Quản trị viên hệ thống để giám sát toàn cục hạ tầng.
- **`mobile` (Frontend Mobile Web - Vận hành):** Dành cho lực lượng Shipper và Thủ kho thao tác trực tiếp tại hiện trường.

### 2. Stack Công nghệ
- **Backend:** Node.js, Express.js 5, TypeScript.
- **Cơ sở dữ liệu:** PostgreSQL (truy vấn với `pg`).
- **Frontend / Mobile:** React 19, TypeScript, Vite, React Router, TailwindCSS/Vanilla CSS.
- **Trực quan hoá Dữ liệu:** Recharts, Three.js, `react-force-graph-3d` (Vẽ sơ đồ mạng lưới Hub-Spoke 3D).
- **Phần cứng Web:** Sử dụng `html5-qrcode` tích hợp quét mã vạch qua Webcam USB máy tính và Camera điện thoại.
- **Thanh toán:** Tích hợp cổng thanh toán **PayOS** (Nạp rút tiền tự động).
- **Bảo mật:** JWT (JSON Web Token), mã hoá mật khẩu Bcrypt.

---

## TÍNH NĂNG CHI TIẾT CÁC PHÂN HỆ

### 1. Phân hệ Backend (`webservice`)
Hệ thống xử lý lượng lớn dữ liệu trung tâm, cung cấp API RESTful với các tính năng:
- **Xác thực và Phân quyền:** Phân luồng đăng nhập dựa trên 4 Role chính (SHOP, SHIPPER, STOCKKEEPER, ADMIN).
- **Quản lý Đơn hàng (Order Lifecycle):** Xử lý toàn bộ vòng đời của một vận đơn: Tạo mới, Lấy hàng, Nhập kho/Xuất kho luân chuyển, Giao hàng, và Đối soát.
- **Thuật toán Tuyến đường & Bảng giá:** Xác định khu vực (vùng nội/ngoại thành) thông qua hạ tầng Hub/Spoke để tự động áp dụng Bảng giá (Pricing Rules).
- **Quản lý Tài chính (Ví điện tử - Wallet):** Cung cấp hệ thống Ví điện tử trừ tiền tự động khi Shop tạo đơn, cộng tiền COD đối soát, ghi nhận Lịch sử giao dịch (Transaction History) kèm khóa chống trùng lặp (Pessimistic Locking `FOR UPDATE`).
- **API Mở rộng:** Tích hợp Webhook kết nối cổng thanh toán PayOS.

### 2. Phân hệ Khách hàng (`client` - Shop)
- **Quản lý thông tin:** Thiết lập Cửa hàng (Stores), quản lý thông tin tài khoản ngân hàng liên kết, thiết lập Kho mặc định.
- **Tạo và Theo dõi Đơn hàng:** Tạo đơn hàng 1 phần hoặc hàng loạt. Lựa chọn loại dịch vụ, ca lấy hàng (pickup shift) và trạm gửi hàng (drop-off spoke).
- **Tra cứu hành trình (Tracking):** Tra cứu công khai hành trình vận chuyển theo thời gian thực (tracking logs).
- **Quản lý tài chính / Đối soát:** Theo dõi số dư ví, nạp tiền vào ví qua QR Code PayOS và yêu cầu rút tiền COD.

### 3. Phân hệ Quản trị viên (`admin`)
- **Dashboard Thống kê Tổng quan:** Phân tích doanh thu, số lượng đơn hàng, chi phí hoạt động bằng biểu đồ động.
- **Quản lý Hạ tầng Hub-Spoke 3D:** Hiển thị trực quan mạng lưới các bưu cục, kho phân loại theo mô hình mô phỏng 3D tương tác. Cho phép CRUD (Thêm, Sửa, Xoá) hạ tầng mạng lưới kho một cách trực quan.
- **Quản lý Nhân sự & Phân ca:** Cấp tài khoản và điều phối Shipper gán vào các trạm (Spoke), quản lý Thủ kho (Stockkeeper) thuộc Hub.
- **Quản trị dòng tiền (Payouts):** Kiểm duyệt và phê duyệt các yêu cầu rút tiền (Withdrawal requests) từ Shop.

### 4. Phân hệ Vận hành Thực địa (`mobile`)
- **Shipper Workspace:**
  - **Task Management:** Xem danh sách điểm cần lấy/giao hàng được tối ưu hóa.
  - **Quét Mã Vạch (Barcode Scanning):** Hỗ trợ nhận diện mã vận đơn siêu tốc bằng hệ thống Camera điện thoại hoặc External USB Webcams.
  - **Cập nhật Hành trình:** Xác nhận Đã Lấy (Pickup), Đã Giao (Delivered), hoặc Giao Thất Bại (Failed) kèm hình ảnh bằng chứng (Evidence Proof) đẩy trực tiếp vào database.
  - **Đối soát COD:** Bảng tổng kết số tiền COD đã thu cần nộp lại cho kho trong ca làm việc.
- **Stockkeeper Workspace:**
  - **Tracking Kho Bãi:** Xác nhận hàng nhập kho (Inbound) và xuất kho (Outbound) liên tỉnh.

---

## CƠ SỞ DỮ LIỆU & LOGIC NGHIỆP VỤ (DATABASE SCHEMA)
Core Schema của hệ thống xoay quanh hơn 15 bảng liên kết mạnh với PostgreSQL:

1. **Thực thể Người dùng (Authentication & Roles)**
   - `users`: Tài khoản cốt lõi và mật khẩu mã hóa.
   - Bảng phân hóa Role: `shops`, `shippers`, `stockkeepers`, `admin`.
   
2. **Thực thể Mạng lưới Hạ tầng (Topology)**
   - `hubs`: Trạm trung chuyển / Tổng kho cấp cao.
   - `spokes`: Bưu cục nhận hàng / giao hàng cấp thấp trực thuộc Hub.
   - `areas` (Tỉnh/Thành, Quận/Huyện) mapping về các `spokes` tương ứng để tìm đường ngắn nhất.

3. **Thực thể Vận Đơn & Lịch sử Hành trình (Order System)**
   - `orders`: Chứa trọng lượng, tiền thu hộ COD, tuyến đường, metadata của người nhận và người gửi.
   - `service_types` & `pricing_rules`: Cấu hình giá cước động dựa theo cân nặng (weight step) và loại liên kết vùng (Nội thành, Ngoại thành, Liên Tỉnh).
   - `order_logs`: Chứa Log hành trình thời gian thực (Status, Actor - Người cập nhật, Location - Trạm xử lý, Thời gian).

4. **Thực thể Tài chính (Finance)**
   - `wallets`: Lưu trữ số dư của Shop. Quản lý đồng bộ chặt chẽ với transaction.
   - `transaction_history`: Lưu vết MỌI sự thay đổi số dư (+ / -).

---

## BẢO MẬT & HIỆU NĂNG

1. **Phân quyền và Xác thực (Authentication):** Sử dụng `JWT` Token. Token được gắn kèm payload là ID người dùng và Role, verify qua Express Middleware trước khi chạm vào bất cứ logic database nào.
2. **Bảo toàn giao dịch (Data Integrity):** Toàn bộ thao tác thanh toán hay cập nhật phí giao hàng, trạng thái COD đều dùng tính năng Transaction (BEGIN...COMMIT...ROLLBACK) của Postgres. Sử dụng khoá bi quan (`FOR UPDATE`) để ngăn ngừa lỗi bất đồng bộ (Race Condition) trong thao tác ví tiền.
3. **Quản lý Biến Môi Trường (Environments):** Phân tách minh bạch cấu hình hệ thống bằng `.env`. Thông tin API Key hãng thanh toán, JWT Secret, cấu hình DB được giấu hoàn toàn khỏi mã nguồn version control.

---

## KẾT LUẬN

Hệ thống **TMDT Logistics** đã giải quyết trọn vẹn quy trình vận hành phức tạp của một đơn vị chuyển phát nhanh. Với sự kết hợp nền tảng công nghệ mạnh mẽ giữa Node.js, React ecosystem và PostgreSQL, đồ án đảm bảo tính thực tiễn cao, giao diện mượt mà theo thời gian thực, sẵn sàng mở rộng module nâng cao trong tương lai (Ví dụ: AI ước lượng thời gian giao hàng, Tối ưu lộ trình Machine Learning).
