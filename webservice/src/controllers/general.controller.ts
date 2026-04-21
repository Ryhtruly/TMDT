import { Request, Response } from 'express';
import { RoutingService } from '../services/routing.service';
import { BagService } from '../services/bag.service';
import { GeneralService } from '../services/general.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const routingService = new RoutingService();
const bagService = new BagService();
const generalService = new GeneralService();

// ============ ROUTING ============
export const resolveRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id_store, id_dest_area, service_type } = req.body;
    const data = await routingService.resolveRoute(id_store, id_dest_area, service_type);
    res.json({ status: 'success', data });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getAllRoutes = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await routingService.getAllRoutes() }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getRouteDetail = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await routingService.getRouteDetail(parseInt(String(req.params.id))) }); }
  catch (e: any) { res.status(404).json({ status: 'error', message: e.message }); }
};

// ============ BAGS ============
export const createBag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { origin_hub_id, dest_hub_id, order_ids } = req.body;
    const data = await bagService.createBag(origin_hub_id, dest_hub_id, order_ids);
    res.status(201).json({ status: 'success', message: 'Tạo bao hàng thành công!', data });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const scanBag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bag_code, action } = req.body;
    const data = await bagService.scanBag(bag_code, action);
    res.json({ status: 'success', ...data });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getBagDetail = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await bagService.getBagDetail(String(req.params.code)) }); }
  catch (e: any) { res.status(404).json({ status: 'error', message: e.message }); }
};

// ============ COD PAYOUT ============
export const requestPayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.requestCodPayout(req.user.id_user, parseInt(String(req.body.id_bank))) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getMyPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getMyPayouts(req.user.id_user) }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getPendingPayouts = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getPendingPayouts() }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const approvePayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    res.json({
      status: 'success',
      ...(await generalService.approvePayout(parseInt(String(req.params.id)), authReq.user.id_user, req.body?.admin_note))
    });
  }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getAdminShipperCodReconciliations = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    res.json({ status: 'success', data: await generalService.getAdminShipperCodReconciliations(status) });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const confirmShipperCodReconciliation = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    res.json({
      status: 'success',
      ...(await generalService.confirmShipperCodReconciliation(
        parseInt(String(req.params.id)),
        authReq.user.id_user,
        req.body?.admin_note
      ))
    });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ PROMOTIONS ============
export const getPromos = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getActivePromos() }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getAllPromos = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getAllPromos() }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createPromo = async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ status: 'success', data: await generalService.createPromo(req.body) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const togglePromo = async (req: Request, res: Response): Promise<void> => {
  try { await generalService.togglePromo(String(req.params.id), req.body.is_active); res.json({ status: 'success', message: 'Đã cập nhật trạng thái khuyến mãi.' }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const applyPromo = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.applyPromoCode(req.body.code, req.body.shipping_fee) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ INCIDENTS ============
export const reportIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(201).json({ status: 'success', data: await generalService.reportIncident(req.body.id_order, req.body.type, req.body.description) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const resolveIncident = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.resolveIncident(parseInt(String(req.params.id)), req.body.compensation) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getIncidents = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getIncidents() }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ============ NOTIFICATIONS ============
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getMyNotifications(req.user.id_user) }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await generalService.markRead(parseInt(String(req.params.id)), req.user.id_user); res.json({ status: 'success', message: 'Đã đọc.' }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try { await generalService.markAllRead(req.user.id_user); res.json({ status: 'success', message: 'Đã đánh dấu tất cả là đã đọc.' }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ FEEDBACKS ============
export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.status(201).json({ status: 'success', data: await generalService.submitFeedback(req.user.id_user, req.body.title, req.body.content) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getFeedbacks = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getFeedbacks() }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getMyFeedbacks = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getMyFeedbacks(req.user.id_user) }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateFeedbackStatus = async (req: Request, res: Response): Promise<void> => {
  try { await generalService.updateFeedbackStatus(parseInt(String(req.params.id)), req.body.status); res.json({ status: 'success', message: 'Cập nhật trạng thái.' }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ SHIPPER COD RECONCILIATION ============
export const getShipperCodSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    res.json({ status: 'success', data: await generalService.getShipperCodReconciliation(req.user.id_user, date) });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ HOÀN HÀNG ============
export const getReturnQuote = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getReturnQuote(req.user.id_user, parseInt(String(req.params.id))) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const requestReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', ...(await generalService.requestReturn(req.user.id_user, parseInt(String(req.params.id)))) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ SHIPPER INCOME (Lương) ============
export const calcShipperIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const period = req.query.period as string | undefined;
    res.json({ status: 'success', data: await generalService.calcShipperIncome(req.user.id_user, period) });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

export const getShipperIncomeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getShipperIncomeHistory(req.user.id_user) }); }
  catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const setShipperSalary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id_user, period, base_salary, penalty } = req.body;
    res.json({ status: 'success', ...(await generalService.setShipperSalary(id_user, period, base_salary, penalty || 0)) });
  } catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ AUDIT LOG ============
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(String(req.query.limit)) || 50;
    res.json({ status: 'success', data: await generalService.getAuditLogs(limit) });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ============ BÁO CÁO VẬN HÀNH ============
export const getOperationsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.getOperationsReport(req.user.id_user) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ TÌM KIẾM NÂNG CAO ============
export const searchOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json({ status: 'success', data: await generalService.searchOrders(req.user.id_user, req.query) }); }
  catch (e: any) { res.status(400).json({ status: 'error', message: e.message }); }
};

// ============ AN TOÀN XÓA KHO ============
export const checkSafeDeleteHub = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', ...(await generalService.checkSafeDeleteHub(parseInt(String(req.params.id)))) }); }
  catch (e: any) { res.status(409).json({ status: 'error', message: e.message }); }
};

export const checkSafeDeleteSpoke = async (req: Request, res: Response): Promise<void> => {
  try { res.json({ status: 'success', ...(await generalService.checkSafeDeleteSpoke(parseInt(String(req.params.id)))) }); }
  catch (e: any) { res.status(409).json({ status: 'error', message: e.message }); }
};
