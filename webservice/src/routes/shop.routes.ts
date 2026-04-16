import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import {
  registerShop,
  sendOtp,
  sendOtpForgot,
  verifyOtp,
  resetPassword,
  getProfile,
  getStores, addStore, updateStore, deleteStore,
  getBanks, addBank, deleteBank,
  getWallet, topupWallet, withdrawWallet, payosWebhook,
  cancelOrder,
  getCashflowReport,
  getSpokes
} from '../controllers/shop.controller';

import {
  getServiceTypes, previewFee, createOrder, getMyOrders, trackOrder
} from '../controllers/order.controller';

const router = Router();

// =====================================================
// PUBLIC: Đăng ký tài khoản Shop (không cần token)
// =====================================================
router.post('/register', registerShop);
router.post('/send-otp', sendOtp);
router.post('/send-otp-forgot', sendOtpForgot);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/webhook/payos', payosWebhook);

// =====================================================
// PRIVATE: Tất cả endpoint bên dưới cần TOKEN của SHOP
// =====================================================
router.use(verifyToken);
router.use(checkRoles(['SHOP']));

// Profile
router.get('/profile', getProfile);

// Kho hàng / Địa chỉ lấy hàng (Stores)
router.get('/stores', getStores);
router.post('/stores', addStore);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);

// Tài khoản ngân hàng (Bank Accounts)
router.get('/banks', getBanks);
router.post('/banks', addBank);
router.delete('/banks/:id', deleteBank);

// Ví tiền
router.get('/wallet', getWallet);
router.post('/wallet/topup', topupWallet);
router.post('/wallet/withdraw', withdrawWallet);

// Hủy đơn hàng
router.delete('/orders/:id/cancel', cancelOrder);

// =====================================================
// ĐẶT ĐỚN HÀNG (GIUỐNG GHN)
// =====================================================
// Bước 0: Xem các loại dịch vụ vận chuyển
router.get('/orders/service-types', getServiceTypes);

// Bước 1: Tính phí trước khi tạo đơn (Preview - không trừ tiền)
router.post('/orders/preview-fee', previewFee);

// Bước 2: Tạo đơn chính thức (Trừ tiền ví, sinh mã tracking)
router.post('/orders', createOrder);

// Xem danh sách đơn (có thể lọc: ?status=CHờ+LẤY+HÀNG)
router.get('/orders', getMyOrders);

// Tra cứu chi tiết đơn theo tracking code
router.get('/orders/:tracking_code/track', trackOrder);

// Báo cáo dòng tiền
router.get('/cashflow', getCashflowReport);

// Danh sách Bưu cục
router.get('/spokes', getSpokes);

export default router;
