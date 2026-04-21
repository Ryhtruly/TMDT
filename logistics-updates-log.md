# Nhật Ký Cập Nhật Hệ Thống Logistics (T4/2026)

## 1. Luồng Logistics & Kho Bãi (Stockkeeper)
- **Cải tiến logic quét mã bao (Bagging):** Sửa lỗi kẹt trạng thái bao kiện. Khi rã bao ở Hub/Spoke đích (`scanInbound`), trạng thái bao hiện đã tự động được đánh dấu là `RECEIVED` để kết thúc vòng đời bao kiện.
- **Tự động hóa tiến trình Transit:** Khi quét xuất kho một bao kiện (`scanOutbound`), trạng thái của bao sẽ tự động chuyển sang `IN_TRANSIT`.
- **Tối ưu truy vấn gom bao:** Sửa câu lệnh SQL trong `getOrdersForBagging`, cho phép các đơn hàng đã từng nằm trong một bao cũ có thể tiếp tục được gom vào một bao mới cho chặng tiếp theo (loại bỏ lỗi "deadlock" khi chia chọn hàng).
- **Trạng Thái "Đang Hoàn":** Điều chỉnh logic luân chuyển kho (`scanOutbound`) để bóc tách chính xác cước hoàn (`is_return`) hoặc giao thất bại, giúp đơn hàng luân chuyển ngược tự động nẩy sang trạng thái `ĐANG HOÀN` thay vì sai lệch như trước.

## 2. Giao Diện & CSKH (Customer Support)
- **Phía Admin:** 
  - Tích hợp thêm component **Drawer Modal** cho bảng điều khiển Trung Tâm CSKH. 
  - Admin có thể nhấn xem chi tiết Phản hồi (Feedback) và Sự cố đền bù (Incident) với toàn văn nội dung mà không bị che khuất.
  - Hỗ trợ đổi trạng thái xử lý và trực tiếp ấn "Xác nhận đền bù" ngay trong Modal.
  - Chuyển `User ID` hiển thị cứng nhắc thành "Tên người dùng + Số điện thoại" trực quan.
- **Phía Shop (Client):** 
  - Giao diện Hỗ trợ nay đã cho phép các Shop tự xem danh sách lịch sử khiếu nại/gửi yêu cầu của chính mình thông qua API `GET /api/feedbacks/me` thay vì dữ liệu mockup cũ.

## 3. Trải Nghiệm Người Dùng (UI/UX) & Kiểu Chữ (Typography)
- **Đồng bộ hóa Font chữ:** Áp dụng hệ thống font chữ tiêu chuẩn `Inter` mới cho tất cả các phân hệ (Client, Admin, Mobile Shipper, Kiosk Stockkeeper) nhằm tăng độ hiện đại, chuyên nghiệp.
- **Việt hóa toàn diện:** Tìm kiếm và sửa hàng loạt (hơn 50+) chuỗi text mất dấu tiếng Việt trên cả Backend lẫn UI (VD: "Tao don" -> "Tạo đơn", "Khong tim thay" -> "Không tìm thấy", ...). Khôi phục luôn CSS của nút gắn nhãn cân nặng trong client.
- **Dọn dẹp mã nguồn:** Loại bỏ sổ lồng các file Script tạo data test ảo, check password/db dư thừa không còn cần thiết cho Production. Đồng bộ chính xác mã nguồn branch `main` và nhánh cá nhân (HuuTri).
