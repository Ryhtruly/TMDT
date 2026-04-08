# Flow Explain

## 1. `Đối Soát COD` trong giao diện admin đang làm gì

Trang này hiện là luồng `thanh toán COD cho shop`, không phải luồng kiểm tra shipper đã nộp đủ tiền cuối ngày.

- File giao diện: `admin/src/pages/Payouts.tsx`
- Route admin: `/payouts`
- API dùng:
  - `GET /cod/pending`
  - `PUT /cod/:id/approve`
- Backend:
  - `webservice/src/routes/general.routes.ts`
  - `webservice/src/services/general.service.ts`
  - `webservice/src/repositories/general.repository.ts`
- Bảng dữ liệu chính: `cod_payouts`

Ý nghĩa nghiệp vụ hiện tại:

- Shop gửi yêu cầu đối soát COD qua `POST /cod/request`
- Hệ thống tạo một phiên `cod_payouts` với trạng thái `CHỜ DUYỆT`
- Admin vào trang `Đối Soát COD` để xem danh sách chờ duyệt
- Khi admin bấm `Duyệt`, backend chỉ đổi trạng thái payout sang `ĐÃ CHUYỂN`

Kết luận:

- Đây là màn `admin duyệt chi tiền COD cho shop`
- Không phải màn `đối chiếu shipper đã nộp đủ tiền của một ca/ngày giao`

## 2. Phần kiểm tra shipper đã trả full tiền của 1 ngày giao hàng nằm ở đâu

Hiện tại phần này nằm ở `mobile + backend shipper`, chưa có màn admin riêng để duyệt/kiểm tra.

### Phía shipper

- File giao diện: `mobile/src/pages/CODReconciliation.tsx`
- API:
  - `GET /shipper/cod-summary`
  - `POST /shipper/cod-reconciliation`
- Route backend:
  - `webservice/src/routes/shipper.routes.ts`
- Logic:
  - `webservice/src/services/shipper.service.ts`
  - `webservice/src/repositories/shipper.repository.ts`

### Cách flow đang chạy

- Sau khi shipper giao thành công:
  - nếu đơn có `COD`, shipper đang giữ tiền COD
  - nếu đơn có `payer_type = RECEIVER`, shipper còn giữ thêm cả phí ship/phí bảo hiểm thu từ người nhận
- Màn `CODReconciliation` trên mobile sẽ tổng hợp:
  - `total_cod`
  - `total_receiver_fee`
  - `total_cash_held`
  - danh sách các đơn chưa nộp tiền
- Khi shipper bấm xác nhận nộp tiền:
  - backend tạo bản ghi trong bảng `shipper_cod_reconciliations`
  - cập nhật `orders.shipper_reconciliation_id`
  - từ đó các đơn này không còn nằm trong mục `tiền đang giữ`

### Điểm quan trọng

Hiện tại admin **chưa có** một trang riêng để:

- xem danh sách các phiên `shipper_cod_reconciliations`
- kiểm tra shipper đã nộp đủ tiền theo ngày/ca
- so sánh số phải nộp với số thực nộp
- xác nhận thủ kho/admin đã nhận tiền

Tức là:

- `Shop COD payout`: có màn admin
- `Shipper nộp tiền cuối ca/ngày`: mới có phía shipper và backend, chưa có màn admin chuyên dụng

## 3. `Quản lý nhân sự` đang làm gì

Trang này là quản lý tài khoản nhân viên và phân quyền vận hành.

- File giao diện: `admin/src/pages/Employees.tsx`
- Route admin: `/employees`
- API chính:
  - `GET /admin/employees`
  - `POST /admin/employees`
  - `PUT /admin/employees/:id/deactivate`
  - `POST /admin/user-roles`
  - `DELETE /admin/user-roles`

### Chức năng hiện có

- Xem danh sách nhân viên
- Tìm kiếm theo tên, email, số điện thoại, role
- Tạo mới nhân sự:
  - tạo `users`
  - gán `user_roles`
  - tạo hồ sơ `employees`
  - tạo phân công `employee_assignments`
- Khóa tài khoản nhân viên
- Cấp thêm role hoặc tước role

### Ý nghĩa của `Hub / Spoke`

- Nhân viên có thể được gán vào `hub` hoặc `spoke`
- Với `shipper`, hệ thống thực tế cần `id_spoke`
- Với `stockkeeper`, có thể làm việc ở `hub` hoặc `spoke` tùy phân công

### Bảng dữ liệu liên quan

- `users`
- `user_roles`
- `employees`
- `employee_assignments`

## 4. `Kiểm toán và lương` là gì

Trang này gom 2 khối khác nhau:

- `Quyết toán lương shipper`
- `Nhật ký kiểm toán`

- File giao diện: `admin/src/pages/AuditAndSalary.tsx`
- Route admin: `/audit-salary`

### 4.1. Quyết toán lương shipper

API:

- `POST /admin/shipper-salary`

Backend:

- `webservice/src/services/general.service.ts`
- `webservice/src/repositories/general.repository.ts`

Ý nghĩa hiện tại:

- Admin nhập `id shipper` và `tháng`
- Hệ thống tính:
  - `lương cứng`
  - `hoa hồng theo số đơn giao thành công`
  - `phạt`
- Sau đó ghi vào bảng `shipper_incomes`

Theo code hiện tại:

- `base_salary` đang nhập cứng từ UI là `5,000,000`
- `penalty` hiện đang để `0`
- `hoa hồng` tính theo bậc số đơn thành công trong tháng

Nói ngắn gọn:

- Đây là màn `chốt lương shipper`
- Chưa phải hệ thống payroll hoàn chỉnh nhiều rule

### 4.2. Nhật ký kiểm toán

API:

- `GET /admin/audit-log`

Bảng dữ liệu:

- `audit_log`

Ý nghĩa:

- lưu các hành động quản trị/hệ thống
- theo dõi ai đã tạo, sửa, cập nhật dữ liệu gì
- hỗ trợ truy vết khi có sai lệch vận hành hoặc tài chính

Trang này hiện hiển thị:

- `action`
- `object_type`
- `id_actor`
- `payload_json`
- `created_at`

## 5. Tổng kết thực trạng toàn flow

### Đã có

- Admin duyệt payout COD cho shop
- Shipper xem tiền đang giữ và tự xác nhận nộp tiền
- Quản lý nhân sự và phân quyền
- Quyết toán lương shipper cơ bản
- Audit log cơ bản

### Chưa có hoặc chưa hoàn chỉnh

- Chưa có màn admin riêng để kiểm tra shipper đã nộp đủ tiền theo ngày/ca
- Chưa có bước admin/thủ kho xác nhận thực thu cho từng phiên `shipper_cod_reconciliations`
- Trang `Đối Soát COD` hiện chưa phải là đối soát shipper, mà là payout cho shop
- Màn `Quyết toán lương` còn khá cơ bản, chưa gắn sâu với đối soát COD hay công nợ thực tế

## 6. Kết luận ngắn

Nếu nhìn đúng theo toàn bộ project hiện tại:

- `Đối Soát COD` bên admin = `chi tiền COD cho shop`
- `Shipper đã nộp đủ tiền chưa` = hiện xem được ở flow shipper/mobile + backend, nhưng chưa có màn admin quản trị riêng
- `Quản lý nhân sự` = quản lý tài khoản, role, hồ sơ, nơi làm việc hub/spoke
- `Kiểm toán và lương` = xem audit log và chốt lương shipper theo công thức cơ bản
