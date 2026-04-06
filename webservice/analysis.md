# Kế hoạch: Nối Frontend → Real Database

## Phân tích hiện trạng

### ✅ Endpoints CÓ SẴN trong backend
| Endpoint | Trả về |
|----------|--------|
| `POST /auth/login` | `{ status, accessToken, user_info }` |
| `GET /shipper/pickup-list` | `{ status, data: { assigned_spoke, total, orders[] } }` |
| `GET /shipper/delivery-list` | `{ status, data: { total, orders[] } }` |
| `POST /shipper/scan/pickup` | `{ status, tracking_code, new_status }` |
| `POST /shipper/scan/start-delivery` | `{ status, tracking_code, new_status }` |
| `POST /shipper/scan/delivered` | `{ status, tracking_code, new_status }` |
| `POST /shipper/scan/failed` | `{ status, tracking_code, new_status, attempt_no }` |

### ❌ Endpoints CHƯA CÓ (cần thêm vào backend)
| Endpoint | Cần cho |
|----------|---------|
| `GET /shipper/cod-summary` | CODReconciliation page |
| `GET /shipper/income` | Income page |
| `GET /shipper/income/history` | Income page |

### Field schema từ DB (getOrdersToPickup)
```
tracking_code, receiver_name, receiver_phone, receiver_address,
cod_amount, weight, status, created_at,
store_name, pickup_address, pickup_phone,
province, district
```

### Field schema từ DB (getOrdersToDeliver)
```
tracking_code, receiver_name, receiver_phone, receiver_address,
cod_amount, weight, status, created_at,
province, district, attempt_count
```

## Axios interceptor note
`api.interceptors.response.use((res) => res.data)` → tất cả response đã được bóc `.data`
Nên khi gọi `api.get('/shipper/pickup-list')` thì nhận được:
`{ status: 'success', data: { assigned_spoke, total, orders } }`
→ Cần đọc `.data.orders` hoặc `.data.assigned_spoke`

## Fixes cần làm
1. **Dashboard.tsx** - Fix response parsing (orders là `res.data.orders`)
2. **Tasks.tsx** - Fix response parsing (pickup + delivery)  
3. **CODReconciliation.tsx** - Fix response parsing + cần thêm endpoint backend
4. **Income.tsx** - Cần thêm endpoint backend
5. **Backend: shipper.routes.ts + controller + service + repository** - Thêm 3 endpoints mới
