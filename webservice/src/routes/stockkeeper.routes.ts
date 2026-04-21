import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import { scanInbound, scanOutbound, getInventory, getAlerts } from '../controllers/stockkeeper.controller';

const router = Router();

// Chỉ STOCKKEEPER mới được truy cập
router.use(verifyToken);
router.use(checkRoles(['STOCKKEEPER']));

// Xem hàng đang trong kho của mình
router.get('/inventory', getInventory);

// Cảnh báo tồn kho quá 24h chưa điều phối
router.get('/alerts', getAlerts);

// Quét mã nhập kho (hàng vào kho)
// ĐÃ LẤY HÀNG / ĐANG TRUNG CHUYỂN → TẠI KHO
router.post('/scan/inbound', scanInbound);

// Quét mã xuất kho (hàng rời kho)
// TẠI KHO → ĐANG TRUNG CHUYỂN
router.post('/scan/outbound', scanOutbound);

// Gom bao kiện
import { getBagSuggestions, getBags, createBag, getHubs } from '../controllers/stockkeeper.controller';
router.get('/hubs', getHubs);
router.get('/bags', getBags);
router.get('/bags/suggestions', getBagSuggestions);
router.post('/bags', createBag);

export default router;
