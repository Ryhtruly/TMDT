# Luong hoat dong project TMDT - ban de hoc

File nay chi dung de nam luong tong quat, khong di sau vao code.

## 1. Nho nhanh ca project

Project nay la mot he thong logistics, chia thanh 5 phan lon:

| Thu muc | Vai tro de nho |
|---|---|
| `webservice/` | Backend. Noi nhan API, xu ly nghiep vu, noi chuyen voi database PostgreSQL. |
| `client/` | Frontend cho Shop. Shop dang ky, dang nhap, tao don, xem don, vi tien, COD. |
| `admin/` | Frontend cho Admin. Quan ly toan he thong: nhan vien, shop, don, hub/spoke, tuyen, COD, cau hinh. |
| `mobile/` | Frontend cho Shipper. Xem viec, quet don, lay hang, giao hang, nop COD, xem thu nhap. |
| `stockkeeper/` | Frontend cho thu kho. Quet nhap kho, xuat kho, gom bao, xem ton kho. |

Nho cau nay:

> 4 frontend rieng biet cung goi ve 1 backend `webservice`.

## 2. Chay app thi nho cong nao

| App | Cong mac dinh | Nhiem vu |
|---|---:|---|
| Backend `webservice` | `3000` | Noi cap API |
| Shop `client` | `5173` | Web cua shop |
| Admin `admin` | `5174` | Web quan tri |
| Shipper `mobile` | `5175` | Web mobile cho shipper |
| Thu kho `stockkeeper` | `5176` | Web kho |

Frontend khong tu lam viec voi database. Frontend chi hien giao dien va goi API.

Backend moi la noi xu ly va ghi/doc database.

## 3. Cau than chu cua luong

Hay hoc thuoc cau nay:

> Man hinh frontend -> file API client -> backend `index.ts` -> routes -> controller -> service -> repository -> database -> tra ket qua nguoc lai frontend.

Giai thich ngan gon:

| Tang | Nho nhu the nao | Vi tri file |
|---|---|---|
| Man hinh | Noi nguoi dung bam nut, nhap form, xem du lieu | `client/src/pages/...`, `admin/src/pages/...`, `mobile/src/pages/...`, `stockkeeper/src/pages/...` |
| API client | "Ong day dien thoai" de frontend goi backend | `src/api/client.ts` trong tung frontend |
| Backend index | Cong chinh cua backend, gan cac nhom API | `webservice/src/index.ts` |
| Routes | Chia cua API theo nhom: auth, shop, admin, shipper... | `webservice/src/routes/...` |
| Controller | Nhan request tu route, goi service, tra response | `webservice/src/controllers/...` |
| Service | Noi xu ly nghiep vu chinh | `webservice/src/services/...` |
| Repository | Noi doc/ghi database | `webservice/src/repositories/...` |
| Database config | Noi ket noi PostgreSQL | `webservice/src/config/db.ts` |

Neu mai bi hoi "backend ket noi frontend nhu nao", tra loi:

> Frontend goi API bang axios trong `src/api/client.ts`, base URL la `http://localhost:3000/api`. Backend Express o `webservice/src/index.ts` nhan request, dua vao route phu hop, roi xu ly tiep qua controller, service, repository va PostgreSQL.

## 4. API goi qua dau?

Tat ca frontend deu co file rieng ten:

| Frontend | File goi API |
|---|---|
| Shop | `client/src/api/client.ts` |
| Admin | `admin/src/api/client.ts` |
| Shipper | `mobile/src/api/client.ts` |
| Thu kho | `stockkeeper/src/api/client.ts` |

Ca 4 file nay deu tro ve:

`http://localhost:3000/api`

Nen khi frontend goi `/auth/login`, dia chi that se la:

`http://localhost:3000/api/auth/login`

Khi frontend goi `/shop/orders`, dia chi that se la:

`http://localhost:3000/api/shop/orders`

Nho don gian:

> Frontend chi viet phan sau `/api`, con `src/api/client.ts` tu gan them `http://localhost:3000/api`.

