# Tom Tat Phi De Hoc Van Dap

## 1. He thong hien co nhung loai phi nao?

- `shipping_fee`: phi van chuyen chinh.
- `insurance_fee`: phi bao hiem hang hoa.
- `return_fee`: phi hoan hang ve shop.
- `COD service fee`: phi chuyen tien COD cho shop khi shop rut COD ve ngan hang.
- Ngoai ra con co `promotion discount` giam vao phi ship.

## 2. Phi ship duoc tinh nhu nao?

Cong thuc tong quat:

`shipping_fee = baseFee theo bang gia x serviceMultiplier`

Trong do `baseFee` phu thuoc vao:

- `pricing_route_type`: Noi tinh / Lien Vung / Xuyen Mien
- `area_type`: Noi thanh / Ngoai thanh
- `goods_type`: LIGHT / HEAVY
- `billable_weight`: khoi luong tinh cuoc

## 3. Billable weight la gi?

He thong khong chi nhin can nang thuc.

No tinh:

- `volumetric weight = ceil(length x width x height / 6000)`
- `billable_weight = max(weight thuc, volumetric weight)`

Y nghia:

- Neu hang to, cong kenh, du can nang thuc nhe thi van co the bi tinh phi cao hon do can quy doi.
- Neu can thuc lon hon can quy doi thi tinh theo can thuc.

## 4. Khoi luong co anh huong den phi ship khong?

Co, anh huong rat ro.

- Hang `LIGHT`: tinh theo bac can, mac dinh moc co so la `500g`.
- Hang `HEAVY`: tinh theo bac can, mac dinh moc co so la `20000g` (20kg).
- Neu qua moc co so thi cong them tien moi buoc can.
- `LIGHT` tang theo buoc `500g`.
- `HEAVY` tang theo buoc `1000g`.

Noi ngan gon:

- Cang nang thi phi ship cang tang.
- Hang nang va hang nhe co bang gia khac nhau.

## 5. Di cac noi khac nhau thi phi co khac nhau khong?

Co.

He thong chia nhom de tinh phi:

- `Noi tinh`: cung tinh/thanh
- `Lien Vung`: khac tinh nhung cung vung, hoac cung hub
- `Xuyen Mien`: khac mien

Ngoai ra con tach:

- `Noi thanh`
- `Ngoai thanh`

Nen phi ship khac nhau theo:

- noi giao xa hay gan
- noi thanh hay ngoai thanh
- hang nhe hay hang nang

## 6. Dich vu giao hang co anh huong den phi khong?

Co.

He thong lay `base_multiplier` cua `service_types` de nhan vao phi co ban.

Noi ngan gon:

- cung 1 don, neu chon dich vu nhanh hon/khac loai thi phi co the cao hon
- phi cuoi = phi co ban x he so dich vu

## 7. Phi bao hiem tinh nhu nao?

He thong tinh:

- Neu `item_value <= 1.000.000` -> `insurance_fee = 0`
- Neu `item_value > 1.000.000` -> `insurance_fee = 0.5% gia tri hang`

Cong thuc:

`insurance_fee = round(item_value x 0.005)`

## 8. Tong phi don hang la gi?

`total_fee = shipping_fee + insurance_fee`

## 9. Ai tra phi?

He thong co 2 bien:

- `payer_type`
  - `SENDER`: shop tra
  - `RECEIVER`: nguoi nhan tra
- `fee_payment_method`
  - `WALLET`: tru vi shop luc tao don
  - `CASH`: shipper thu tien mat

Luong thanh toan:

- `SENDER + WALLET`: tru vi shop ngay khi tao don
- `SENDER + CASH`: shipper thu phi tu shop luc lay hang
- `RECEIVER`: nguoi nhan tra phi luc giao hang, he thong ep `fee_payment_method = CASH`

## 10. COD co lien quan gi den phi?

`cod_amount` khong phai phi ship. Day la tien thu ho tu nguoi nhan.

Nhung COD anh huong den dong tien:

- Neu nguoi nhan tra phi ship, shipper se thu:
  - `COD + shipping_fee + insurance_fee`
- Neu shop tra phi roi thi shipper chi thu `COD`

## 11. Phi hoan hang tinh nhu nao?

He thong hien co luong hoan hang.

Shop duoc yeu cau hoan hang khi don dang:

- `GIAO THAT BAI`
- hoac `TAI KHO`

Cong thuc phi hoan hien tai:

- Hang nhe (`weight < 20kg`): `return_fee = 50% shipping_fee`
- Hang nang (`weight >= 20kg`): `return_fee = 100% shipping_fee`

Noi ngan gon:

- hang nhe: hoan ve mat 1 nua phi ship goc
- hang nang: hoan ve mat toan bo phi ship goc

## 12. Phi hoan hang co phu thuoc noi tinh / lien vung / xuyen mien khong?

Trong code hien tai:

- He thong co `resolveReturnRouteType()` de xac dinh `DIRECT / INTRA_HUB / INTER_HUB`
- Nhung `return_fee` thuc te **chua** tinh theo route type
- No dang tinh dua tren:
  - `shipping_fee goc`
  - va `hang nhe / hang nang`

Day la diem de nho neu bi hoi sau:

- `route_type co xac dinh`
- `nhung cong thuc phi hoan hien tai van la 50% hoac 100% shipping_fee goc`

## 13. Huy don co hoan phi khong?

Co, nhung chi trong mot so truong hop.

Chi duoc huy khi:

- don dang `CHO LAY HANG`

Tien duoc hoan ve vi chi khi:

- `payer_type = SENDER`
- va `fee_payment_method = WALLET`

Luc do hoan:

- `shipping_fee + insurance_fee`

Neu:

- shop tra bang tien mat
- hoac nguoi nhan tra phi

thi shop chua bi tru vi, nen khong co tien de hoan ve vi.

## 14. Phi chuyen tien COD tinh nhu nao?

Khi shop rut COD ve ngan hang:

- he thong thu phi co dinh `5.500d`

Dieu kien:

- tong COD du dieu kien rut phai lon hon `5.500d`

Tien thuc nhan:

- `net_amount = total_cod - 5.500d`

## 15. Khuyen mai anh huong den phi nhu nao?

Khuyen mai ap vao `shipping_fee`.

He thong ho tro:

- giam theo `%`
- hoac giam so tien co dinh

Sau do:

- co the bi gioi han boi `max_discount`
- phi cuoi khong am

## 16. Cau tra loi ngan gon de van dap

Neu bi hoi "phi ship tinh theo gi?" thi tra loi:

> Phi ship tinh theo bang gia cau hinh, dua tren loai tuyen (noi tinh/lien vung/xuyen mien), khu vuc noi thanh hay ngoai thanh, loai hang nhe hay nang, khoi luong tinh cuoc, va he so cua loai dich vu.

Neu bi hoi "khoi luong co anh huong khong?" thi tra loi:

> Co. He thong lay max giua can nang thuc va can quy doi theo kich thuoc, sau do tinh theo bac can. Hang nang va hang nhe co bang gia khac nhau.

Neu bi hoi "phi hoan tinh sao?" thi tra loi:

> Hien tai phi hoan tinh theo phi ship goc: hang nhe thu 50%, hang nang thu 100%. Shop chi duoc yeu cau hoan khi don giao that bai hoac dang nam tai kho.
