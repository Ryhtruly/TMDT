import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { routingService } from '../services/routing.service';

const adminService = new AdminService();

// Phân công Tuyển dụng
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createEmployee(req.body);
    res.json({
      status: 'success',
      message: 'Thêm tài khoản Nhân viên thành công!',
      data: data
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Đăng kí Hub Mới
export const createHub = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createHub(req.body);
    res.json({
      status: 'success',
      message: 'Mở rộng cơ sở hạ tầng (Hub) thành công!',
      data: data
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const autoGenerateRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin_spoke_id, dest_spoke_id } = req.body;
    if (!origin_spoke_id || !dest_spoke_id) {
      throw new Error('Thiếu tham số điểm xuất phát hoặc điểm đích.');
    }
    const data = await routingService.autoGenerateRoute(parseInt(origin_spoke_id), parseInt(dest_spoke_id));
    res.json({
      status: 'success',
      message: 'Thiết lập và phân giải tuyến đường tự động thành công!',
      data
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Đăng kí Spoke Mới
export const createSpoke = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createSpoke(req.body);
    res.json({
      status: 'success',
      message: 'Thiết lập Bưu cục (Spoke) khu vực thành công!',
      data: data
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Phân vùng Khu Vực hoạt động cho Spoke
export const setAreaCoverage = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.setAreaCoverage(req.body);
    res.json({
      status: 'success',
      message: 'Phân vùng tuyến địa bàn thành công!',
      data: data
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Cấu hình Bảng Giá Ship
export const configPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_rule, price, base_weight_g, extra_per_500g } = req.body;
    const data = await adminService.updatePricingRule(id_rule, price, base_weight_g, extra_per_500g);
    res.json({
      status: 'success',
      message: 'Cập nhật bảng giá thành công!',
      data: data
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Hiển thị Data Phân Tích
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getDashboard();
    res.json({ status: 'success', data: data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Lỗi khi lấy Dashboard' });
  }
};

// Xuất sổ Infra
export const getInfrastructureList = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getInfrastructure();
    res.json({ status: 'success', data: data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Lỗi truy xuất cơ sở hạ tầng' });
  }
};

// Sửa thông tin Hub
export const updateHub = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_hub = parseInt(String(req.params.id));
    const { hub_name, description } = req.body;
    const data = await adminService.updateHub(id_hub, hub_name, description);
    res.json({ status: 'success', message: 'Cập nhật Hub thành công!', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// Sửa thông tin Spoke
export const updateSpoke = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_spoke = parseInt(String(req.params.id));
    const { spoke_name } = req.body;
    const data = await adminService.updateSpoke(id_spoke, spoke_name);
    res.json({ status: 'success', message: 'Cập nhật Spoke thành công!', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// Xóa Hub
export const deleteHub = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_hub = parseInt(String(req.params.id));
    await adminService.deleteHub(id_hub);
    res.json({ status: 'success', message: 'Đóng cửa Hub thành công!' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Xóa Spoke
export const deleteSpoke = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_spoke = parseInt(String(req.params.id));
    await adminService.deleteSpoke(id_spoke);
    res.json({ status: 'success', message: 'Giải thể Bưu Cục thành công!' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Lấy danh sách Role trong hệ thống
export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getAllRoles();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Lỗi lấy danh sách Role' });
  }
};

// Cấp thêm Role cho User
export const grantRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_user, id_role } = req.body;
    const data = await adminService.grantRoleToUser(parseInt(id_user), parseInt(id_role));
    res.json({ status: 'success', message: `Cấp quyền thành công cho User ID=${id_user}`, data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Thu hồi Role khỏi User
export const revokeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_user, id_role } = req.body;
    const data = await adminService.revokeRoleFromUser(parseInt(id_user), parseInt(id_role));
    res.json({ status: 'success', message: `Thu hồi quyền thành công khỏi User ID=${id_user}`, data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Cấu hình % Phí bảo hiểm
export const setInsuranceConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { threshold, rate_percent } = req.body;
    const data = await adminService.setInsuranceConfig(parseFloat(threshold), parseFloat(rate_percent));
    res.json({ status: 'success', message: 'Cập nhật cấu hình bảo hiểm hàng hóa thành công!', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Lấy danh sách nhân viên
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getEmployees();
    res.json({ status: 'success', total: data.length, data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Cap nhat thong tin nhan vien
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_user = parseInt(String(req.params.id), 10);
    const data = await adminService.updateEmployee(id_user, req.body);
    res.json({ status: 'success', message: `Da cap nhat User-${id_user}.`, data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Vo hieu hoa nhan vien
export const deactivateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_user = parseInt(String(req.params.id));
    const data = await adminService.deactivateEmployee(id_user);
    res.json({ status: 'success', message: `Tài khoản User-${id_user} đã bị vô hiệu hóa.`, data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Lấy danh sách Shops
export const getAllShops = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getAllShops();
    res.json({ status: 'success', total: data.length, data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Lấy toàn bộ đơn hàng (Admin)
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(String(req.query.limit)) || 50;
    const offset = (parseInt(String(req.query.page)) - 1 || 0) * limit;
    const data = await adminService.getAllOrders(status, limit, offset);
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Lấy danh sách Bags (Admin)
export const getAllBags = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getAllBags();
    res.json({ status: 'success', total: data.length, data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Lấy bảng giá (pricing_rules)
export const getPricingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getPricingRules();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Lấy danh sách Service Types
export const getServiceTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getServiceTypes();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateServiceType = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { base_multiplier, description } = req.body;
    if (!id || !base_multiplier) {
      res.status(400).json({ status: 'error', message: 'Thiếu tham số bắt buộc' });
      return;
    }
    const data = await adminService.updateServiceType(id, parseFloat(base_multiplier), description);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getShipperWardAssignments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.getShipperWardAssignments();
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createShipperWardAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createShipperWardAssignment(req.body);
    res.json({ status: 'success', data, message: 'Tao phan khu shipper thanh cong.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteShipperWardAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_assignment = parseInt(String(req.params.id));
    await adminService.deleteShipperWardAssignment(id_assignment);
    res.json({ status: 'success', message: 'Da xoa phan khu shipper.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Xem chi tiết đơn hàng theo tracking code (Admin)
export const getOrderDetailByTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const tracking_code = String(req.params.tracking_code);
    const { OrderService } = require('../services/order.service');
    const orderSvc = new OrderService();
    const data = await orderSvc.trackOrder(tracking_code.toUpperCase());
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// Bật/Tắt tuyến đường (Admin)
export const toggleRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_route = parseInt(String(req.params.id));
    const data = await adminService.toggleRoute(id_route);
    res.json({ status: 'success', ...data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
