import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import {
  resolveRoute, getAllRoutes, getRouteDetail,
  createBag, scanBag, getBagDetail,
  requestPayout, getMyPayouts, getPendingPayouts, approvePayout,
  getAdminShipperCodReconciliations, confirmShipperCodReconciliation,
  getPromos, getAllPromos, createPromo, togglePromo, applyPromo,
  reportIncident, resolveIncident, getIncidents,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  submitFeedback, getFeedbacks, getMyFeedbacks, updateFeedbackStatus,
  getShipperCodSummary,
  requestReturn,
  calcShipperIncome, getShipperIncomeHistory, setShipperSalary,
  getAuditLogs,
  getOperationsReport,
  searchOrders,
  checkSafeDeleteHub, checkSafeDeleteSpoke
} from '../controllers/general.controller';

const router = Router();

// Routing
router.post('/routes/resolve', verifyToken, resolveRoute);
router.get('/routes', verifyToken, checkRoles(['ADMIN']), getAllRoutes);
router.get('/routes/:id', verifyToken, getRouteDetail);

// Bags
router.post('/bags', verifyToken, checkRoles(['STOCKKEEPER']), createBag);
router.post('/bags/scan', verifyToken, checkRoles(['STOCKKEEPER']), scanBag);
router.get('/bags/:code', verifyToken, getBagDetail);

// COD payout for shop
router.post('/cod/request', verifyToken, checkRoles(['SHOP']), requestPayout);
router.get('/cod/my-payouts', verifyToken, checkRoles(['SHOP']), getMyPayouts);
router.get('/cod/pending', verifyToken, checkRoles(['ADMIN']), getPendingPayouts);
router.get('/cod/payouts', verifyToken, checkRoles(['ADMIN']), getPendingPayouts);
router.put('/cod/:id/approve', verifyToken, checkRoles(['ADMIN']), approvePayout);

// Shipper cash reconciliation for admin
router.get('/admin/shipper-cod-reconciliations', verifyToken, checkRoles(['ADMIN']), getAdminShipperCodReconciliations);
router.put('/admin/shipper-cod-reconciliations/:id/confirm', verifyToken, checkRoles(['ADMIN']), confirmShipperCodReconciliation);

// Promotions
router.get('/promotions', getPromos);
router.get('/promotions/all', verifyToken, checkRoles(['ADMIN']), getAllPromos);
router.post('/promotions', verifyToken, checkRoles(['ADMIN']), createPromo);
router.put('/promotions/:id/toggle', verifyToken, checkRoles(['ADMIN']), togglePromo);
router.post('/promotions/apply', verifyToken, checkRoles(['SHOP']), applyPromo);

// Incidents
router.post('/incidents', verifyToken, reportIncident);
router.put('/incidents/:id/resolve', verifyToken, checkRoles(['ADMIN']), resolveIncident);
router.get('/incidents', verifyToken, checkRoles(['ADMIN']), getIncidents);

// Notifications
router.get('/notifications', verifyToken, getNotifications);
router.put('/notifications/:id/read', verifyToken, markNotificationRead);
router.put('/notifications/read-all', verifyToken, markAllNotificationsRead);

// Feedbacks
router.post('/feedbacks', verifyToken, submitFeedback);
router.get('/feedbacks/me', verifyToken, getMyFeedbacks);
router.get('/feedbacks', verifyToken, checkRoles(['ADMIN']), getFeedbacks);
router.put('/feedbacks/:id', verifyToken, checkRoles(['ADMIN']), updateFeedbackStatus);

// Shipper COD summary
router.get('/shipper/cod-summary', verifyToken, checkRoles(['SHIPPER']), getShipperCodSummary);

// Return orders
router.post('/orders/:id/return', verifyToken, checkRoles(['SHOP']), requestReturn);

// Shipper income
router.get('/shipper/income', verifyToken, checkRoles(['SHIPPER']), calcShipperIncome);
router.get('/shipper/income/history', verifyToken, checkRoles(['SHIPPER']), getShipperIncomeHistory);
router.post('/admin/shipper-salary', verifyToken, checkRoles(['ADMIN']), setShipperSalary);

// Audit log
router.get('/admin/audit-log', verifyToken, checkRoles(['ADMIN']), getAuditLogs);

// Shop operations
router.get('/shop/operations-report', verifyToken, checkRoles(['SHOP']), getOperationsReport);
router.get('/shop/search-orders', verifyToken, checkRoles(['SHOP']), searchOrders);

// Safe delete checks
router.get('/admin/hub/:id/safe-delete', verifyToken, checkRoles(['ADMIN']), checkSafeDeleteHub);
router.get('/admin/spoke/:id/safe-delete', verifyToken, checkRoles(['ADMIN']), checkSafeDeleteSpoke);

export default router;
