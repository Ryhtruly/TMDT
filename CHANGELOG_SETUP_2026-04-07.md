# Change Log
-
-- Thời gian cập nhật: `2026-04-07 13:01:09 +07:00`
-
-## Nội dung đã sửa
-
-- Sửa luồng tạo đơn của `client` để gọi đúng API backend bên `shop` thay vì dùng sai prefix.
-- Bổ sung cơ chế resolve `id_dest_area` từ địa chỉ người nhận trước khi preview phí và tạo đơn.
-- Thêm logic chuẩn hóa địa danh ở backend để map được các dạng tên như `Hà Nội` / `Thành phố Hà Nội`, `Q1` / `Quận 1`, `HCM` / `Hồ Chí Minh`.
-- Sửa cách suy ra khu vực/spoke phát hàng từ địa chỉ kho gửi của shop thay vì lấy spoke không chính xác.
-- Viết lại logic tính phí trong backend để dùng dữ liệu thực tế từ DB:
-  - `Nội tỉnh`
-  - `Liên Vùng`
-  - `Xuyên Miền`
-- Đồng bộ lại preview phí và tạo đơn để dùng cùng một hướng tính cước.
-- Sửa endpoint lấy danh sách `spokes` và thêm endpoint resolve `area` cho shop.
-
-## Kiểm tra đã thực hiện
-
-- Build thành công `webservice`.
-- Build thành công `client`.
-- Kiểm tra trực tiếp PostgreSQL DB `TMDT` với user `postgres`.
-- Test preview phí bằng dữ liệu thật:
-  - `Kho HCM_1 -> Quận 1, Hồ Chí Minh` ra `Nội tỉnh`
-  - `Kho HCM_1 -> Đống Đa, Hà Nội` ra `Xuyên Miền`
-
-## Ghi chú
-
-- Dữ liệu `areas` hiện vẫn còn rất ít, mới chỉ có một số quận/huyện mẫu.
-- Nếu địa chỉ nhận không nằm trong `areas` thì hệ thống vẫn sẽ không tạo đơn được.
-- Dữ liệu `pricing_rules` hiện có bản ghi trùng, chưa ảnh hưởng build nhưng nên dọn tiếp ở bước sau.


# Change Log

- Thoi gian cap nhat: `2026-04-07 14:27:47 +07:00`

## Noi dung da sua

np- Bo sung co che resolve `id_dest_area` tu dia chi nguoi nhan truoc khi preview phi va tao don.
- Them logic chuan hoa dia danh o backend de map duoc cac dang ten nhu `Ha Noi` / `Thanh pho Ha Noi`, `Q1` / `Quan 1`, `HCM` / `Ho Chi Minh`.
- Sua cach suy ra khu vuc/spoke phat hang tu dia chi kho gui cua shop thay vi lay spoke khong chinh xac.
- Viet lai logic tinh phi trong backend de dung du lieu thuc te tu DB:
  - `Noi tinh`
  - `Lien vung`
  - `Xuyen mien`
- Dong bo lai preview phi va tao don de dung cung mot huong tinh cuoc.
- Sua endpoint lay danh sach `spokes` va them endpoint resolve `area` cho shop.
- Them bootstrap schema trong `webservice` de tu dong dam bao DB co du cot/bang moi khi server khoi dong.
- Them `orders.payer_type` de ho tro nghiep vu `SENDER | RECEIVER`.
- Them `orders.shipper_reconciliation_id` va bang `shipper_cod_reconciliations` de luu phien nop COD/tien mat cua shipper.
- Sua preview/create order de:
  - `SENDER`: tru phi ngay tu vi shop
  - `RECEIVER`: khong tru vi shop luc tao don, shipper se thu tien khi giao
- Sua mobile dashboard va man `CODReconciliation` de dung API that, khong con `setTimeout` gia lap.
- Them API shipper `POST /shipper/cod-reconciliation` de ghi nhan nop tien va tru ngay khoi muc "tien dang giu".
- Sua ket qua giao hang thanh cong de tra ve tong tien shipper da thu tu khach (`COD` + phi nguoi nhan tra neu co).
- Sua bang don hang ben shop de hien tong phi tu `shipping_fee + insurance_fee`, khong con bi `NaN`.

## Kiem tra da thuc hien

