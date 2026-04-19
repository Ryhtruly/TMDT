import { GeneralRepository } from '../repositories/general.repository';

const repo = new GeneralRepository();

const COD_SERVICE_FEE = 5500;

export class GeneralService {
  // === COD PAYOUT: shop requests APP to transfer reconciled COD to a bank account ===
  async requestCodPayout(id_user: number, id_bank: number) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error('COD payout chi thuc hien vao T2-T6.');
    }
    if (!id_bank) throw new Error('Vui long chon tai khoan ngan hang nhan COD.');

    const bank = await repo.findBankByUser(id_user, id_bank);
    if (!bank) throw new Error('Tai khoan ngan hang khong ton tai hoac khong thuoc shop nay.');

    const payoutDate = today.toISOString().split('T')[0];
    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');

      const orders = await repo.getEligibleCodOrdersForPayout(id_user, client);
      if (orders.length === 0) {
        throw new Error('Chua co COD du dieu kien rut. Don phai giao thanh cong va tien shipper phai duoc admin xac nhan da thu.');
      }

      const totalCod = orders.reduce((sum: number, order: any) => sum + Number(order.cod_amount || 0), 0);
      if (totalCod <= COD_SERVICE_FEE) {
        throw new Error(`Tong COD phai lon hon phi chuyen tien ${COD_SERVICE_FEE.toLocaleString('vi-VN')}d.`);
      }

      const serviceFee = COD_SERVICE_FEE;
      const netAmount = totalCod - serviceFee;
      const payout = await repo.createCodPayout(
        id_user,
        id_bank,
        totalCod,
        serviceFee,
        netAmount,
        payoutDate,
        client
      );

      await repo.createCodPayoutItems(payout.id_payout, orders, client);
      await repo.writeAuditLog(id_user, 'REQUEST_COD_PAYOUT', 'cod_payouts', {
        id_payout: payout.id_payout,
        total_cod: totalCod,
        service_fee: serviceFee,
        net_amount: netAmount,
        order_ids: orders.map((order: any) => order.id_order),
      });

      await client.query('COMMIT');
      return {
        ...payout,
        order_count: orders.length,
        bank_name: bank.bank_name,
        account_number: bank.account_number,
        account_holder: bank.account_holder,
        note: `Tien se chuyen ve ngan hang sau khi admin duyet. Phi chuyen tien: ${serviceFee.toLocaleString('vi-VN')}d`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMyPayouts(id_user: number) {
    const [eligibleOrders, payouts] = await Promise.all([
      repo.getEligibleCodOrdersForPayout(id_user),
      repo.getPayoutsByUser(id_user),
    ]);
    const eligibleCod = eligibleOrders.reduce((sum: number, order: any) => sum + Number(order.cod_amount || 0), 0);
    const serviceFee = eligibleCod > COD_SERVICE_FEE ? COD_SERVICE_FEE : 0;

    return {
      eligible_orders: eligibleOrders,
      eligible_cod: eligibleCod,
      service_fee: serviceFee,
      net_amount: Math.max(0, eligibleCod - serviceFee),
      payouts,
    };
  }

  async getPendingPayouts() {
    return await repo.getAllCodPayouts();
  }

  async approvePayout(id_payout: number, id_admin: number, admin_note?: string) {
    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');

      const payout = await repo.findPayoutForUpdate(id_payout, client);
      if (!payout) throw new Error('Khong tim thay phien payout COD.');
      if (String(payout.status) === 'DA_CHUYEN') throw new Error('Phien payout nay da duoc thanh toan.');
      if (String(payout.status) !== 'CHO_DUYET') {
        throw new Error(`Khong the duyet phien payout dang o trang thai ${payout.status}.`);
      }

      const approved = await repo.approvePayout(id_payout, id_admin, admin_note || null, client);
      await repo.writeAuditLog(id_admin, 'APPROVE_COD_PAYOUT', 'cod_payouts', {
        id_payout,
        id_account: payout.id_account,
        total_cod: payout.total_cod,
        service_fee: payout.service_fee,
        net_amount: payout.net_amount,
      });

      await client.query('COMMIT');
      return { message: 'Da xac nhan chuyen COD cho shop.', data: approved };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAdminShipperCodReconciliations(status?: string) {
    return await repo.getAdminShipperCodReconciliations(status);
  }

  async confirmShipperCodReconciliation(id_reconciliation: number, id_admin: number, admin_note?: string) {
    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');

      const reconciliation = await repo.findShipperCodReconciliationForUpdate(id_reconciliation, client);
      if (!reconciliation) throw new Error('Khong tim thay phieu nop tien COD cua shipper.');
      if (String(reconciliation.status) === 'DA_XAC_NHAN') {
        throw new Error('Phieu nay da duoc admin xac nhan truoc do.');
      }

      const confirmed = await repo.confirmShipperCodReconciliation(
        id_reconciliation,
        id_admin,
        admin_note || null,
        client
      );
      await repo.writeAuditLog(id_admin, 'CONFIRM_SHIPPER_COD_CASH', 'shipper_cod_reconciliations', {
        id_reconciliation,
        id_shipper: reconciliation.id_shipper,
        total_cash: reconciliation.total_cash,
      });

      await client.query('COMMIT');
      return { message: 'Da xac nhan shipper nop du tien COD ve APP.', data: confirmed };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
    if (!promo) throw new Error('Ma khuyen mai khong hop le hoac da het han.');
    if (shipping_fee < Number(promo.min_order || 0)) {
      throw new Error(`Don hang chua dat gia tri toi thieu ${Number(promo.min_order).toLocaleString('vi-VN')}d`);
    }
    let discount = promo.promo_type === 'PERCENT'
      ? Math.round(shipping_fee * Number(promo.discount_value) / 100)
      : Number(promo.discount_value);
    if (promo.max_discount) discount = Math.min(discount, Number(promo.max_discount));
    return { original_fee: shipping_fee, discount, final_fee: Math.max(0, shipping_fee - discount), promo_code: code };
  }

  // === INCIDENTS ===
  async reportIncident(id_order: number, type: string, description: string) {
    return await repo.createIncident(id_order, type, description);
  }
  async resolveIncident(id_incident: number, compensation: number) {
    return await repo.resolveIncident(id_incident, compensation);
  }
  async getIncidents() { return await repo.getAllIncidents(); }

  // === NOTIFICATIONS ===
  async getMyNotifications(id_user: number) { return await repo.getNotificationsByUser(id_user); }
  async markRead(id_noti: number, id_user: number) { await repo.markAsRead(id_noti, id_user); }
  async markAllRead(id_user: number) { await repo.markAllRead(id_user); }
  async pushNotification(id_user: number, title: string, content: string) {
    await repo.createNotification(id_user, title, content);
  }

  // === FEEDBACKS ===
  async submitFeedback(id_user: number, title: string, content: string) {
    return await repo.createFeedback(id_user, title, content);
  }
  async getFeedbacks() { return await repo.getAllFeedbacks(); }
  async getMyFeedbacks(id_user: number) { return await repo.getFeedbacksByUser(id_user); }
  async updateFeedbackStatus(id_feedback: number, status: string) {
    await repo.updateFeedbackStatus(id_feedback, status);
  }

  // === SHIPPER COD DOI SOAT CUOI NGAY ===
  async getShipperCodReconciliation(id_shipper: number, date: string) {
    return await repo.getShipperCodSummary(id_shipper, date);
  }

  // === RETURN ORDERS ===
  async requestReturn(id_order: number) {
    const order = await repo.getOrderForReturn(id_order);
    if (!order) throw new Error('Don hang khong ton tai.');
    if (!['GIAO THẤT BẠI', 'TẠI KHO'].includes(order.status)) {
      throw new Error(`Khong the hoan hang. Don dang o trang thai "${order.status}".`);
    }

    const routeType = await repo.getRouteTypeForOrder(id_order);
    const returnFee = (routeType === 'DIRECT' || routeType === 'INTRA_HUB')
      ? 5000
      : Math.round(Number(order.shipping_fee || 0) * 0.5);

    const client = await repo.getTxClient();
    try {
      await client.query('BEGIN');
      await repo.setOrderReturn(id_order, returnFee, client);
      await client.query('COMMIT');
      return {
        tracking_code: order.tracking_code,
        return_fee: returnFee,
        route_type: routeType,
        formula: routeType === 'DIRECT' || routeType === 'INTRA_HUB'
          ? 'Noi tinh: 5.000d'
          : `50% x ${Number(order.shipping_fee).toLocaleString('vi-VN')}d`,
        message: `Don da chuyen HOAN HANG. Phi hoan: ${returnFee.toLocaleString('vi-VN')}d`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // === SHIPPER INCOME ===
  async calcShipperIncome(id_user: number, period?: string) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
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
      formula: `${base_salary.toLocaleString('vi-VN')} + (${commission.total_delivered} x ${commission.rate_per_order.toLocaleString('vi-VN')}) - ${penalty.toLocaleString('vi-VN')} = ${net_salary.toLocaleString('vi-VN')}d`,
    };
  }

  async getShipperIncomeHistory(id_user: number) { return await repo.getShipperIncomeHistory(id_user); }

  async setShipperSalary(id_user: number, period: string, base_salary: number, penalty: number) {
    const income = await repo.getOrCreateShipperIncome(id_user, period);
    const commission = await repo.calcShipperCommission(id_user, period);
    await repo.updateShipperIncome(income.id_income, base_salary, commission.total_commission, penalty);
    return { message: `Da cap nhat luong shipper ky ${period}.` };
  }

  // === AUDIT LOG ===
  async writeAudit(id_actor: number, action: string, object_type: string, payload: any) {
    await repo.writeAuditLog(id_actor, action, object_type, payload);
  }
  async getAuditLogs(limit?: number) { return await repo.getAuditLogs(limit); }

  // === SHOP OPERATIONS ===
  async getOperationsReport(id_user: number) {
    const report = await repo.getShopOperationsReport(id_user);
    if (!report) throw new Error('Khong tim thay shop cua tai khoan nay.');
    return report;
  }

  async searchOrders(id_user: number, filters: any) {
    return await repo.searchOrders(id_user, filters);
  }

  async checkSafeDeleteHub(id_hub: number) {
    const hasOrders = await repo.hasActiveOrdersInHub(id_hub);
    if (hasOrders) throw new Error('Khong the xoa Hub. Van con don hang dang luu kho tai day.');
    return { safe: true, message: 'Hub an toan de xoa.' };
  }

  async checkSafeDeleteSpoke(id_spoke: number) {
    const hasOrders = await repo.hasActiveOrdersInSpoke(id_spoke);
    if (hasOrders) throw new Error('Khong the xoa Spoke. Van con don hang dang luu kho tai day.');
    return { safe: true, message: 'Spoke an toan de xoa.' };
  }
}
