import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import {
  getPickupList,
  getDeliveryList,
  confirmPickup,
  startDelivery,
  confirmDelivered,
  reportFailed,
  getCodSummary,
  getIncome,
  getIncomeHistory,
} from '../controllers/shipper.controller';

const router = Router();

// Tất cả API Shipper đều yêu cầu Token đăng nhập với Role SHIPPER
router.use(verifyToken);
router.use(checkRoles(['SHIPPER']));

// Xem danh sách đơn trong khu vực cần đi lấy hàng
router.get('/pickup-list', getPickupList);

// Xem danh sách đơn đang mang theo để giao
router.get('/delivery-list', getDeliveryList);

// Quét mã: Xác nhận đã lấy hàng tại Shop
router.post('/scan/pickup', confirmPickup);

// Quét mã: Bắt đầu chạy giao
router.post('/scan/start-delivery', startDelivery);

// Quét mã: Giao hàng thành công + Upload ảnh bằng chứng
router.post('/scan/delivered', confirmDelivered);

// Quét mã: Giao hàng thất bại + Ghi lý do
router.post('/scan/failed', reportFailed);

// COD Summary: Tổng COD hôm nay (GET /shipper/cod-summary?date=YYYY-MM-DD)
router.get('/cod-summary', getCodSummary);

// Thu nhập tháng hiện tại
router.get('/income', getIncome);

// Lịch sử lương 6 tháng gần nhất
router.get('/income/history', getIncomeHistory);

export default router;