## 5. Token dang nhap di nhu nao?

Sau khi dang nhap thanh cong:

1. Frontend goi `POST /auth/login`.
2. Backend kiem tra so dien thoai + mat khau.
3. Backend tra ve token va thong tin user.
4. Frontend luu token theo tung vai tro.
5. Cac lan goi API sau, file `src/api/client.ts` tu gan token vao request.
6. Backend dung `auth.middleware.ts` de kiem tra token va quyen.

Noi luu token:

| App | Token luu bang ten |
|---|---|
| Shop | `shop_token` |
| Admin | `admin_token` |
| Shipper | `shipper_token` |
| Thu kho | `stockkeeper_token` |

Nho:

> Login lay token. Co token moi vao duoc API rieng cua tung role.

## 6. Backend chia API nhu the nao?

Trong `webservice/src/index.ts`, backend gan cac nhom API nhu sau:

| Prefix API | Route file | Ai hay dung |
|---|---|---|
| `/api/auth` | `webservice/src/routes/auth.routes.ts` | Tat ca user dang nhap |
| `/api/admin` | `webservice/src/routes/admin.routes.ts` | Admin |
| `/api/shop` | `webservice/src/routes/shop.routes.ts` | Shop |
| `/api/shipper` | `webservice/src/routes/shipper.routes.ts` | Shipper |
| `/api/stockkeeper` | `webservice/src/routes/stockkeeper.routes.ts` | Thu kho |
| `/api/orders` | `webservice/src/routes/order.routes.ts` | Tra cuu don public |
| `/api` | `webservice/src/routes/general.routes.ts` | Cac nghiep vu dung chung: COD, route, bag, promotion, feedback, notification |

Cach doc API:

| Frontend goi | Backend route |
|---|---|
| `/auth/login` | `/api/auth/login` |
| `/shop/orders` | `/api/shop/orders` |
| `/admin/employees` | `/api/admin/employees` |
| `/shipper/pickup-list` | `/api/shipper/pickup-list` |
| `/stockkeeper/inventory` | `/api/stockkeeper/inventory` |
| `/orders/track/:code` | `/api/orders/track/:code` |
| `/cod/request` | `/api/cod/request` |

## 7. Moi frontend co nhiem vu gi?

### Shop app: `client/`

Day la web cho chu shop.

File de nho:

| File/folder | Nhiem vu |
|---|---|
| `client/src/App.tsx` | Khai bao cac duong man hinh cua shop |
| `client/src/pages/public/` | Trang public: landing, tra cuu don |
| `client/src/pages/auth/` | Dang nhap, dang ky, quen mat khau |
| `client/src/pages/shop/` | Cac man hinh sau khi shop dang nhap |
| `client/src/components/layout/ShopLayout.tsx` | Khung giao dien shop sau dang nhap |
| `client/src/components/ProtectedRoute.tsx` | Chan nguoi chua dang nhap |
| `client/src/api/client.ts` | Noi goi API backend |
| `client/src/hooks/useAuth.ts` | Quan ly trang thai dang nhap cua shop |

Luong shop hay gap:

1. Shop dang nhap o `pages/auth/Login.tsx`.
2. Goi API `/auth/login`.
3. Luu `shop_token`.
4. Vao cac man shop nhu dashboard, stores, wallet, orders.
5. Khi tao don, man `CreateOrder.tsx` goi API cua nhom `/shop/orders`.
6. Backend tao don, tinh phi, tao ma tracking, luu database.

### Admin app: `admin/`

Day la web quan tri he thong.

File de nho:

| File/folder | Nhiem vu |
|---|---|
| `admin/src/App.tsx` | Khai bao cac man hinh admin |
| `admin/src/pages/` | Dashboard, nhan vien, don hang, shop, route, cau hinh... |
| `admin/src/components/layout/AdminLayout.tsx` | Khung giao dien admin |
| `admin/src/components/layout/Sidebar.tsx` | Menu ben trai |
| `admin/src/components/layout/Header.tsx` | Thanh tren, thong bao |
| `admin/src/api/client.ts` | Noi goi API backend |

