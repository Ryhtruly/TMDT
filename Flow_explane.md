# Flow Explain

- Cap nhat luc: `2026-04-14 01:36:56 +07:00`

## 1. Flow shipper nop tien COD ve APP

Muc dich: kiem tra shipper co nop du tien mat da thu tu khach hay chua.

Flow hien tai sau khi sua:

- Shipper giao thanh cong don hang.
- Neu don co `cod_amount`, shipper dang giu tien COD cua shop.
- Neu don co `payer_type = RECEIVER`, shipper giu them `shipping_fee + insurance_fee` do nguoi nhan tra.
- Mobile shipper vao man `Doi Soat COD`, he thong tong hop cac don chua nop tien.
- Shipper bam xac nhan nop tien, backend tao phieu `shipper_cod_reconciliations` voi trang thai `CHO_XAC_NHAN`.
- Cac dong tien mat da thu trong `order_cash_collections` duoc gan `reconciliation_id`, nen khong con hien trong "tien dang giu" cua shipper.
- `orders.shipper_reconciliation_id` chi con la cot lien ket phu/legacy, khong con la nguon duy nhat de tinh payout.
- Admin vao man `Doi Soat COD -> Shipper nop tien`, kiem tien thuc te va bam `Xac nhan da thu`.
- Khi admin xac nhan, phieu doi sang `DA_XAC_NHAN`.

Bang chinh:

- `shipper_cod_reconciliations`
- `orders.shipper_reconciliation_id`
- `delivery_attempts`

API chinh:

- Mobile: `GET /shipper/cod-summary`
- Mobile: `POST /shipper/cod-reconciliation`
- Admin: `GET /admin/shipper-cod-reconciliations`
- Admin: `PUT /admin/shipper-cod-reconciliations/:id/confirm`

## 2. Flow APP payout COD ve shop

Muc dich: tra tien COD cua shop ve tai khoan ngan hang sau khi APP da that su thu tien tu shipper.

Flow hien tai sau khi sua:

- Don hang phai o trang thai `GIAO THANH CONG`.
- Don phai co `cod_amount > 0`.
- Don phai co dong ledger `order_cash_collections.collection_type = COD`.
- Dong COD phai co `reconciliation_id`.
- Phieu shipper tuong ung cua dong COD phai co trang thai `DA_XAC_NHAN`.
- Don chua tung nam trong `cod_payout_items`.
- Shop vao man `COD va doi soat`, xem tong COD du dieu kien.
- Shop chon tai khoan ngan hang va bam `Yeu cau Payout COD`.
- Backend tao `cod_payouts` trang thai `CHO_DUYET` va tao cac dong `cod_payout_items`.
- Admin vao `Doi Soat COD -> Payout cho shop`, kiem tra va bam `Xac nhan chuyen`.
- Payout doi sang `DA_CHUYEN`, co `approved_at`, `approved_by`.

Bang chinh:

- `cod_payouts`
- `cod_payout_items`
- `bank_accounts`

API chinh:

- Shop: `GET /cod/my-payouts`
- Shop: `POST /cod/request`
- Admin: `GET /cod/payouts`
- Admin: `PUT /cod/:id/approve`

## 3. Quy tac tien

- `payer_type = SENDER`: shop bi tru phi ship/bao hiem tu vi khi tao don.
- `payer_type = RECEIVER`: shop khong bi tru phi khi tao don, shipper thu phi ship/bao hiem tu nguoi nhan khi giao.
- `cod_amount`: tien hang cua shop, shipper thu tu nguoi nhan khi giao thanh cong.
- Shipper nop ve APP: `cod_amount + receiver_fee_amount`.
- APP payout ve shop: chi payout `cod_amount`.
- Phi payout mac dinh: `5.500d/lần`, tru vao tong COD payout, nen `net_amount = total_cod - service_fee`.
- Phan `receiver_fee_amount` la doanh thu phi van chuyen cua APP, khong tra ve shop.

## 4. Man hinh admin

Trang `admin / Doi Soat COD` hien da gom 2 phan:

