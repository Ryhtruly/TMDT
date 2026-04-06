import { Response } from 'express';
import { StockkeeperService } from '../services/stockkeeper.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const stockService = new StockkeeperService();

// Quét nhập kho
export const scanInbound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code, shelf_location } = req.body;
    if (!tracking_code) { res.status(400).json({ status: 'error', message: 'Cần cung cấp tracking_code.' }); return; }
    const data = await stockService.scanInbound(req.user.id_user, String(tracking_code).toUpperCase(), shelf_location);
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Quét xuất kho
export const scanOutbound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code } = req.body;
    if (!tracking_code) { res.status(400).json({ status: 'error', message: 'Cần cung cấp tracking_code.' }); return; }
    const data = await stockService.scanOutbound(req.user.id_user, String(tracking_code).toUpperCase());
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Xem hàng trong kho
export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await stockService.getInventory(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Cảnh báo tồn kho >24h
export const getAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await stockService.getOverdueAlerts(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
