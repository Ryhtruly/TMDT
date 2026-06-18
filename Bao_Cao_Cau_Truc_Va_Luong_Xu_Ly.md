# BÁO CÁO GIẢI MÃ KIẾN TRÚC MÃ NGUỒN VÀ LUỒNG XỬ LÝ (TMDT LOGISTICS)

Báo cáo này được biên soạn để giúp bạn (Chủ dự án) hiểu rõ tường tận từng ngóc ngách của hệ thống. Nó giải thích hệ thống được tổ chức như thế nào, mỗi file sinh ra để làm gì, và làm sao chúng nói chuyện được với nhau.

---

## PHẦN 1: TỔNG QUAN KIẾN TRÚC HỆ THỐNG
Dự án của chúng ta áp dụng mô hình **Client - Server (Micro-frontend)**. Cụ thể:
1. **1 Hầm chứa Dữ liệu (Backend / Webservice):** Nằm ở thư mục `webservice`. Chịu trách nhiệm chọc thẳng vào Database, tính toán logic bảo mật, trừ tiền, gom bao. Nó cung cấp các "Cửa" (API) để bên ngoài gọi vào.
2. **4 Ứng dụng Giao diện (Frontends):** Gồm `admin` (Cho giám đốc), `client` (Cho cửa hàng/shop), `mobile` (Cho tài xế Shipper), `stockkeeper` (Cho thủ kho). 4 ứng dụng này không biết Database là gì, chúng chỉ biết dùng kết nối mạng để "kêu cửa" Backend xin dữ liệu và hiển thị lên màn hình.

---

## PHẦN 2: GIẢI PHẪU BACKEND (Thư mục `webservice`)
Backend được viết bằng Node.js + TypeScript, tuân thủ chặt mô hình **3 Lớp (3-Layer Architecture)**. Tại sao phải chia 3 lớp? Để nếu sau này hệ thống phình to, code không bị rối nùi vào nhau.

### 1. Cấu trúc thư mục cốt lõi
* `src/config/`: Cấu hình kết nối (ví dụ `db.ts` nối với PostgreSQL).
* `src/routes/`: Lớp ngoài cùng, chứa các "Cánh cửa" URL.
* `src/controllers/`: Lớp tiếp tân, nhận yêu cầu từ "Cánh cửa", kiểm tra xem người ta gửi đủ thông tin chưa, rồi giao cho chuyên gia xử lý.
* `src/services/`: Lớp chuyên gia (Logic nghiệp vụ). Tính toán tiền bạc, mã hóa mật khẩu, kiểm tra điều kiện.
* `src/repositories/`: Lớp thủ kho. Chuyên gia sau khi tính xong sẽ gọi thủ kho. Lớp này chứa toàn bộ các câu lệnh SQL (`SELECT`, `INSERT`, `UPDATE`) để chọc vào Database.

### 2. Luồng đi của dữ liệu (Ví dụ: Thêm một Đơn Hàng Mới)
Hãy tưởng tượng Chủ Shop bấm nút "Tạo đơn":

**Bước 1: Frontend gọi API**
`client` gửi một cục dữ liệu (Tên, SĐT, Cước phí) bay lên mạng, nhắm vào địa chỉ `POST /api/shop/orders`.

**Bước 2: `routes/shop.routes.ts` (Người gác cổng)**
Nó thấy có người gọi vào url `/orders` bằng hàm POST. Nó bảo: *"À, muốn tạo đơn hàng, mời đi gặp anh Cảnh Sát (Middleware kiểm tra Token đăng nhập), rồi qua phòng anh Tiếp Tân Controller"*.

**Bước 3: `controllers/shop.controller.ts` (Nơi tiếp nhận)**
Hàm `createOrder` trong file này sẽ mở hộp dữ liệu ra xem: *"Ông này gửi lên Khối lượng 5kg, Giá tiền 35k"*. Nếu thiếu dữ liệu, nó chửi (Báo lỗi 400). Nếu đủ, nó gọi: *"Ê bộ phận Service, tính toán tạo đơn cho khách này giúp tao"*.

**Bước 4: `services/order.service.ts` (Bộ não chúa)**
Hàm này bắt đầu làm việc cực nhọc: 
- Lấy thông tin Shop.
- Gọi hệ thống trừ tiền ví (Wallet Debt) xem quỹ còn đủ trả cước phí không. Khóa Pessimistic Locking được áp dụng ở đây để giam tiền không bị âm quỹ.
- Tính toán tọa độ.
- Khi mọi logic điều kiện đã pass, nó nhờ anh Thủ Kho: *"Lưu cái đống này xuống Database hộ tao"*.

**Bước 5: `repositories/order.repository.ts` (Thủ Kho Thao Tác SQL)**
Trong file này, các lệnh SQL sẽ được bắn thẳng vào PostgreSQL:
`INSERT INTO orders (tracking_code, weight, ...) VALUES (...) RETURNING id;`
Sau khi nhép vào ổ cứng xong, nó báo lại cho Service: *"Xong rồi, mã ID của đơn này là 15"*.

**Bước 6: Trả về cho Khách**
Service báo lại cho Controller, Controller sút 1 quả tin nhắn báo cáo `status: 'success'` và cục Data trả về Frontend `client`. Màn hình chủ Shop hiện lên thông báo xanh lá cây: "Tạo đơn thành công!".

---

