import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const orderService = new OrderService();

// Danh sách loại dịch vụ (Shop xem trước khi tạo đơn)
export const getServiceTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await orderService.getServiceTypes();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Preview phí vận chuyển trước khi tạo đơn (giống GHN)
export const previewFee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await orderService.previewFee(req.body, req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Tạo đơn chính thức
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await orderService.createOrder(req.body, req.user.id_user);
    res.status(201).json({
      status: 'success',
      message: `Tạo vận đơn thành công! Mã vận đơn: ${data.tracking_code}`,
      data
    });
  } catch (error: any) {
    const statusCode = error.message.includes('Số dư ví') ? 402 : 400;
    res.status(statusCode).json({ status: 'error', message: error.message });
  }
};

// Xem danh sách đơn của Shop (có thể lọc theo status)
export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status_filter = req.query.status as string | undefined;
    const data = await orderService.getMyOrders(req.user.id_user, status_filter);
    res.json({ status: 'success', total: data.length, data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Tracking công khai (không cần Token)
export const trackOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const tracking_code = String(req.params.tracking_code);
    const data = await orderService.trackOrder(tracking_code.toUpperCase());
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};