- Build thanh cong `webservice`.
- Build thanh cong `client`.
- Build thanh cong `mobile`.
- Chay bootstrap schema thanh cong tren PostgreSQL `TMDT`.
- Kiem tra truc tiep DB thay da co:
  - `orders.payer_type`
  - `orders.shipper_reconciliation_id`
  - bang `shipper_cod_reconciliations`
- Test truc tiep `OrderService.previewFee(...)` voi `payer_type = RECEIVER`:
  - `id_store = 12`
  - `id_dest_area = 1`
  - `cod_amount = 50000`
  - `total_fee = 25500`
  - `sender_charge_now = 0`
  - `cash_to_collect_on_delivery = 75500`
- Test truc tiep `ShipperService.getCodSummary(5)` tren DB hien tai:
  - `total_cash_held = 0`
  - `recent_reconciliations = []`

## Ghi chu

- `SENDER` va `RECEIVER` hien da la logic that o backend, khong con la UI gia.
- Khi `RECEIVER` tra phi, shop khong bi tru vi luc tao don; shipper can thu them phan phi nay khi giao.
- Khi shipper bam nop tien o mobile, he thong se ghi nhan phien reconciliation va tru ngay cac don do khoi danh sach "tien dang giu".
- Du lieu `areas` hien van con it, nen dia chi nhan khong nam trong `areas` thi van khong tao duoc don.


# Change Log

- Thoi gian cap nhat: `2026-04-13 20:09:32 +07:00`

## Noi dung da sua

- Hoan thien flow shipper nop tien COD ve APP:
  - `POST /shipper/cod-reconciliation` tao phieu trang thai `CHO_XAC_NHAN`.
  - Admin phai xac nhan phieu bang `PUT /admin/shipper-cod-reconciliations/:id/confirm`.
  - Chi phieu da xac nhan moi duoc dung de payout COD cho shop.
- Hoan thien flow APP payout COD ve shop:
  - Them bang `cod_payout_items` de gan payout voi tung don hang.
  - Them cac cot `id_bank`, `net_amount`, `created_at`, `approved_at`, `approved_by`, `admin_note` cho `cod_payouts`.
  - Shop tao yeu cau payout qua `POST /cod/request`.
  - Admin xac nhan da chuyen tien qua `PUT /cod/:id/approve`.
- Sua man admin `Doi Soat COD` thanh 2 phan:
  - `Shipper nop tien`
  - `Payout cho shop`
- Sua man shop `COD va doi soat`:
  - Khong con goi nham `shop/wallet/withdraw`.
  - Hien COD du dieu kien, phi payout, so tien thuc nhan, lich su payout va ngan hang nhan tien.
- Cap nhat `Flow_explane.md` theo flow moi.

## Kiem tra da thuc hien

- Build thanh cong `webservice`.
- Build thanh cong `admin`.
- Build thanh cong `client`.
- Build thanh cong `mobile`.
- Chay migration schema truc tiep tren PostgreSQL `TMDT`.
- Kiem tra DB thay co:
  - `shipper_cod_reconciliations.confirmed_at`
  - `shipper_cod_reconciliations.confirmed_by`
  - `cod_payouts.id_bank`
  - `cod_payouts.net_amount`
  - `cod_payout_items`

## Ghi chu

- Hien tai co 2 phieu shipper dang `CHO_XAC_NHAN`, tong tien mat `772.000d`; admin can xac nhan truoc khi COD cua cac don do du dieu kien payout cho shop.
- Flow payout hien la admin duyet thu cong, chua co lich tu dong theo ngay/thu.


# Change Log

- Thoi gian cap nhat: `2026-04-14`

## Noi dung da sua

- Sua nut `Yeu Cau Payout COD` trong man shop de khong bi disable im lang khi shop chua co tai khoan ngan hang.
- Neu chua co ngan hang, he thong se bao ro COD duoc chuyen ve tai khoan ngan hang lien ket va mo form them ngan hang.
- Neu da co ngan hang, he thong mo modal xac nhan payout va tu chon ngan hang dau tien khi shop chi co 1 tai khoan.
- Them ghi chu tren UI: COD payout chuyen ve ngan hang, khong cong vao vi tra phi ship.

## Kiem tra da thuc hien

- Build thanh cong `client`.
- Kiem tra DB shop `HNSS`: hien chua co tai khoan ngan hang lien ket (`bank_count = 0`), nen day la ly do nut truoc do bam khong co phan hoi.


# Change Log

- Thoi gian cap nhat: `2026-04-14`