## PHẦN 3: GIẢI PHẪU CÁC FLOW (LUỒNG) ĐẶC BIỆT CHÚNG TA ĐÃ LÀM

### 1. Luồng Thanh Toán Mã QR (PayOS Webhook Flow)
Bạn nhớ lúc Shop nạp tiền chứ? 
- Shop bấm nạp 50k, `client` hiện ra cái mã QR.
- Khi khách dùng App ngân hàng quét mã và chuyển khoản 50k thành công, máy chủ của PayOS sẽ ngầm kích hoạt gửi một hóa đơn tới `webservice`.
- **Luồng file:** Cửa `routes/general.routes.ts` nhận một cú POST từ PayOS -> Nó chuyển qua `controllers/webhook.controller.ts`. Thằng này xác minh chữ ký bảo mật xem có đúng mặt PayOS không (chống hacker làm giả) -> Truyền qua `services/payment.service.ts`. Thằng này lấy ID ví Shop, gọi lệnh SQL (`repositories`) cộng 50 cành vào trong DB. Ngay lúc đó, Shop f5 lại sẽ thấy tiền nhảy số.

### 2. Luồng Thuật Toán Kho Bãi (Bagging Flow)
Đây là cái thứ làm bạn tự hào nhất trong hệ thống Logistic.
Kiosk ở kho Hub sẽ gom 100 cái đơn nhỏ (`orders`) bỏ chung vào một cái bao (`bags`). 
- Khi bao này rời kho, `webservice` gọi tới `repositories/routing.repository.ts` và gạt trạng thái của CÁI BAO lên thành `IN_TRANSIT`.
- Lúc này, 100 đơn nhỏ bên trong tự động bị hệ thống ép thành `IN_TRANSIT` theo (nhờ các lệnh UPDATE UPDATE lồng nhau trong Repository).
- Khi bao tới chặng cuối (Trạm đích), Kiosk quét mã rã bao. `controllers/stockkeeper.controller.ts` chọc vào `services` -> gọi SQL gỡ khóa liên kết. 100 đơn nhỏ kia lập tức được trả tự do, gán cờ `RECEIVED` và sẵn sàng vứt cho Shipper đi phát. Mọi thứ mượt mà, không bao giờ kẹt trạng thái (Deadlock).

---

## PHẦN 4: GIẢI PHẪU FRONTEND (CÁC ỨNG DỤNG REACT)

Cả 4 nhánh `client`, `admin`, `mobile`, `stockkeeper` đều tuân theo chuẩn ReactJS (Vite).

### 1. Cấu trúc thư mục chung
* `src/api/client.ts`: File huyết mạch quan trọng nhất. Đây là khẩu súng bắn API. Nó luôn gắn kèm chữ `http://localhost:3000/api` để nhắm vào Backend. Sau này Deploy lên mạng, chỉ cần đổi dòng cục mịch này thành `https://abc-cloud.com/api` là xong. Nó tự động nhét cái thẻ Tín Căn (JWT Token) vào header cúa mỗi lượt gọi.
* `src/components/`: Những mảnh xếp hình Lego. Ví dụ: `Sidebar.tsx` (Menu trái), `Header.tsx` (Menu trên). Chỗ nào xài thì bưng Lego qua gắn vào, không phải code lại nhiều lần.
* `src/pages/`: Các trang lớn hiển thị. Ví dụ: `pages/shop/Dashboard.tsx` (Màn hình chính của Shop).
* `src/App.tsx`: Sơ đồ bản đồ. Quy định Màn hình Login thì vô đường link nào, Màn hình Trang chủ thì vô đường link nào. 

### 2. Luồng hiển thị dữ liệu (Ví dụ: Danh sách đơn hàng)
Shop bấm vào tab "Đơn Hàng":
- Biến **State** trong hệ thống React (ví dụ `const [orders, setOrders] = useState([])`) sẽ mang giá trị rỗng trước tiên. Màn hình hiện chữ "Đang tải...".
- Hàm `useEffect()` sẽ chạy ngay tập tức khi trang vừa tải lên. Nó kêu khẩu súng `api/client.ts` bắn một phát lấy dữ liệu bằng lệnh: `await apiClient.get('/shop/orders')`.
- Chờ backend chui hầm múc dữ liệu, khi Backend trả về danh sách 10 đơn hàng (Dạng mảng JSON). 
- Front-end lấy Cục JSON đó, nhét vào `setOrders(data)`.
- Đoạn mã HTML ở phía dưới (Lệnh `.map()`) sẽ lặp qua mảng JSON đó, vẽ lên màn hình 10 cái dòng Bàn, Cột, Mã Vận Đơn màu mè xinh đẹp bằng thẻ `<tr> <td>`.
- React dùng file thư viện CSS để sơn phết font chữ `Inter` sang trọng lên.

---
## TỔNG KẾT BẰNG 1 CÂU
> Toàn bộ hệ thống là một đường ống.
> Khách hàng kéo **Component (Frontend)** -> Dây dợ gọi tới **API Client (Frontend)** -> Bắn tín hiệu sang **Router (Backend)** -> Đi qua trạm gác **Controller (Backend)** -> Được nhào nặn chế biến tại **Service (Backend)** -> Ghi vào sổ sách nhờ **Repository (Backend)** chứa lệnh SQL -> Đưa tận gốc vào **Database (PostgreSQL)**. 
> Sau đó lại vòng lên trả kết quả về màn hình hiển thị để mọi người vui vẻ!