Luong admin hay gap:

1. Admin dang nhap bang `/auth/login`.
2. Luu `admin_token`.
3. Vao dashboard hoac cac trang quan ly.
4. Cac man hinh goi API nhom `/admin/...`.
5. Backend check role `ADMIN`.
6. Neu dung quyen, backend moi cho xem/sua du lieu.

### Shipper app: `mobile/`

Day la web mobile cho shipper.

File de nho:

| File/folder | Nhiem vu |
|---|---|
| `mobile/src/App.tsx` | Khai bao cac man hinh shipper |
| `mobile/src/pages/Dashboard.tsx` | Tong quan viec trong ngay |
| `mobile/src/pages/Tasks.tsx` | Danh sach viec lay/giao |
| `mobile/src/pages/Scanner.tsx` | Quet ma van don |
| `mobile/src/pages/CODReconciliation.tsx` | Nop tien/COD |
| `mobile/src/pages/Income.tsx` | Thu nhap shipper |
| `mobile/src/components/layout/ShipperLayout.tsx` | Khung giao dien shipper |
| `mobile/src/api/client.ts` | Noi goi API backend |

Luong shipper hay gap:

1. Shipper dang nhap bang `/auth/login`.
2. Luu `shipper_token`.
3. Xem viec bang `/shipper/pickup-list` va `/shipper/delivery-list`.
4. Quet ma don o `Scanner.tsx`.
5. Neu lay hang: goi `/shipper/scan/pickup`.
6. Neu bat dau giao: goi `/shipper/scan/start-delivery`.
7. Neu giao xong: goi `/shipper/scan/delivered`.
8. Neu giao that bai: goi `/shipper/scan/failed`.
9. Neu co tien mat/COD, shipper vao COD de nop tien.

### Thu kho app: `stockkeeper/`

Day la web cho thu kho.

File de nho:

| File/folder | Nhiem vu |
|---|---|
| `stockkeeper/src/App.tsx` | Khai bao cac man hinh kho |
| `stockkeeper/src/pages/stockkeeper/WarehouseScanner.tsx` | Quet nhap kho / xuat kho |
| `stockkeeper/src/pages/stockkeeper/Inventory.tsx` | Xem ton kho |
| `stockkeeper/src/pages/stockkeeper/Bagging.tsx` | Gom hang vao bao |
| `stockkeeper/src/components/ProtectedRoute.tsx` | Chan nguoi chua dang nhap |
| `stockkeeper/src/components/layout/KioskLayout.tsx` | Khung giao dien kho |
| `stockkeeper/src/api/client.ts` | Noi goi API backend |

Luong thu kho hay gap:

1. Thu kho dang nhap bang `/auth/login`.
2. Luu `stockkeeper_token`.
3. Quet hang vao kho: `/stockkeeper/scan/inbound`.
4. Quet hang ra kho: `/stockkeeper/scan/outbound`.
5. Xem ton kho: `/stockkeeper/inventory`.
6. Gom bao: `/stockkeeper/bags`.

## 8. Backend folder nao lam gi?

Thu muc quan trong trong `webservice/src/`:

| Folder/file | Nho don gian |
|---|---|
| `index.ts` | Cua chinh cua backend. Start server, gan route. |
| `routes/` | Ban do API. Duong nao thi vao controller nao. |
| `controllers/` | Nguoi le tan. Nhan request, goi service, tra ket qua. |
| `services/` | Bo nao nghiep vu. Tinh phi, tao don, giao hang, nop COD... |
| `repositories/` | Nguoi noi chuyen voi database. |
| `middlewares/` | Bao ve API. Kiem tra token, kiem tra role. |
| `config/db.ts` | Cau hinh ket noi PostgreSQL. |
| `db/ensureSchema.ts` | Dam bao database co schema/bang can thiet. |
| `utils/` | Ham phu tro: JWT, so dien thoai, dia chi, vi tien. |
| `scripts/` | Script phu tro seed/sua du lieu. |