## Noi dung da sua

- Sua dieu kien lay COD du dieu kien payout de khong phu thuoc chuoi status tieng Viet co dau.
- Backend nay xac dinh COD du dieu kien dua tren:
  - don co `shipper_reconciliation_id`
  - phieu shipper reconciliation co `status = DA_XAC_NHAN`
  - don co `cod_amount > 0`
  - don chua nam trong payout khac

## Kiem tra da thuc hien

- Build thanh cong `webservice`.
- Build thanh cong `client`.
- Kiem tra DB don `QLKV0458471134`:
  - shop `HNSS`
  - COD `1.100.000d`
  - reconciliation `DA_XAC_NHAN`
  - chua nam trong payout
- Tao lai payout bi thieu cho shop `HNSS`:
  - `PAY-10`
  - `total_cod = 1.100.000d`
  - `service_fee = 5.500d`
  - `net_amount = 1.094.500d`
  - ngan hang `MB bank - 1122334455`
  - trang thai `CHO_DUYET`



Đã làm được, và hướng này chịu tải ổn hơn kiểu để shipper tự bốc đơn theo cả quận.

Mình đã thêm schema phân công theo phường vào DB và nối flow tự phát đơn:

bảng mới shipper_ward_assignments đã được tạo trong PostgreSQL
pickup giờ lọc theo spoke của kho gửi, rồi nếu có rule theo phường thì chỉ shipper đúng phường mới thấy đơn
khi đơn ra khỏi spoke đích, backend tự nhìn receiver_address để gán shipper theo phường -> quận -> spoke
delivery list giờ chỉ hiện đơn thuộc spoke của shipper, và đơn đang giao sẽ gắn với đúng current_shipper_id
dashboard mobile không còn suy ngược từ list cũ nữa, mà lấy summary đúng theo shipper
Phần scale lớn thì ổn vì rule hiện tại là:

ưu tiên match province + district + ward
nếu không có thì fallback match province + district với ward = NULL
nếu vẫn không có thì mới fallback về pool của spoke
nếu có nhiều shipper cùng một phường, hệ thống chọn theo priority trước, rồi tới shipper đang có ít đơn ĐANG GIAO hơn
Các file chính đã sửa:

ensureSchema.ts
location.ts
stockkeeper.repository.ts
stockkeeper.service.ts
shipper.repository.ts
shipper.service.ts
shipper.controller.ts
shipper.routes.ts
Dashboard.tsx
Build đã pass cho webservice và mobile, và schema đã migrate lên DB thật. Hiện còn một điểm quan trọng: chưa có màn admin để nhập rule theo phường, nên trước mắt bạn cần thêm dữ liệu trực tiếp vào bảng shipper_ward_assignments.





Hiện theo logic mình đã làm, nếu:

- `Shipper Quận 1` đã được phân `Phường Tân Định`
- `Shipper Quận 1 (2)` chỉ gán `spoke = Quận 1` nhưng **chưa có rule phường/quận** trong `shipper_ward_assignments`

thì với đơn giao đến `Phường Tân Định`:

- **shipper đã được phân đúng phường sẽ thấy đơn**
- shipper còn lại **không nên thấy đơn đó**, nếu đơn đã được assign theo phường thành công

Lý do:
- rule hiện tại là `phường` match trước
- nếu có match `phường`, backend chọn shipper đó
- chỉ khi **không có rule nào match** thì mới fallback về pool của cả spoke

Nói ngắn gọn:
- đã có rule phường -> không phải chuyện `priority thấp hơn thì vẫn thấy`
- mà là **shipper không được assign sẽ không thấy đơn**
- `priority` chỉ dùng khi **có nhiều rule cùng match một khu vực**, ví dụ 2 shipper cùng được phân `Phường Tân Định`

Khi đó:
- priority nhỏ hơn sẽ được ưu tiên trước
- nếu priority bằng nhau thì backend mới xét tải hiện tại của shipper

Vậy 3 case là:

1. Có 1 shipper match đúng phường
- chỉ shipper đó thấy đơn

2. Có 2 shipper cùng match đúng phường
- hệ thống chọn theo `priority`
- nếu bằng nhau thì chọn người đang ít đơn hơn

3. Không có shipper nào match phường/quận
- fallback về pool của cả spoke
- lúc đó các shipper trong spoke mới có thể thấy/nhận đơn

