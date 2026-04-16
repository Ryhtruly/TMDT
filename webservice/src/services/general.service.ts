import { GeneralRepository } from '../repositories/general.repository';
const repo = new GeneralRepository();

const COD_SERVICE_FEE = 5500; // Docx: phí 5.500đ/giao dịch

export class GeneralService {
  // === COD PAYOUT (Đối soát T2-T6) ===
  async requestCodPayout(id_user: number) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=CN, 1=T2, ... 5=T6
    if (dayOfWeek === 0 || dayOfWeek === 6) throw new Error('COD Payout chỉ thực hiện vào T2-T6. Hôm nay không phải ngày đối soát.');
    const payout_date = today.toISOString().split('T')[0];
    const client = await repo.getTxClient();
    try {
      // Tính tổng COD đã giao thành công
      const payouts = await repo.getPayoutsByUser(id_user);
      // Tạo phiên đối soát mới (đơn giản)
      const total_cod = 0; // Sẽ được Admin tổng hợp
      const payout = await repo.createCodPayout(id_user, total_cod, COD_SERVICE_FEE, payout_date, client);
      return { ...payout, note: `Phí dịch vụ chuyển tiền: ${COD_SERVICE_FEE.toLocaleString()}đ` };
    } finally { client.release(); }
  }

  async getMyPayouts(id_user: number) { return await repo.getPayoutsByUser(id_user); }
  async getPendingPayouts() { return await repo.getAllPendingPayouts(); }

  async approvePayout(id_payout: number) {
    const client = await repo.getTxClient();
    try { await repo.approvePayout(id_payout, client); return { message: 'Phê duyệt đối soát thành công!' }; }
    finally { client.release(); }
  }

  async rejectCodPayout(id_payout: number, id_admin: number, admin_note?: string) {
    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');
      const payout = await repo.findPayoutForUpdate(id_payout, client);
      if (!payout) throw new Error('Khong tim thay phien payout COD.');
      if (!['CHO_DUYET'].includes(String(payout.status))) {
        throw new Error(`Chi co the tu choi phien dang o trang thai CHO_DUYET. Hien tai: ${payout.status}.`);
      }
      const rejected = await repo.rejectCodPayout(id_payout, id_admin, admin_note || null, client);
      await repo.writeAuditLog(id_admin, 'REJECT_COD_PAYOUT', 'cod_payouts', {
        id_payout, reason: admin_note
      });
      await client.query('COMMIT');
      return { message: 'Da tu choi phien payout COD. Shop co the gui lai yeu cau moi.', data: rejected };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectShipperCodReconciliation(id_reconciliation: number, id_admin: number, admin_note?: string) {
    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');
      const reconciliation = await repo.findShipperCodReconciliationForUpdate(id_reconciliation, client);
      if (!reconciliation) throw new Error('Khong tim thay phieu nop tien COD cua shipper.');
      if (String(reconciliation.status) !== 'CHO_XAC_NHAN') {
        throw new Error(`Chi co the tu choi phieu dang o trang thai CHO_XAC_NHAN. Hien tai: ${reconciliation.status}.`);
      }
      const rejected = await repo.rejectShipperCodReconciliation(id_reconciliation, id_admin, admin_note || null, client);
      await repo.writeAuditLog(id_admin, 'REJECT_SHIPPER_COD_CASH', 'shipper_cod_reconciliations', {
        id_reconciliation, id_shipper: reconciliation.id_shipper, reason: admin_note
      });
      await client.query('COMMIT');
      return { message: 'Da tu choi phieu nop tien. Shipper co the nop lai phieu moi.', data: rejected };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // === PROMOTIONS ===
  async getActivePromos() { return await repo.getActivePromotions(); }
  async getAllPromos() { return await repo.getAllPromotions(); }
  async createPromo(data: any) { return await repo.createPromotion(data); }
  async togglePromo(id_promo: string, is_active: boolean) { await repo.togglePromotion(id_promo, is_active); }

  async applyPromoCode(code: string, shipping_fee: number) {
    const promo = await repo.findPromoByCode(code);
    if (!promo) throw new Error('Mã khuyến mãi không hợp lệ hoặc đã hết hạn.');
    if (shipping_fee < Number(promo.min_order || 0)) throw new Error(`Đơn hàng chưa đạt giá trị tối thiểu ${Number(promo.min_order).toLocaleString()}đ`);
    let discount = promo.promo_type === 'PERCENT' ? Math.round(shipping_fee * Number(promo.discount_value) / 100) : Number(promo.discount_value);
    if (promo.max_discount) discount = Math.min(discount, Number(promo.max_discount));
    return { original_fee: shipping_fee, discount, final_fee: Math.max(0, shipping_fee - discount), promo_code: code };
  }

  // === INCIDENTS ===
  async reportIncident(id_order: number, type: string, description: string) { return await repo.createIncident(id_order, type, description); }
  async resolveIncident(id_incident: number, compensation: number) { return await repo.resolveIncident(id_incident, compensation); }
  async getIncidents() { return await repo.getAllIncidents(); }

  // === NOTIFICATIONS ===
  async getMyNotifications(id_user: number) { return await repo.getNotificationsByUser(id_user); }
  async markRead(id_noti: number, id_user: number) { await repo.markAsRead(id_noti, id_user); }
  async markAllRead(id_user: number) { await repo.markAllRead(id_user); }
  async pushNotification(id_user: number, title: string, content: string) { await repo.createNotification(id_user, title, content); }

  // === FEEDBACKS ===
  async submitFeedback(id_user: number, title: string, content: string) { return await repo.createFeedback(id_user, title, content); }
  async getFeedbacks() { return await repo.getAllFeedbacks(); }
  async updateFeedbackStatus(id_feedback: number, status: string) { await repo.updateFeedbackStatus(id_feedback, status); }

  // === SHIPPER COD ĐỐI SOÁT CUỐI NGÀY ===
  async getShipperCodReconciliation(id_shipper: number, date: string) { return await repo.getShipperCodSummary(id_shipper, date); }

  // === HOÀN HÀNG (Docx dòng 1374: Nội tỉnh 5.000đ, tuyến khác 50% cước giao đi) ===
  async requestReturn(id_order: number) {
    const order = await repo.getOrderForReturn(id_order);
    if (!order) throw new Error('Đơn hàng không tồn tại.');
    if (!['GIAO THẤT BẠI', 'TẠI KHO'].includes(order.status)) {
      throw new Error(`Không thể hoàn hàng! Đơn đang ở "${order.status}".`);
    }

    const routeType = await repo.getRouteTypeForOrder(id_order);
    // Docx: Nội tỉnh = 5.000đ, tuyến khác = 50% cước giao đi
    const return_fee = (routeType === 'DIRECT' || routeType === 'INTRA_HUB')
      ? 5000
      : Math.round(Number(order.shipping_fee || 0) * 0.5);

    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');
      await repo.setOrderReturn(id_order, return_fee, client);
      await client.query('COMMIT');
      return {
        tracking_code: order.tracking_code,
        return_fee,
        route_type: routeType,
        formula: routeType === 'DIRECT' || routeType === 'INTRA_HUB' ? 'Nội tỉnh: 5.000đ' : `50% × ${Number(order.shipping_fee).toLocaleString()}đ`,
        message: `Đơn đã chuyển HOÀN HÀNG. Phí hoàn: ${return_fee.toLocaleString()}đ`
      };
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }

  // === SHIPPER INCOME (Docx bảng 33: lương cứng + hoa hồng 3k-5k/đơn - phạt) ===
  async calcShipperIncome(id_user: number, period?: string) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM
    const income = await repo.getOrCreateShipperIncome(id_user, currentPeriod);
    const commission = await repo.calcShipperCommission(id_user, currentPeriod);

    const base_salary = Number(income.base_salary);
    const total_commission = commission.total_commission;
    const penalty = Number(income.penalty);
    const net_salary = base_salary + total_commission - penalty;

    return {
      period: currentPeriod,
      base_salary,
      total_delivered: commission.total_delivered,
      rate_per_order: commission.rate_per_order,
      total_commission,
      penalty,
      net_salary,
      formula: `${base_salary.toLocaleString()} + (${commission.total_delivered} × ${commission.rate_per_order.toLocaleString()}) - ${penalty.toLocaleString()} = ${net_salary.toLocaleString()}đ`
    };
  }

  async getShipperIncomeHistory(id_user: number) { return await repo.getShipperIncomeHistory(id_user); }

  async setShipperSalary(id_user: number, period: string, base_salary: number, penalty: number) {
    const income = await repo.getOrCreateShipperIncome(id_user, period);
    const commission = await repo.calcShipperCommission(id_user, period);
    await repo.updateShipperIncome(income.id_income, base_salary, commission.total_commission, penalty);
    return { message: `Đã cập nhật lương Shipper kỳ ${period}.` };
  }

  // === AUDIT LOG (Docx bảng 34) ===
  async writeAudit(id_actor: number, action: string, object_type: string, payload: any) {
    await repo.writeAuditLog(id_actor, action, object_type, payload);
  }
  async getAuditLogs(limit?: number) { return await repo.getAuditLogs(limit); }

  // === BÁO CÁO VẬN HÀNH SHOP (Docx dòng 1426-1433) ===
  async getOperationsReport(id_user: number) {
    const report = await repo.getShopOperationsReport(id_user);
    if (!report) throw new Error('Không tìm thấy Shop của tài khoản này.');
    return report;
  }

  // === TÌM KIẾM ĐƠN NÂNG CAO (Docx dòng 1399, 1526) ===
  async searchOrders(id_user: number, filters: any) { return await repo.searchOrders(id_user, filters); }

  // === AN TOÀN XÓA KHO (Docx dòng 29) ===
  async checkSafeDeleteHub(id_hub: number) {
    const hasOrders = await repo.hasActiveOrdersInHub(id_hub);
    if (hasOrders) throw new Error('Không thể xóa Hub! Vẫn còn đơn hàng đang lưu kho tại đây.');
    return { safe: true, message: 'Hub an toàn để xóa.' };
  }

  async checkSafeDeleteSpoke(id_spoke: number) {
    const hasOrders = await repo.hasActiveOrdersInSpoke(id_spoke);
    if (hasOrders) throw new Error('Không thể xóa Spoke! Vẫn còn đơn hàng đang lưu kho tại đây.');
    return { safe: true, message: 'Spoke an toàn để xóa.' };
  }
}