- `Shipper nop tien`: admin xac nhan tien mat shipper da nop ve APP.
- `Payout cho shop`: admin xac nhan APP da chuyen tien COD ve ngan hang shop.

Day la thay doi quan trong so voi ban cu. Ban cu chi co payout shop va shipper tu bam nop la coi nhu xong, khong co buoc admin xac nhan tien that.

## 5. Man hinh shop

Trang `client / COD va doi soat` hien da tach ro:

- So du vi tra phi ship.
- COD du dieu kien payout.
- Danh sach don COD du dieu kien.
- Lich su payout COD.
- Tai khoan ngan hang thu huong.

Nut payout khong con goi nham `shop/wallet/withdraw`. No goi dung `POST /cod/request`.

## 6. Gioi han hien tai

- Payout dang la flow admin duyet thu cong, chua co cron tu dong theo lich.
- Chua co flow "admin tu choi" phieu shipper hoac payout shop.
- Chua co bang luu bang chung anh/ma bien nhan khi admin nhan tien mat.
- Cac payout seed cu trong DB da duoc chuan hoa trang thai, nhung khong co `cod_payout_items` chi tiet vi la du lieu mau cu.

## 7. Cap nhat flow thanh toan phi ship tien mat

Muc dich: cho shop chon tra phi ship bang vi hoac bang tien mat, nhung doi soat van dung tien that shipper dang giu.

Quy tac moi:

- `payer_type = SENDER` va `fee_payment_method = WALLET`: shop bi tru `shipping_fee + insurance_fee` tu vi ngay khi tao don.
- `payer_type = SENDER` va `fee_payment_method = CASH`: shop khong bi tru vi, shipper thu `shipping_fee + insurance_fee` tu shop luc lay hang.
- `payer_type = RECEIVER`: `fee_payment_method` duoc ep ve `CASH`, shipper thu `shipping_fee + insurance_fee` tu nguoi nhan luc giao.
- Neu co `cod_amount`, COD luon la tien cua shop ma shipper thu tu nguoi nhan luc giao thanh cong.
- Shipper nop ve APP = tat ca tien mat da thu: COD + phi shop tra tien mat + phi nguoi nhan tra tien mat.
- APP payout ve shop = chi dong `COD` da duoc admin xac nhan, khong payout phi ship.

Bang moi/bo sung:

- `orders.fee_payment_method`: `WALLET` hoac `CASH`.
- `order_cash_collections`: so cai cac khoan tien mat can thu/da thu theo tung don.
- Moi dong ledger co `collection_type`, `payer_party`, `collection_stage`, `expected_amount`, `collected_amount`, `collected_by_shipper`, `reconciliation_id`.

Flow tao don:

- Client gui them `fee_payment_method`.
- Backend tao order va sinh cac dong `order_cash_collections` tu dau.
- Neu shop tra vi, backend tru vi va khong tao dong tien mat phi ship.
- Neu shop tra tien mat, backend tao dong `SHIPPING_FEE/INSURANCE_FEE` o stage `PICKUP`.
- Neu nguoi nhan tra phi, backend tao dong `SHIPPING_FEE/INSURANCE_FEE` o stage `DELIVERY`.
- Neu co COD, backend tao dong `COD` o stage `DELIVERY`.

Flow shipper:

- Khi shipper xac nhan lay hang, backend mark cac dong `PICKUP` la da thu.
- Khi shipper giao thanh cong, backend mark cac dong `DELIVERY` la da thu.
- Man mobile `Doi Soat Tien Mat` hien tong tien mat shipper chua nop, gom COD va moi loai phi thu tien mat.
- Khi shipper nop tien, backend tao `shipper_cod_reconciliations` va gan `reconciliation_id` vao cac dong ledger da thu.

Flow payout shop:

- Shop chi thay COD du dieu kien payout khi dong ledger `collection_type = COD` da co `reconciliation_id`.
- Phieu shipper tuong ung phai duoc admin xac nhan `DA_XAC_NHAN`.
- Neu order chi moi thu phi ship tien mat luc lay hang nhung chua giao/COD chua thu, shop chua the payout COD.