Nếu muốn, mình có thể sửa thêm một lớp an toàn nữa:
- shipper nào đã có rule phường thì chỉ thấy đúng vùng mình phụ trách
- shipper chưa có rule nào thì không được fallback thấy toàn spoke nữa
- hoặc chỉ admin mới bật `fallback spoke pool` khi thiếu người.

---

## Cap nhat 2026-04-14 01:36:56 +07:00 - Thanh toan phi ship bang tien mat

Noi dung da sua:

- Them `orders.fee_payment_method` de tach `WALLET` va `CASH`.
- Them bang `order_cash_collections` lam so cai tien mat cho tung don.
- Tao don gio co 3 flow tien:
  - shop tra phi bang vi: tru wallet ngay khi tao don
  - shop tra phi bang tien mat: shipper thu phi luc lay hang
  - nguoi nhan tra phi: shipper thu phi luc giao
- COD luon duoc ghi rieng thanh dong `COD` trong ledger.
- Shipper doi soat theo tong tien mat da thu: COD + phi ship/bao hiem tien mat.
- Payout cho shop chi lay cac dong `COD` da duoc admin xac nhan shipper da nop tien, khong payout phi ship.
- Backfill DB cho don cu co COD/phi nguoi nhan de khong mat du lieu doi soat.

Man hinh da cap nhat:

- Client tao don: them lua chon `Tru vi shop` hoac `Shop tra tien mat cho shipper khi lay hang`.
- Mobile shipper: doi thanh `Doi Soat Tien Mat`, hien ca COD va phi tien mat.
- Admin doi soat COD: cot phi doi thanh `Phi tien mat` de dung voi ca shop-tra-tien-mat va nguoi-nhan-tra-phi.

Kiem tra:

- `npm run build` thanh cong cho `webservice`, `client`, `mobile`, `admin`.
- Da chay `ensureSchema()` tren PostgreSQL va backfill ledger thanh cong.
Mình đã check DB trực tiếp:

- đơn `41` giao tới `Phường Tân Định`
- đơn `42` giao tới `Phường Đa Kao`
- nhưng **cả 2 đơn hiện vẫn ở trạng thái `CHỜ LẤY HÀNG`**
- và cùng lấy từ kho:
  - `KhoHCMSHOPHNSS`
  - địa chỉ `12, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh`

Nên ở giai đoạn này, app shipper đang xử lý **pickup từ shop**, không phải **last-mile giao cho người nhận**.

Flow code hiện tại là:

- `pickup` lọc theo **địa chỉ kho gửi** trong [shipper.service.ts](/D:/7%20-TMDT/TMDT/webservice/src/services/shipper.service.ts)
- cụ thể `getPickupList()` dùng `order.pickup_address`
- rồi match rule phân khu bằng `resolveAssignedShipperByAddress(..., order.pickup_address)`

Tức là với 2 đơn này:
- dù người nhận ở `Tân Định` và `Đa Kao`
- nhưng điểm lấy hàng đều ở `Bến Nghé`
- mà bạn **chưa phân khu pickup cho Bến Nghé**
- nên backend fallback về pool của cả `spoke Quận 1`
- vì vậy **cả 2 shipper Quận 1 đều thấy cả 2 đơn**

Kết luận:

- Nếu đơn đang `CHỜ LẤY HÀNG`: hiển thị theo **phường của shop/kho gửi**
- Nếu đơn đã tới spoke đích và ra giao cuối: hiển thị theo **phường người nhận**

Nên case của bạn hiện tại là:
- **đúng với logic đang code**
- nhưng nếu bạn muốn “mỗi shipper chỉ thấy đúng vùng mình phụ trách” cho cả pickup lẫn delivery, thì cần tách rõ 2 loại phân khu:

1. `pickup zone`
- theo địa chỉ shop/kho gửi
- ví dụ `Bến Nghé`

2. `delivery zone`
- theo địa chỉ người nhận
- ví dụ `Tân Định`, `Đa Kao`

Hiện mình đang dùng chung một bảng rule cho cả 2 nên:
- pickup nhìn theo địa chỉ kho
- delivery nhìn theo địa chỉ người nhận

Nếu muốn đúng nghiệp vụ hơn, bước tiếp theo nên là:
- tách rule thành `pickup` và `delivery`
- hoặc thêm cột `assignment_type = PICKUP | DELIVERY`

Nếu bạn muốn, mình có thể làm tiếp luôn phần đó.
