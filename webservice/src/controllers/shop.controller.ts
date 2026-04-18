import { Request, Response } from 'express';
import { ShopService } from '../services/shop.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const shopService = new ShopService();

// 1. Đăng ký Shop (Public - không cần Token)
export const registerShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await shopService.registerShop(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Đăng ký tài khoản Shop thành công! Vui lòng đăng nhập.',
      data
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    await shopService.sendOtp(phone, false);
    res.json({
      status: 'success',
      message: 'Mã OTP đăng ký đã được gửi.'
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const sendOtpForgot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    await shopService.sendOtp(phone, true);
    res.json({
      status: 'success',
      message: 'Mã OTP khôi phục mật khẩu đã được gửi.'
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    await shopService.verifyOtp(phone, otp);
    res.json({
      status: 'success',
      message: 'Xác thực OTP thành công.'
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    await shopService.resetPassword(req.body);
    res.json({
      status: 'success',
      message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.'
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 2. Xem thông tin Shop + Ví tiền
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.getProfile(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// 3a. Xem danh sách Kho hàng
export const getStores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.getMyStores(req.user.id_user);
    res.json({ status: 'success', total: data.length, data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3b. Thêm Kho hàng mới
export const addStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.addStore(req.user.id_user, req.body);
    res.status(201).json({ status: 'success', message: 'Thêm kho hàng thành công!', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 3c. Cập nhật Kho hàng
export const updateStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_store = parseInt(String(req.params.id));
    const data = await shopService.updateStore(req.user.id_user, id_store, req.body);
    res.json({ status: 'success', message: 'Cập nhật kho hàng thành công!', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 3d. Xóa Kho hàng
export const deleteStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_store = parseInt(String(req.params.id));
    const data = await shopService.deleteStore(req.user.id_user, id_store);
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4a. Xem tài khoản ngân hàng
export const getBanks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.getMyBanks(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4b. Thêm tài khoản ngân hàng
export const addBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.addBankAccount(req.user.id_user, req.body);
    res.status(201).json({ status: 'success', message: 'Thêm tài khoản ngân hàng thành công!', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4c. Xóa tài khoản ngân hàng
export const deleteBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_bank = parseInt(String(req.params.id));
    const data = await shopService.deleteBankAccount(req.user.id_user, id_bank);
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5a. Xem ví + lịch sử giao dịch
export const getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.getWallet(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// 5b. Nạp tiền vào ví
export const topupWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const data = await shopService.topupWallet(req.user.id_user, parseFloat(amount));
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

import fs from 'fs';
// 5b.2 Xử lý Webhook PayOS (Public)
export const payosWebhook = async (req: Request, res: Response): Promise<void> => {
  const logBase = `\n[${new Date().toISOString()}] Hook reached! Order: ${req.body?.data?.orderCode}`;
  console.log(logBase);
  try { fs.appendFileSync('webhook_debug.txt', logBase); } catch {}
  try {
    const webhookData = req.body;
    const data = await shopService.verifyPayosWebhook(webhookData);
    const succStr = `\n[Webhook] Xac thuc thanh cong: ${req.body?.data?.orderCode}`;
    console.log(succStr);
    try { fs.appendFileSync('webhook_debug.txt', succStr); } catch {}
    res.json({ success: true, ...data });
  } catch (error: any) {
    const errStr = `\n[Webhook] Loi xac thuc: ${error.message}`;
    console.log(errStr);
    try { fs.appendFileSync('webhook_debug.txt', errStr); } catch {}
    // Luôn trả về 200 OK cho Webhook để PayOS xác nhận URL thành công trong lúc cài đặt
    res.status(200).json({ success: false, message: error.message || 'Ignored' });
  }
};

// 5c. Rút tiền từ ví
export const withdrawWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, id_bank } = req.body;
    const data = await shopService.withdrawWallet(req.user.id_user, parseFloat(amount), parseInt(id_bank));
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 6. Hủy đơn hàng
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_order = parseInt(String(req.params.id));
    const data = await shopService.cancelOrder(req.user.id_user, id_order);
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    const statusCode = error.message.includes('Không thể hủy') ? 409 : 400;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};

// 7. Báo cáo dòng tiền
export const getCashflowReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shopService.getCashflowReport(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 8. Lấy danh sách Bưu cục
export const getSpokes = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await shopService.getSpokes();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const resolveDestArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const { province, district } = req.query;
    const data = await shopService.resolveDestinationArea(String(province || ''), String(district || ''));
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};
