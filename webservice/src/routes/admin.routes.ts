import { Router } from 'express';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware';
import {
  createEmployee, getDashboardStats, getInfrastructureList,
  createHub, updateHub, deleteHub,
  createSpoke, updateSpoke, deleteSpoke, setAreaCoverage,
  configPricing, getAllRoles, grantRole, revokeRole, setInsuranceConfig,
  getEmployees, deactivateEmployee, getAllShops, getAllOrders, getAllBags,
  getPricingRules, getServiceTypes, updateServiceType, getShipperWardAssignments,
  createShipperWardAssignment, deleteShipperWardAssignment, autoGenerateRoute
} from '../controllers/admin.controller';

const router = Router();

// ==========================================
// 🛡️ Bức Tường Lửa Bảo Vệ Mọi Thuật Toán Của Nhánh Này
// ==========================================
router.use(verifyToken);
router.use(checkRoles(['ADMIN'])); 

// API Auto-Generate Tuyến Đường
router.post('/routes/auto-generate', autoGenerateRoute);

// API Khởi Tạo Nhân Viên Mới (Kèm phân Hub/Spoke/Role)
router.post('/employees', createEmployee);

// API Dashboard trả Biểu Đồ Thống Kê Chung
router.get('/dashboard-stats', getDashboardStats);

// API Xuất Sổ Hạ Tầng Logistics Cốt Lõi
router.get('/infrastructure', getInfrastructureList);

// Hubs
router.post('/hubs', createHub);
router.put('/hubs/:id', updateHub);
router.delete('/hubs/:id', deleteHub);

// Spokes
router.post('/spokes', createSpoke);
router.put('/spokes/:id', updateSpoke);
router.delete('/spokes/:id', deleteSpoke);

// Phân vùng bản đồ
router.post('/areas', setAreaCoverage);

// Cấu hình bảng Giá Cước
router.put('/pricing-rules', configPricing);

// Cấu hình % Phí bảo hiểm
router.put('/insurance-config', setInsuranceConfig);

// Quản lý Quyền (Roles)
router.get('/roles', getAllRoles);
router.post('/user-roles', grantRole);
router.delete('/user-roles', revokeRole);

// Nhân viên (Employees)
router.get('/employees', getEmployees);
router.put('/employees/:id/deactivate', deactivateEmployee);

// Đối tác (Shops)
router.get('/shops', getAllShops);

// Đơn hàng toàn hệ thống
router.get('/orders', getAllOrders);

// Bao kiện
router.get('/bags', getAllBags);

// Bảng giá & Dịch vụ
router.get('/pricing-rules', getPricingRules);
router.get('/service-types', getServiceTypes);
router.put('/service-types/:id', updateServiceType);
router.get('/shipper-ward-assignments', getShipperWardAssignments);
router.post('/shipper-ward-assignments', createShipperWardAssignment);
router.delete('/shipper-ward-assignments/:id', deleteShipperWardAssignment);

export default router;