Nho:

> Route chi duong, controller nhan viec, service xu ly, repository cham database.

## 9. Luong tao don cua Shop

Hoc theo trinh tu nay:

1. Shop mo man `client/src/pages/shop/CreateOrder.tsx`.
2. Man hinh lay danh sach kho, buu cuc, loai dich vu, ma khuyen mai.
3. Shop nhap thong tin nguoi nhan va hang hoa.
4. Bam tinh phi: frontend goi `/shop/orders/preview-fee`.
5. Backend tinh phi ship, phi bao hiem, kiem tra vi.
6. Bam tao don: frontend goi `/shop/orders`.
7. Backend tao don, sinh ma tracking, luu don vao database.
8. Don moi bat dau o trang thai cho lay hang.
9. Shipper se thay don trong danh sach lay hang neu dung khu vuc.

File backend lien quan:

| Tang | File |
|---|---|
| Route | `webservice/src/routes/shop.routes.ts` |
| Controller | `webservice/src/controllers/order.controller.ts` |
| Service | `webservice/src/services/order.service.ts` |
| Repository | `webservice/src/repositories/order.repository.ts` |

## 10. Luong lay hang va giao hang cua Shipper

Nho nhu mot chuyen di:

> Shop tao don -> shipper lay hang -> kho nhap/xuat -> shipper giao -> doi soat tien.

Chi tiet de hoc:

1. Shop tao don.
2. Shipper vao `mobile/src/pages/Tasks.tsx` de xem don can lay/giao.
3. Khi lay hang, shipper quet ma o `mobile/src/pages/Scanner.tsx`.
4. Frontend goi `/shipper/scan/pickup`.
5. Backend doi trang thai don sang da lay hang.
6. Thu kho co the quet nhap kho/xuat kho trong app `stockkeeper`.
7. Khi den buoc giao cuoi, shipper bam bat dau giao.
8. Frontend goi `/shipper/scan/start-delivery`.
9. Giao thanh cong thi goi `/shipper/scan/delivered`.
10. Giao that bai thi goi `/shipper/scan/failed`.

File backend lien quan:

| Tang | File |
|---|---|
| Route | `webservice/src/routes/shipper.routes.ts` |
| Controller | `webservice/src/controllers/shipper.controller.ts` |
| Service | `webservice/src/services/shipper.service.ts` |
| Repository | `webservice/src/repositories/shipper.repository.ts` |

## 11. Luong kho va gom bao

Thu kho lam viec trong app `stockkeeper`.

Nho:

> Hang vao kho thi inbound. Hang roi kho thi outbound. Nhieu don di chung thi gom bao.

Luong don gian:

1. Thu kho mo `stockkeeper/src/pages/stockkeeper/WarehouseScanner.tsx`.
2. Quet ma don hoac ma bao.
3. Neu nhap kho: frontend goi `/stockkeeper/scan/inbound`.
4. Neu xuat kho: frontend goi `/stockkeeper/scan/outbound`.
5. Muon xem ton kho: goi `/stockkeeper/inventory`.
6. Muon gom nhieu don vao bao: vao `Bagging.tsx`, goi `/stockkeeper/bags`.

File backend lien quan:

| Tang | File |
|---|---|
| Route | `webservice/src/routes/stockkeeper.routes.ts` |
| Controller | `webservice/src/controllers/stockkeeper.controller.ts` |
| Service | `webservice/src/services/stockkeeper.service.ts` |
| Repository | `webservice/src/repositories/stockkeeper.repository.ts` |

## 12. Luong COD va tien

Nho don gian:

> Shipper thu tien truoc. Shipper nop ve he thong. Admin xac nhan. Shop moi rut COD.

Luong COD:

1. Don co COD hoac phi tien mat.
2. Shipper giao thanh cong va dang giu tien.
3. Shipper vao `mobile/src/pages/CODReconciliation.tsx`.
4. App goi `/shipper/cod-summary` de xem tong tien dang giu.
5. Shipper bam nop tien, app goi `/shipper/cod-reconciliation`.
6. Backend tao phieu cho xac nhan.
7. Admin vao `admin/src/pages/Payouts.tsx`.
8. Admin xac nhan tien shipper nop bang `/admin/shipper-cod-reconciliations/:id/confirm`.
9. Shop vao vi/COD va yeu cau payout bang `/cod/request`.
10. Admin duyet payout cho shop bang `/cod/:id/approve`.

File da co rieng ve COD:

`Flow_explane.md`

File do noi ky hon ve COD. File hien tai chi de hoc luong tong quat.

## 13. Luong Admin quan ly he thong

Admin app gom cac man hinh o `admin/src/pages/`.

Nho theo nhom:

| Man hinh admin | File | API hay dung |
|---|---|---|
| Dashboard | `Dashboard.tsx` | `/admin/dashboard-stats` |
| Ha tang Hub/Spoke | `Infrastructure.tsx` | `/admin/infrastructure`, `/admin/hubs`, `/admin/spokes`, `/admin/areas` |
| Nhan vien | `Employees.tsx` | `/admin/employees`, `/admin/user-roles`, `/admin/shipper-ward-assignments` |
| Don hang | `Orders.tsx` | `/admin/orders`, `/admin/orders/:tracking_code/detail` |
| Shop | `Shops.tsx` | `/admin/shops` |
| Tuyen duong | `Routes.tsx` | `/routes`, `/admin/routes/auto-generate` |
| Cau hinh | `Settings.tsx` | `/admin/pricing-rules`, `/admin/service-types`, `/admin/insurance-config` |
| COD/Payout | `Payouts.tsx` | `/cod/payouts`, `/admin/shipper-cod-reconciliations` |
| Khuyen mai | `Promotions.tsx` | `/promotions/all`, `/promotions` |
| Ho tro | `CustomerSupport.tsx` | `/incidents`, `/feedbacks` |

Nho:

> Admin la nguoi cau hinh va duyet viec. Shop tao don. Shipper van hanh giao nhan. Thu kho xu ly kho.

## 14. Cach lan theo mot nut bam bat ky

Neu mai can doc nhanh mot chuc nang, lam theo 5 buoc:

1. Tim man hinh trong `src/pages`.
2. Tim API no goi, thuong la `apiClient.get/post/put/delete`.
3. Lay duong API do doi qua route backend.
4. Mo file route trong `webservice/src/routes`.
5. Route se chi controller, controller se chi service/repository.

Vi du:

| Ban thay trong frontend | Thi tim tiep |
|---|---|
| `/shop/orders` | `webservice/src/routes/shop.routes.ts` |
| `/shipper/scan/delivered` | `webservice/src/routes/shipper.routes.ts` |
| `/admin/employees` | `webservice/src/routes/admin.routes.ts` |
| `/stockkeeper/inventory` | `webservice/src/routes/stockkeeper.routes.ts` |
| `/cod/request` | `webservice/src/routes/general.routes.ts` |

## 15. Tom tat de hoc thuoc trong 1 phut

Doc doan nay la nam luong:

Project co 4 frontend va 1 backend. Shop dung `client`, Admin dung `admin`, Shipper dung `mobile`, Thu kho dung `stockkeeper`. Tat ca frontend deu goi API qua file `src/api/client.ts`, cung tro ve `http://localhost:3000/api`.

Backend nam trong `webservice`. File `webservice/src/index.ts` la cua chinh, chia API vao cac route: auth, shop, admin, shipper, stockkeeper, orders, general. Moi request di theo thu tu: route -> controller -> service -> repository -> PostgreSQL.

Shop tao don. Shipper lay va giao don. Thu kho nhap/xuat/gom bao. Admin quan ly he thong va duyet tien. Token dang nhap quyet dinh user duoc vao nhom API nao.

Chi can nho:

> Frontend la man hinh. `api/client.ts` la ong goi backend. Backend route nhan API. Service xu ly nghiep vu. Repository noi database.

