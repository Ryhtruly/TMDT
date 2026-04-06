import { ShipperRepository } from '../repositories/shipper.repository';

const shipperRepo = new ShipperRepository();

// Phí giao lại từ lần 4 (theo Docx)
const FREE_DELIVERY_LIMIT = 3;
const REDELIVERY_FEE = 11000;

// State Machine: Các bước chuyển trạng thái hợp lệ
const VALID_TRANSITIONS: Record<string, string> = {
  'CHỜ LẤY HÀNG': 'ĐÃ LẤY HÀNG',
  'ĐÃ LẤY HÀNG':  'ĐANG GIAO',
  'GIAO THẤT BẠI': 'ĐANG GIAO',       // Giao lại
};

export class ShipperService {
  // Lấy id_employee từ token user
  private async getEmployeeId(id_user: number) {
    const emp = await shipperRepo.findEmployeeByUserId(id_user);
    if (!emp) throw new Error('Tài khoản này không có hồ sơ nhân viên. Liên hệ Admin!');
    return emp.id_employee;
  }

  // =============================================
  // A. XEM DANH SÁCH ĐƠN CẦN LẤY HÀNG
  // =============================================
  async getPickupList(id_user: number) {
    const id_employee = await this.getEmployeeId(id_user);
    const assignment = await shipperRepo.getShipperAssignment(id_employee);
    if (!assignment?.id_spoke) throw new Error('Bạn chưa được phân công khu vực giao hàng. Liên hệ Admin!');

    const orders = await shipperRepo.getOrdersToPickup(assignment.id_spoke);
    return {
      assigned_spoke: assignment.spoke_name,
      total: orders.length,
      orders
    };
  }

  // =============================================
  // B. XEM DANH SÁCH ĐƠN ĐANG MANG ĐI GIAO
  // =============================================
  async getDeliveryList(id_user: number) {
    const orders = await shipperRepo.getOrdersToDeliver(id_user);
    return { total: orders.length, orders };
  }

  // =============================================
  // C. QUÉT MÃ LẤY HÀNG (CHỜ LẤY HÀNG → ĐÃ LẤY HÀNG)
  // =============================================
  async confirmPickup(id_user: number, tracking_code: string) {
    const order = await shipperRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn hàng: ${tracking_code}`);

    // Kiểm tra ràng buộc State Machine
    if (order.status !== 'CHỜ LẤY HÀNG') {
      throw new Error(`Không thể lấy hàng! Đơn đang ở trạng thái "${order.status}". Chỉ có thể lấy khi đơn "CHỜ LẤY HÀNG".`);
    }

    const id_employee = await this.getEmployeeId(id_user);
    const assignment = await shipperRepo.getShipperAssignment(id_employee);
    const id_location = assignment?.id_spoke
      ? await shipperRepo.getSpokeLocation(assignment.id_spoke)
      : await shipperRepo.getFirstHubLocation();

    const client = await shipperRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await shipperRepo.updateOrderStatus(order.id_order, 'ĐÃ LẤY HÀNG', client);
      await shipperRepo.insertOrderLog(order.id_order, id_location, id_user, 'LẤY HÀNG THÀNH CÔNG', null, client);
      await client.query('COMMIT');

      return {
        tracking_code,
        status: 'ĐÃ LẤY HÀNG',
        message: 'Xác nhận lấy hàng thành công! Đơn đã chuyển sang trạng thái ĐÃ LẤY HÀNG.'
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // =============================================
  // D. BẮT ĐẦU ĐI GIAO (ĐÃ LẤY HÀNG → ĐANG GIAO)
  // =============================================
  async startDelivery(id_user: number, tracking_code: string) {
    const order = await shipperRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn: ${tracking_code}`);

    if (!['ĐÃ LẤY HÀNG', 'GIAO THẤT BẠI'].includes(order.status)) {
      throw new Error(`Đơn đang ở trạng thái "${order.status}", không thể bắt đầu giao.`);
    }

    const id_employee = await this.getEmployeeId(id_user);
    const assignment = await shipperRepo.getShipperAssignment(id_employee);
    const id_location = assignment?.id_spoke
      ? await shipperRepo.getSpokeLocation(assignment.id_spoke)
      : await shipperRepo.getFirstHubLocation();

    const client = await shipperRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await shipperRepo.updateOrderStatus(order.id_order, 'ĐANG GIAO', client);
      await shipperRepo.insertOrderLog(order.id_order, id_location, id_user, 'BẮT ĐẦU GIAO HÀNG', null, client);
      await client.query('COMMIT');

