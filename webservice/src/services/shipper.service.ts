import { ShipperRepository } from '../repositories/shipper.repository';

const shipperRepo = new ShipperRepository();

const FREE_DELIVERY_LIMIT = 3;
const REDELIVERY_FEE = 11000;

const REDELIVERY_REASON_CODES = new Set([
  'CUSTOMER_UNREACHABLE',
  'CUSTOMER_NOT_HOME',
  'RESCHEDULE_REQUEST',
  'TEMPORARY_ISSUE',
]);

const RETURN_REASON_CODES = new Set([
  'CUSTOMER_REJECTED',
  'INVALID_ADDRESS',
  'NON_EXISTENT_RECEIVER',
]);

const normalizeText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();

export class ShipperService {
  private async getEmployeeId(id_user: number) {
    const emp = await shipperRepo.findEmployeeByUserId(id_user);
    if (!emp) throw new Error('Tai khoan nay khong co ho so nhan vien. Lien he admin.');
    return emp.id_employee;
  }

  private async getSpokeAssignment(id_user: number) {
    const id_employee = await this.getEmployeeId(id_user);
    const assignment = await shipperRepo.getShipperAssignment(id_employee);
    if (!assignment?.id_spoke) {
      throw new Error('Ban chua duoc phan cong khu vuc giao hang. Lien he admin.');
    }
    return assignment;
  }

  private normalizeDeliveryFailReasonCode(reason_fail: string, reason_code?: string) {
    const code = String(reason_code || '').trim().toUpperCase();
    if (REDELIVERY_REASON_CODES.has(code) || RETURN_REASON_CODES.has(code)) return code;

    const text = normalizeText(reason_fail);
    if (text.includes('tu choi')) return 'CUSTOMER_REJECTED';
    if (text.includes('khong ton tai')) return 'NON_EXISTENT_RECEIVER';
    if (text.includes('sai dia chi')) return 'INVALID_ADDRESS';
    if (text.includes('vang nha')) return 'CUSTOMER_NOT_HOME';
    if (text.includes('hen giao lai')) return 'RESCHEDULE_REQUEST';
    if (text.includes('khong nghe') || text.includes('khong lien lac')) return 'CUSTOMER_UNREACHABLE';
    return 'TEMPORARY_ISSUE';
  }

  private buildReturnFee(order: any) {
    const shippingFee = Number(order.shipping_fee || 0);
    const isHeavy = Number(order.weight || 0) >= 20000;
    return {
      returnFee: Math.round(shippingFee * (isHeavy ? 1 : 0.5)),
      formula: isHeavy
        ? `Hang nang: 100% x ${shippingFee.toLocaleString('vi-VN')}d`
        : `Hang nhe: 50% x ${shippingFee.toLocaleString('vi-VN')}d`,
    };
  }

  async getPickupList(id_user: number) {
    const assignment = await this.getSpokeAssignment(id_user);
    const candidates = await shipperRepo.getPickupCandidates();

    const orders = [];
    for (const order of candidates) {
      const originArea = await shipperRepo.resolveSpokeByAddress(order.pickup_address || '');
      if (originArea?.id_spoke !== assignment.id_spoke) {
        continue;
      }

      const assignedShipperId = await shipperRepo.resolveAssignedShipperByAddress(
        assignment.id_spoke,
        order.pickup_address || ''
      );

      if (!assignedShipperId || Number(assignedShipperId) === Number(id_user)) {
        orders.push(order);
      }
    }

    return {
      assigned_spoke: assignment.spoke_name,
      total: orders.length,
      orders,
    };
  }

  async getDeliveryList(id_user: number) {
    const assignment = await this.getSpokeAssignment(id_user);
    const orders = await shipperRepo.getOrdersToDeliver(assignment.id_spoke, id_user);
    return {
      assigned_spoke: assignment.spoke_name,
      total: orders.length,
      orders,
    };
  }

