import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import {
  getPickupList,
  getDeliveryList,
  getDashboardSummary,
  confirmPickup,
  startDelivery,
  confirmDelivered,
  reportFailed,
  getCodSummary,
  submitCodReconciliation,
  getIncome,
  getIncomeHistory,
} from '../controllers/shipper.controller';

const router = Router();

router.use(verifyToken);
router.use(checkRoles(['SHIPPER']));

router.get('/pickup-list', getPickupList);
router.get('/delivery-list', getDeliveryList);
router.get('/summary', getDashboardSummary);
router.post('/scan/pickup', confirmPickup);
router.post('/scan/start-delivery', startDelivery);
router.post('/scan/delivered', confirmDelivered);
router.post('/scan/failed', reportFailed);
router.get('/cod-summary', getCodSummary);
router.post('/cod-reconciliation', submitCodReconciliation);
router.get('/income', getIncome);
router.get('/income/history', getIncomeHistory);

export default router;
