import { Response } from 'express';
import { ShipperService } from '../services/shipper.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const shipperService = new ShipperService();

export const getPickupList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getPickupList(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getDeliveryList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getDeliveryList(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getDashboardSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getDashboardSummary(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const confirmPickup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code } = req.body;
    if (!tracking_code) {
      res.status(400).json({ status: 'error', message: 'Can cung cap tracking_code.' });
      return;
    }
    const data = await shipperService.confirmPickup(req.user.id_user, String(tracking_code).toUpperCase());
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, message: data.message });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const reportFailedPickup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code, reason_fail } = req.body;
    const data = await shipperService.reportFailedPickup(req.user.id_user, String(tracking_code).toUpperCase(), reason_fail);
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, message: data.message });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const startDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code } = req.body;
    if (!tracking_code) {
      res.status(400).json({ status: 'error', message: 'Can cung cap tracking_code.' });
      return;
    }
    const data = await shipperService.startDelivery(req.user.id_user, String(tracking_code).toUpperCase());
    res.json({ status: 'success', tracking_code: data.tracking_code, new_status: data.status, message: data.message });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const confirmDelivered = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code, evidence_url } = req.body;
    if (!tracking_code) {
      res.status(400).json({ status: 'error', message: 'Can cung cap tracking_code.' });
      return;
    }
    const data = await shipperService.confirmDelivered(
      req.user.id_user,
      String(tracking_code).toUpperCase(),
      evidence_url
    );
    res.json({
      status: 'success',
      tracking_code: data.tracking_code,
      new_status: data.status,
      message: data.message,
      collected_cod: data.collected_cod,
      collected_receiver_fee: data.collected_receiver_fee,
      total_cash_collected: data.total_cash_collected,
      payer_type: data.payer_type,
    });
  } catch (error: any) {
    res.status(409).json({ status: 'error', message: error.message });
  }
};

export const reportFailed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tracking_code, reason_fail, reason_code, evidence_url } = req.body;
    if (!tracking_code || !reason_fail) {
      res.status(400).json({ status: 'error', message: 'Can cung cap tracking_code va reason_fail.' });
      return;
    }
    const data = await shipperService.reportFailedDelivery(
      req.user.id_user,
      String(tracking_code).toUpperCase(),
      reason_fail,
      evidence_url,
      reason_code
    );
    res.json({
      status: 'success',
      tracking_code: data.tracking_code,
      new_status: data.status,
      attempt_no: data.attempt_no,
      reason_code: data.reason_code,
      redelivery_fee_charged: data.redelivery_fee_charged,
      return_fee_charged: data.return_fee_charged,
      return_formula: data.return_formula,
      failure_action: data.failure_action,
      message: data.message,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getCodSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getCodSummary(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const submitCodReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.submitCodReconciliation(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getIncome(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getIncomeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await shipperService.getIncomeHistory(req.user.id_user);
    res.json({ status: 'success', data });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