      return { tracking_code, status: 'ĐANG GIAO', message: 'Đơn đang trên đường giao!' };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // =============================================
  // E. GIAO HÀNG THÀNH CÔNG (ĐANG GIAO → GIAO THÀNH CÔNG)
  //    Ràng buộc: Phải qua bước ĐÃ LẤY HÀNG trước
  // =============================================
  async confirmDelivered(id_user: number, tracking_code: string, evidence_url?: string) {
    const order = await shipperRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn: ${tracking_code}`);

    // Ràng buộc chặt từ Docx
    if (order.status !== 'ĐANG GIAO') {
      throw new Error(`Không thể xác nhận giao thành công! Đơn đang ở trạng thái "${order.status}". Phải đang ở trạng thái "ĐANG GIAO".`);
    }

    const attempt_count = await shipperRepo.countDeliveryAttempts(order.id_order);
    const id_employee = await this.getEmployeeId(id_user);
    const assignment = await shipperRepo.getShipperAssignment(id_employee);
    const id_location = assignment?.id_spoke
      ? await shipperRepo.getSpokeLocation(assignment.id_spoke)
      : await shipperRepo.getFirstHubLocation();

    const client = await shipperRepo.getTxClient();
    try {
      await client.query('BEGIN');

      // Ghi lần giao thành công
      await shipperRepo.insertDeliveryAttempt(
        order.id_order, attempt_count + 1, id_user,
        'THÀNH CÔNG', null, evidence_url || null, client
      );
      await shipperRepo.updateOrderStatus(order.id_order, 'GIAO THÀNH CÔNG', client);
      await shipperRepo.insertOrderLog(
        order.id_order, id_location, id_user,
        'GIAO HÀNG THÀNH CÔNG', evidence_url || null, client
      );

      await client.query('COMMIT');
      return {
        tracking_code,
        status: 'GIAO THÀNH CÔNG',
        message: 'Xác nhận giao hàng thành công! COD sẽ được đối soát vào phiên gần nhất.'
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // =============================================
  // F. GIAO HÀNG THẤT BẠI (ĐANG GIAO → GIAO THẤT BẠI)
  //    - Miễn phí 3 lần đầu
  //    - Từ lần 4: Thu thêm 11.000đ/lần từ ví Shop
  // =============================================
  async reportFailedDelivery(id_user: number, tracking_code: string, reason_fail: string, evidence_url?: string) {
    if (!reason_fail) throw new Error('Bắt buộc nhập lý do giao hàng thất bại.');

    const order = await shipperRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn: ${tracking_code}`);

    if (order.status !== 'ĐANG GIAO') {
      throw new Error(`Chỉ có thể báo thất bại khi đơn đang ở trạng thái "ĐANG GIAO". Hiện tại: "${order.status}".`);
    }

    const attempt_count = await shipperRepo.countDeliveryAttempts(order.id_order);
    const new_attempt_no = attempt_count + 1;
    const is_chargeable = new_attempt_no > FREE_DELIVERY_LIMIT; // Lần 4 trở đi = tính tiền

    const id_employee = await this.getEmployeeId(id_user);
    const assignment = await shipperRepo.getShipperAssignment(id_employee);
    const id_location = assignment?.id_spoke
      ? await shipperRepo.getSpokeLocation(assignment.id_spoke)
      : await shipperRepo.getFirstHubLocation();

    const client = await shipperRepo.getTxClient();
    try {
      await client.query('BEGIN');

      // Ghi lần thất bại
      await shipperRepo.insertDeliveryAttempt(
        order.id_order, new_attempt_no, id_user,
        'THẤT BẠI', reason_fail, evidence_url || null, client
      );

      // Thu phí giao lại từ lần 4
      let redelivery_fee_charged = 0;
      if (is_chargeable) {
        const shopWallet = await shipperRepo.findWalletByShopOrder(order.id_order, client);
        if (shopWallet) {
          redelivery_fee_charged = await shipperRepo.chargeRedeliveryFee(shopWallet.id_wallet, client);
        }
      }

      await shipperRepo.updateOrderStatus(order.id_order, 'GIAO THẤT BẠI', client);
      await shipperRepo.insertOrderLog(
        order.id_order, id_location, id_user,
        `GIAO THẤT BẠI LẦN ${new_attempt_no}: ${reason_fail}`,
        evidence_url || null, client
      );

      await client.query('COMMIT');

      return {
        tracking_code,
        status: 'GIAO THẤT BẠI',
        attempt_no: new_attempt_no,
        ...(is_chargeable && { redelivery_fee_charged, fee_note: `Lần giao thứ ${new_attempt_no} > 3 lần miễn phí — đã thu phí giao lại ${REDELIVERY_FEE.toLocaleString()}đ từ ví Shop.` }),
        message: `Ghi nhận giao thất bại lần ${new_attempt_no}. ${is_chargeable ? `Phí giao lại ${REDELIVERY_FEE.toLocaleString()}đ đã được trừ vào ví Shop.` : `Còn ${FREE_DELIVERY_LIMIT - new_attempt_no} lần giao miễn phí.`}`
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // =============================================
  // G. COD SUMMARY: Tổng COD hôm nay
  // =============================================
  async getCodSummary(id_user: number, date?: string) {
    const orders = await shipperRepo.getCodSummaryByUser(id_user, date);
    const totalCod = orders.reduce((sum: number, o: any) => sum + Number(o.cod_amount || 0), 0);
    return {
      date: date || new Date().toISOString().slice(0, 10),
      total_cod: totalCod,
      order_count: orders.length,
      orders,
    };
  }

  // =============================================
  // H. INCOME: Thu nhập tháng hiện tại
  // =============================================
  async getIncome(id_user: number) {
    return await shipperRepo.getIncomeCurrentMonth(id_user);
  }

  // =============================================
  // I. INCOME HISTORY: Lịch sử lương 6 tháng
  // =============================================
  async getIncomeHistory(id_user: number) {
    return await shipperRepo.getIncomeHistory(id_user);
  }
}

