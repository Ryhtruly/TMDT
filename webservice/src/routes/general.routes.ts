import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import {
  resolveRoute, getAllRoutes, getRouteDetail,
  createBag, scanBag, getBagDetail,
  requestPayout, getMyPayouts, getPendingPayouts, approvePayout,
  getPromos, getAllPromos, createPromo, togglePromo, applyPromo,
  reportIncident, resolveIncident, getIncidents,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  submitFeedback, getFeedbacks, updateFeedbackStatus,
  getShipperCodSummary,
  requestReturn,
  calcShipperIncome, getShipperIncomeHistory, setShipperSalary,
  getAuditLogs,
  getOperationsReport,
  searchOrders,
  checkSafeDeleteHub, checkSafeDeleteSpoke
} from '../controllers/general.controller';

const router = Router();

// ============================================================
// ROUTING (Admin / Stockkeeper xem & tạo tuyến)
// ============================================================
router.post('/routes/resolve', verifyToken, resolveRoute);                        // Tự tìm route cho 1 đơn
router.get('/routes', verifyToken, checkRoles(['ADMIN']), getAllRoutes);           // Xem tất cả tuyến
router.get('/routes/:id', verifyToken, getRouteDetail);                           // Chi tiết 1 tuyến

// ============================================================
// BAGS (Thủ kho tạo bao / quét bao)
// ============================================================
router.post('/bags', verifyToken, checkRoles(['STOCKKEEPER']), createBag);        // Tạo bao hàng
router.post('/bags/scan', verifyToken, checkRoles(['STOCKKEEPER']), scanBag);     // Quét bao (DISPATCH / RECEIVE)
router.get('/bags/:code', verifyToken, getBagDetail);                             // Xem chi tiết bao

// ============================================================
// COD PAYOUT (Shop yêu cầu + Admin duyệt)
// ============================================================
router.post('/cod/request', verifyToken, checkRoles(['SHOP']), requestPayout);    // Shop yêu cầu đối soát
router.get('/cod/my-payouts', verifyToken, checkRoles(['SHOP']), getMyPayouts);   // Shop xem lịch sử đối soát
router.get('/cod/pending', verifyToken, checkRoles(['ADMIN']), getPendingPayouts);// Admin xem phiên chờ duyệt
router.put('/cod/:id/approve', verifyToken, checkRoles(['ADMIN']), approvePayout);// Admin phê duyệt

// ============================================================
// PROMOTIONS (Shop xem + Admin quản lý)
// ============================================================
router.get('/promotions', getPromos);                                             // Xem KM đang hoạt động (public)
router.get('/promotions/all', verifyToken, checkRoles(['ADMIN']), getAllPromos);   // Admin xem tất cả
router.post('/promotions', verifyToken, checkRoles(['ADMIN']), createPromo);       // Admin tạo KM
router.put('/promotions/:id/toggle', verifyToken, checkRoles(['ADMIN']), togglePromo); // Bật/tắt
router.post('/promotions/apply', verifyToken, checkRoles(['SHOP']), applyPromo);  // Shop áp mã

// ============================================================
// INCIDENTS (Sự cố đơn hàng — Shop báo, Admin xử lý)
// ============================================================
router.post('/incidents', verifyToken, reportIncident);                           // Báo sự cố
router.put('/incidents/:id/resolve', verifyToken, checkRoles(['ADMIN']), resolveIncident); // Admin đền bù (max 5tr)
router.get('/incidents', verifyToken, checkRoles(['ADMIN']), getIncidents);        // Xem tất cả

// ============================================================
// NOTIFICATIONS (Cần Token)
// ============================================================
router.get('/notifications', verifyToken, getNotifications);                      // Xem TB của mình
router.put('/notifications/:id/read', verifyToken, markNotificationRead);         // Đánh dấu đã đọc
router.put('/notifications/read-all', verifyToken, markAllNotificationsRead);     // Đánh dấu tất cả

// ============================================================
// FEEDBACKS (User gửi + Admin xem)
// ============================================================
router.post('/feedbacks', verifyToken, submitFeedback);                           // Gửi phản hồi
router.get('/feedbacks', verifyToken, checkRoles(['ADMIN']), getFeedbacks);        // Admin xem
router.put('/feedbacks/:id', verifyToken, checkRoles(['ADMIN']), updateFeedbackStatus); // Admin cập nhật

// ============================================================
// SHIPPER COD ĐỐI SOÁT CUỐI NGÀY
// ============================================================
router.get('/shipper/cod-summary', verifyToken, checkRoles(['SHIPPER']), getShipperCodSummary);

// ============================================================
// HOÀN HÀNG (Shop yêu cầu)
// ============================================================
router.post('/orders/:id/return', verifyToken, checkRoles(['SHOP']), requestReturn);

// ============================================================
// SHIPPER INCOME (Lương — Docx bảng 33)
// ============================================================
router.get('/shipper/income', verifyToken, checkRoles(['SHIPPER']), calcShipperIncome);           // Xem lương kỳ hiện tại
router.get('/shipper/income/history', verifyToken, checkRoles(['SHIPPER']), getShipperIncomeHistory); // Lịch sử lương
router.post('/admin/shipper-salary', verifyToken, checkRoles(['ADMIN']), setShipperSalary);       // Admin set lương cứng + phạt

// ============================================================
// AUDIT LOG (Docx bảng 34 — Admin xem)
// ============================================================
router.get('/admin/audit-log', verifyToken, checkRoles(['ADMIN']), getAuditLogs);

// ============================================================
// BÁO CÁO VẬN HÀNH SHOP (Docx dòng 1426)
// ============================================================
router.get('/shop/operations-report', verifyToken, checkRoles(['SHOP']), getOperationsReport);

// ============================================================
// TÌM KIẾM ĐƠN NÂNG CAO (Docx dòng 1399, 1526)
// ============================================================
router.get('/shop/search-orders', verifyToken, checkRoles(['SHOP']), searchOrders);

// ============================================================
// AN TOÀN XÓA KHO (Docx dòng 29)
// ============================================================
router.get('/admin/hub/:id/safe-delete', verifyToken, checkRoles(['ADMIN']), checkSafeDeleteHub);
router.get('/admin/spoke/:id/safe-delete', verifyToken, checkRoles(['ADMIN']), checkSafeDeleteSpoke);

export default router;