  async getDashboardSummary(id_user: number) {
    const [pickupData, deliveryData, codData, dayStats] = await Promise.all([
      this.getPickupList(id_user),
      this.getDeliveryList(id_user),
      this.getCodSummary(id_user),
      shipperRepo.getTodayDeliveryStats(id_user),
    ]);

    const activeDeliveries = deliveryData.orders.filter((order: any) =>
      ['ĐÃ LẤY HÀNG', 'ĐANG GIAO'].includes(order.status)
    );

    return {
      assigned_spoke: pickupData.assigned_spoke || deliveryData.assigned_spoke || 'Chua phan cong',
      pickup_count: pickupData.orders.length,
      delivery_count: activeDeliveries.length,
      delivered_today: Number(dayStats.delivered_today || 0),
      failed_today: Number(dayStats.failed_today || 0),
      pending_cod: Number(codData.total_cash_held || 0),
    };
  }

  async confirmPickup(id_user: number, tracking_code: string) {
    const assignment = await this.getSpokeAssignment(id_user);
    const idLocation = await shipperRepo.getSpokeLocation(assignment.id_spoke);
    const client = await shipperRepo.getTxClient();

    try {
      await client.query('BEGIN');

      const order = await shipperRepo.findOrderByTrackingForUpdate(tracking_code, client);
      if (!order) throw new Error(`Khong tim thay don hang: ${tracking_code}`);
      if (order.status === 'ĐÃ LẤY HÀNG' && order.latest_action === 'XUAT KHO -> GIAO CUOI') {
        throw new Error('Don da san sang cho giao cuoi chang. Hay dung chuc nang "Bat dau giao".');
      }
      if (order.status !== 'CHỜ LẤY HÀNG') {
        throw new Error(`Khong the lay hang. Don dang o trang thai "${order.status}".`);
      }

      const originArea = await shipperRepo.resolveSpokeByAddress(order.store_address || '');
      if (!originArea || Number(originArea.id_spoke) !== Number(assignment.id_spoke)) {
        throw new Error('Don nay khong thuoc khu vuc lay hang cua ban.');
      }

      const assignedShipperId = await shipperRepo.resolveAssignedShipperByAddress(
        assignment.id_spoke,
        order.store_address || ''
      );
      if (assignedShipperId && Number(assignedShipperId) !== Number(id_user)) {
        throw new Error('Don nay da duoc he thong phan cho shipper khac trong khu vuc.');
      }

      await shipperRepo.updateOrderStatus(order.id_order, 'ĐÃ LẤY HÀNG', client);
      await shipperRepo.updateCurrentShipper(order.id_order, null, client);
      const pickupCashItems = await shipperRepo.markCashCollectionsCollected(order.id_order, 'PICKUP', id_user, client);
      await shipperRepo.insertOrderLog(order.id_order, idLocation, id_user, 'LAY HANG THANH CONG', null, client);

      await client.query('COMMIT');

      return {
        tracking_code,
        status: 'ĐÃ LẤY HÀNG',
        sender_cash_collected: pickupCashItems.reduce((sum: number, item: any) => sum + Number(item.collected_amount || 0), 0),
        message: pickupCashItems.length > 0
          ? `Xac nhan lay hang thanh cong. Shipper da thu ${pickupCashItems.reduce((sum: number, item: any) => sum + Number(item.collected_amount || 0), 0).toLocaleString('vi-VN')}d phi ship tien mat tu shop.`
          : 'Xac nhan lay hang thanh cong.',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reportFailedPickup(id_user: number, tracking_code: string, reason_fail: string) {
    if (!reason_fail) throw new Error('Bat buoc nhap ly do lay hang that bai.');

    const assignment = await this.getSpokeAssignment(id_user);
    const idLocation = await shipperRepo.getSpokeLocation(assignment.id_spoke);
    const client = await shipperRepo.getTxClient();

    try {
      await client.query('BEGIN');

      const order = await shipperRepo.findOrderByTrackingForUpdate(tracking_code, client);
      if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);
      
      if (order.status !== 'CHỜ LẤY HÀNG') {
        throw new Error(`Chi co the bao that bai khi don dang o trang thai "CHỜ LẤY HÀNG". Hien tai: "${order.status}".`);
      }

      const originArea = await shipperRepo.resolveSpokeByAddress(order.store_address || '');
      if (!originArea || Number(originArea.id_spoke) !== Number(assignment.id_spoke)) {
        throw new Error('Don nay khong thuoc khu vuc lay hang cua ban.');
      }

      await shipperRepo.updateOrderStatus(order.id_order, 'LẤY HÀNG THẤT BẠI', client);
      await shipperRepo.updateCurrentShipper(order.id_order, null, client);
      await shipperRepo.insertOrderLog(
        order.id_order,
        idLocation,
        id_user,
        `LAY HANG THAT BAI. Ly do: ${reason_fail}`,
        null,
        client
      );

      await client.query('COMMIT');

      return {
        tracking_code,
        status: 'LẤY HÀNG THẤT BẠI',
        message: `Ghi nhan lay hang that bai voi ly do: ${reason_fail}`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async startDelivery(id_user: number, tracking_code: string) {
    const assignment = await this.getSpokeAssignment(id_user);
    const idLocation = await shipperRepo.getSpokeLocation(assignment.id_spoke);
    const client = await shipperRepo.getTxClient();

    try {
      await client.query('BEGIN');

      const order = await shipperRepo.findOrderByTrackingForUpdate(tracking_code, client);
      if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);
      if (!['ĐÃ LẤY HÀNG', 'GIAO THẤT BẠI'].includes(order.status)) {
        throw new Error(`Don dang o trang thai "${order.status}", khong the bat dau giao.`);
      }
      if (order.status === 'ĐÃ LẤY HÀNG' && order.latest_action !== 'XUAT KHO -> GIAO CUOI') {
        throw new Error('Don chua duoc ban giao cho shipper giao cuoi chang.');
      }
      if (Number(order.dest_spoke || 0) !== Number(assignment.id_spoke)) {
        throw new Error('Don nay khong thuoc khu vuc giao hang cua ban.');
      }
      if (order.current_shipper_id && Number(order.current_shipper_id) !== Number(id_user)) {
        throw new Error('Don nay dang duoc shipper khac xu ly.');
      }

      await shipperRepo.updateCurrentShipper(order.id_order, id_user, client);
      await shipperRepo.updateOrderStatus(order.id_order, 'ĐANG GIAO', client);
      await shipperRepo.insertOrderLog(order.id_order, idLocation, id_user, 'BAT DAU GIAO HANG', null, client);

      await client.query('COMMIT');

      return {
        tracking_code,
        status: 'ĐANG GIAO',
        message: 'Don dang tren duong giao.',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmDelivered(id_user: number, tracking_code: string, evidence_url?: string) {
    const assignment = await this.getSpokeAssignment(id_user);
    const idLocation = await shipperRepo.getSpokeLocation(assignment.id_spoke);
    const client = await shipperRepo.getTxClient();

    try {
      await client.query('BEGIN');

      const order = await shipperRepo.findOrderByTrackingForUpdate(tracking_code, client);
      if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);
      if (order.status !== 'ĐANG GIAO') {
        throw new Error(`Khong the xac nhan giao thanh cong. Don dang o trang thai "${order.status}".`);
      }
      if (Number(order.current_shipper_id || 0) !== Number(id_user)) {
        throw new Error('Don nay khong nam trong danh sach dang giao cua ban.');
      }

      const attemptCount = await shipperRepo.countDeliveryAttempts(order.id_order);
      const codAmount = Number(order.cod_amount || 0);
      const deliveryCashItems = await shipperRepo.markCashCollectionsCollected(order.id_order, 'DELIVERY', id_user, client);
      const receiverFeeAmount = deliveryCashItems
        .filter((item: any) => ['SHIPPING_FEE', 'INSURANCE_FEE'].includes(String(item.collection_type)))
        .reduce((sum: number, item: any) => sum + Number(item.collected_amount || 0), 0);
      const deliveryCodAmount = deliveryCashItems
        .filter((item: any) => String(item.collection_type) === 'COD')
        .reduce((sum: number, item: any) => sum + Number(item.collected_amount || 0), 0);
      const totalCashCollected = deliveryCashItems.reduce((sum: number, item: any) => sum + Number(item.collected_amount || 0), 0);

      await shipperRepo.insertDeliveryAttempt(
        order.id_order,
        attemptCount + 1,
        id_user,
        'THÀNH CÔNG',
        null,
        null,
        evidence_url || null,
        client
      );
      await shipperRepo.updateOrderStatus(order.id_order, 'GIAO THÀNH CÔNG', client);
      await shipperRepo.updateCurrentShipper(order.id_order, id_user, client);
      await shipperRepo.insertOrderLog(
        order.id_order,
        idLocation,
        id_user,
        'GIAO HANG THANH CONG',
        evidence_url || null,
        client
      );

      await client.query('COMMIT');

      const parts = [];
      if (deliveryCodAmount > 0) parts.push(`COD ${deliveryCodAmount.toLocaleString()}d`);
      if (receiverFeeAmount > 0) parts.push(`phi tien mat ${receiverFeeAmount.toLocaleString()}d`);
      const cashNote = totalCashCollected > 0 ? ` Shipper dang giu ${parts.join(' + ')}.` : '';

      return {
        tracking_code,
        status: 'GIAO THÀNH CÔNG',
        collected_cod: deliveryCodAmount || codAmount,
        collected_receiver_fee: receiverFeeAmount,
        total_cash_collected: totalCashCollected,
        payer_type: String(order.payer_type || 'SENDER').toUpperCase(),
        message: `Xac nhan giao hang thanh cong.${cashNote}`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reportFailedDelivery(id_user: number, tracking_code: string, reason_fail: string, evidence_url?: string, reason_code?: string) {
    if (!reason_fail) throw new Error('Bat buoc nhap ly do giao hang that bai.');

    const assignment = await this.getSpokeAssignment(id_user);
    const idLocation = await shipperRepo.getSpokeLocation(assignment.id_spoke);
    const client = await shipperRepo.getTxClient();

    try {
      await client.query('BEGIN');

      const order = await shipperRepo.findOrderByTrackingForUpdate(tracking_code, client);
      if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);
      if (order.status !== 'ĐANG GIAO') {
        throw new Error(`Chi co the bao that bai khi don dang o trang thai "ĐANG GIAO". Hien tai: "${order.status}".`);
      }
      if (Number(order.current_shipper_id || 0) !== Number(id_user)) {
        throw new Error('Don nay khong nam trong danh sach dang giao cua ban.');
      }

      const attemptCount = await shipperRepo.countDeliveryAttempts(order.id_order);
      const newAttemptNo = attemptCount + 1;
      const normalizedReasonCode = this.normalizeDeliveryFailReasonCode(reason_fail, reason_code);
      const mustReturn = RETURN_REASON_CODES.has(normalizedReasonCode);
      const isChargeable = newAttemptNo > FREE_DELIVERY_LIMIT;

      await shipperRepo.insertDeliveryAttempt(
        order.id_order,
        newAttemptNo,
        id_user,
        'THẤT BẠI',
        reason_fail,
        normalizedReasonCode,
        evidence_url || null,
        client
      );

      let redeliveryFeeCharged = 0;
      let returnFeeCharged = 0;
      let returnFormula = '';
      if (mustReturn) {
        const shopWallet = await shipperRepo.findWalletByShopOrder(order.id_order, client);
        if (!shopWallet) throw new Error('Khong tim thay vi shop de tinh phi hoan hang.');
        const { returnFee, formula } = this.buildReturnFee(order);
        returnFeeCharged = returnFee;
        returnFormula = formula;
        if (returnFee > 0) {
          await shipperRepo.chargeRedeliveryFee(shopWallet.id_wallet, returnFee, client, `PHI HOAN HANG ${tracking_code}`);
        }
        await shipperRepo.markOrderReturn(order.id_order, returnFee, client);
      } else if (isChargeable) {
        const shopWallet = await shipperRepo.findWalletByShopOrder(order.id_order, client);
        if (shopWallet) {
          redeliveryFeeCharged = await shipperRepo.chargeRedeliveryFee(shopWallet.id_wallet, REDELIVERY_FEE, client);
        }
      }

      if (!mustReturn) {
        await shipperRepo.updateOrderStatus(order.id_order, 'GIAO THẤT BẠI', client);
        await shipperRepo.updateCurrentShipper(order.id_order, null, client);
      }
      await shipperRepo.insertOrderLog(
        order.id_order,
        idLocation,
        id_user,
        mustReturn ? `GIAO THAT BAI LAN ${newAttemptNo} - TU DONG HOAN HANG` : `GIAO THAT BAI LAN ${newAttemptNo}`,
        evidence_url || null,
        client
      );

      await client.query('COMMIT');

      return {
        tracking_code,
        status: mustReturn ? 'HOÀN HÀNG' : 'GIAO THẤT BẠI',
        attempt_no: newAttemptNo,
        reason_code: normalizedReasonCode,
        redelivery_fee_charged: redeliveryFeeCharged,
        return_fee_charged: returnFeeCharged,
        return_formula: returnFormula,
        failure_action: mustReturn ? 'RETURN_REQUIRED' : 'REDELIVERY_ELIGIBLE',
        message: mustReturn
          ? `Ly do nay bat buoc hoan hang. Da tru phi hoan ${returnFeeCharged.toLocaleString()}d (${returnFormula}).`
          : isChargeable
          ? `Ghi nhan giao that bai lan ${newAttemptNo}. Da tru ${REDELIVERY_FEE.toLocaleString()}d phi giao lai vao vi shop.`
          : `Ghi nhan giao that bai lan ${newAttemptNo}.`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCodSummary(id_user: number) {
    const orders = await shipperRepo.getPendingCashCollectionsByUser(id_user);
    const totalCod = orders.reduce((sum: number, order: any) => sum + Number(order.cod_amount || 0), 0);
    const totalReceiverFee = orders.reduce((sum: number, order: any) => sum + Number(order.receiver_fee_amount || 0), 0);
    const totalCashHeld = orders.reduce((sum: number, order: any) => sum + Number(order.cash_to_remit || 0), 0);
    const reconciliations = await shipperRepo.getRecentCodReconciliations(id_user);

    return {
      order_count: orders.length,
      total_cod: totalCod,
      total_receiver_fee: totalReceiverFee,
      total_cash_held: totalCashHeld,
      orders,
      recent_reconciliations: reconciliations,
    };
  }

  async submitCodReconciliation(id_user: number) {
    const assignment = await this.getSpokeAssignment(id_user);
    const idLocation = await shipperRepo.getSpokeLocation(assignment.id_spoke);

    const pendingOrders = await shipperRepo.getPendingCashCollectionsByUser(id_user);
    if (pendingOrders.length === 0) {
      throw new Error('Khong co khoan tien nao can doi soat.');
    }

    const totalCod = pendingOrders.reduce((sum: number, order: any) => sum + Number(order.cod_amount || 0), 0);
    const totalReceiverFee = pendingOrders.reduce(
      (sum: number, order: any) => sum + Number(order.receiver_fee_amount || 0),
      0
    );
    const totalCash = pendingOrders.reduce((sum: number, order: any) => sum + Number(order.cash_to_remit || 0), 0);
    const orderIds = pendingOrders.map((order: any) => Number(order.id_order));

    const client = await shipperRepo.getTxClient();
    try {
      await client.query('BEGIN');

      const reconciliation = await shipperRepo.createCodReconciliation(
        {
          id_shipper: id_user,
          total_cod: totalCod,
          total_receiver_fee: totalReceiverFee,
          total_cash: totalCash,
          order_count: pendingOrders.length,
        },
        client
      );

      await shipperRepo.markOrdersReconciled(orderIds, reconciliation.id_reconciliation, client);
      await shipperRepo.markCashCollectionsReconciled(orderIds, reconciliation.id_reconciliation, client);

      for (const order of pendingOrders) {
        await shipperRepo.insertOrderLog(
          order.id_order,
          idLocation,
          id_user,
          `SHIPPER NOP TIEN #${reconciliation.id_reconciliation}`,
          null,
          client
        );
      }

      await client.query('COMMIT');

      return {
        reconciliation_id: reconciliation.id_reconciliation,
        order_count: pendingOrders.length,
        total_cod: totalCod,
        total_receiver_fee: totalReceiverFee,
        total_cash: totalCash,
        status: 'CHO_XAC_NHAN',
        message: `Da tao phieu nop ${totalCash.toLocaleString()}d ve buu cuc. Cho admin xac nhan da nhan tien.`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getIncome(id_user: number) {
    return await shipperRepo.getIncomeCurrentMonth(id_user);
  }

  async getIncomeHistory(id_user: number) {
    return await shipperRepo.getIncomeHistory(id_user);
  }
}
