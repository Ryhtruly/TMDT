import { Response } from 'express';
import { ShipperService } from '../services/shipper.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const shipperService = new ShipperService();

// Danh sách đơn cần lấy
export const getPickupList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getPickupList(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Danh sách đơn đang giao
export const getDeliveryList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getDeliveryList(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Quét mã lấy hàng
export const confirmPickup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code } = req.body;
    if (!tracking_code) { res.status(400).json({ status: 'error', message: 'Cần cung cấp tracking_code.' }); return; }
    const data = await shipperService.confirmPickup(req.user.id_user, String(tracking_code).toUpperCase());
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, message: data.message });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Bắt đầu đi giao
export const startDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code } = req.body;
    if (!tracking_code) { res.status(400).json({ status: 'error', message: 'Cần cung cấp tracking_code.' }); return; }
    const data = await shipperService.startDelivery(req.user.id_user, String(tracking_code).toUpperCase());
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, message: data.message });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Giao thành công (kèm ảnh bằng chứng)
export const confirmDelivered = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code, evidence_url } = req.body;
    if (!tracking_code) { res.status(400).json({ status: 'error', message: 'Cần cung cấp tracking_code.' }); return; }
    const data = await shipperService.confirmDelivered(req.user.id_user, String(tracking_code).toUpperCase(), evidence_url);
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, message: data.message });
  } catch (error: any) {
    res.status(409).json({ status: 'error', message: error.message });
  }
};

// Báo giao thất bại
export const reportFailed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code, reason_fail, evidence_url } = req.body;
    if (!tracking_code || !reason_fail) {
      res.status(400).json({ status: 'error', message: 'Cần cung cấp tracking_code và reason_fail.' });
      return;
    }
    const data = await shipperService.reportFailedDelivery(
      req.user.id_user, String(tracking_code).toUpperCase(), reason_fail, evidence_url
    );
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, attempt_no: data.attempt_no, redelivery_fee_charged: data.redelivery_fee_charged, message: data.message });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// COD Summary hôm nay
export const getCodSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = req.query.date as string | undefined;
    const data = await shipperService.getCodSummary(req.user.id_user, date);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Thu nhập tháng hiện tại
export const getIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getIncome(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Lịch sử lương 6 tháng
export const getIncomeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getIncomeHistory(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

