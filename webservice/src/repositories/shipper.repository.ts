import { pool } from '../config/db';

export class ShipperRepository {
  // Lấy Spoke mà Shipper đang được phân công
  async getShipperAssignment(id_employee: number) {
    const result = await pool.query(`
      SELECT ea.id_spoke, ea.id_hub, s.spoke_name
      FROM employee_assignments ea
      LEFT JOIN spokes s ON ea.id_spoke = s.id_spoke
      WHERE ea.id_employee = $1 AND ea.is_active = TRUE
      LIMIT 1
    `, [id_employee]);
    return result.rows[0] || null;
  }

  // Lấy id_employee từ id_user
  async findEmployeeByUserId(id_user: number) {
    const result = await pool.query(
      'SELECT id_employee FROM employees WHERE id_user = $1',
      [id_user]
    );
    return result.rows[0] || null;
  }

  // Danh sách đơn cần lấy hàng (CHỜ LẤY HÀNG) trong khu vực Spoke của Shipper
  async getOrdersToPickup(id_spoke: number) {
    const result = await pool.query(`
      SELECT o.id_order, o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.cod_amount, o.weight, o.status, o.created_at,
             s.store_name, s.address as pickup_address, s.phone as pickup_phone,
             a.province, a.district
      FROM orders o
      JOIN stores s ON o.id_store = s.id_store
      JOIN areas a ON o.id_dest_area = a.id_area
      WHERE o.status = 'CHỜ LẤY HÀNG'
        AND a.id_spoke = $1
      ORDER BY o.created_at ASC
    `, [id_spoke]);
    return result.rows;
  }

  // Danh sách đơn đang cần giao (ĐÃ LẤY HÀNG hoặc GIAO THẤT BẠI chờ giao lại)
  async getOrdersToDeliver(id_user: number) {
    const result = await pool.query(`
      SELECT o.id_order, o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.cod_amount, o.weight, o.status, o.created_at,
             a.province, a.district,
             (SELECT COUNT(*) FROM delivery_attempts da WHERE da.id_order = o.id_order) as attempt_count
      FROM orders o
      JOIN areas a ON o.id_dest_area = a.id_area
      WHERE o.status IN ('ĐÃ LẤY HÀNG', 'ĐANG GIAO', 'GIAO THẤT BẠI')
      ORDER BY o.created_at ASC
    `, []);
    // TODO: Lọc theo shipper đang giữ đơn - dùng delivery_attempts gần nhất
    return result.rows;
  }

  // Lấy chi tiết đơn hàng kèm số lần giao
  async findOrderByTracking(tracking_code: string) {
    const result = await pool.query(`
      SELECT o.*,
             (SELECT COUNT(*) FROM delivery_attempts da WHERE da.id_order = o.id_order) as attempt_count
      FROM orders o
      WHERE o.tracking_code = $1
    `, [tracking_code]);
    return result.rows[0] || null;
  }

  // Cập nhật trạng thái đơn hàng
  async updateOrderStatus(id_order: number, new_status: string, client: any) {
    await client.query(
      'UPDATE orders SET status = $1 WHERE id_order = $2',
      [new_status, id_order]
    );
  }

  // Đếm số lần giao đã thực hiện
  async countDeliveryAttempts(id_order: number) {
    const result = await pool.query(
      'SELECT COUNT(*) as cnt FROM delivery_attempts WHERE id_order = $1',
      [id_order]
    );
    return parseInt(result.rows[0].cnt || '0');
  }

  // Ghi nhận lần giao hàng (thành công hoặc thất bại)
  async insertDeliveryAttempt(id_order: number, attempt_no: number, id_shipper: number, result_val: string, reason_fail: string | null, evidence_url: string | null, client: any) {
    await client.query(`
      INSERT INTO delivery_attempts (id_order, attempt_no, id_shipper, result, reason_fail, evidence_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id_order, attempt_no, id_shipper, result_val, reason_fail, evidence_url]);
  }

  // Ghi order_log khi cập nhật trạng thái
  async insertOrderLog(id_order: number, id_location: number, id_actor: number, action: string, evidence_url: string | null, client: any) {
    await client.query(`
      INSERT INTO order_logs (id_order, id_location, id_actor, action, evidence_url)
      VALUES ($1, $2, $3, $4, $5)
    `, [id_order, id_location, id_actor, action, evidence_url]);
  }

  // Lấy ví của Shop để hoàn phí khi giao thất bại lần 4+
  async findWalletByShopOrder(id_order: number, client: any) {
    const result = await client.query(`
      SELECT w.id_wallet, w.balance FROM wallets w
      JOIN shops sh ON w.id_account = sh.id_user
      JOIN stores s ON s.id_shop = sh.id_shop
      JOIN orders o ON o.id_store = s.id_store
      WHERE o.id_order = $1
      FOR UPDATE
    `, [id_order]);
    return result.rows[0] || null;
  }

  // Trừ thêm phí giao lại từ ví Shop (từ lần 4: 11.000đ/lần)
  async chargeRedeliveryFee(id_wallet: number, client: any) {
    const FEE = 11000;
    await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE id_wallet = $2',
      [FEE, id_wallet]
    );
    await client.query(
      `INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)`,
      [id_wallet, -FEE, 'PHÍ GIAO LẠI LẦN 4+']
    );
    return FEE;
  }

  // Lấy location của Spoke để ghi log
  async getSpokeLocation(id_spoke: number) {
    const result = await pool.query(
      'SELECT id_location FROM spokes WHERE id_spoke = $1',
      [id_spoke]
    );
    return result.rows[0]?.id_location || null;
  }

  // Lấy Hub location fallback
  async getFirstHubLocation() {
    const result = await pool.query('SELECT id_location FROM hubs ORDER BY id_hub LIMIT 1');
    return result.rows[0]?.id_location || null;
  }

  async getTxClient() {
    return await pool.connect();
  }

  // ============================================
  // COD SUMMARY: Đơn giao thành công có COD hôm nay
  // ============================================
  async getCodSummaryByUser(id_user: number, date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const result = await pool.query(`
      SELECT o.id_order, o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.cod_amount, o.weight, o.status,
             da.attempted_at as delivered_at,
             a.province, a.district
      FROM orders o
      JOIN delivery_attempts da ON da.id_order = o.id_order AND da.result = 'THÀNH CÔNG'
      JOIN areas a ON o.id_dest_area = a.id_area
      WHERE da.id_shipper = $1
        AND o.status = 'GIAO THÀNH CÔNG'
        AND o.cod_amount > 0
        AND DATE(da.attempted_at) = $2
      ORDER BY da.attempted_at DESC
    `, [id_user, targetDate]);
    return result.rows;
  }

  // ============================================
  // INCOME: Thu nhập tháng hiện tại
  // ============================================
  async getIncomeCurrentMonth(id_user: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    // Đếm số đơn giao thành công trong tháng
    const deliveredResult = await pool.query(`
      SELECT COUNT(*) as delivered_count
      FROM delivery_attempts da
      WHERE da.id_shipper = $1
        AND da.result = 'THÀNH CÔNG'
        AND DATE(da.attempted_at) BETWEEN $2 AND $3
    `, [id_user, startDate, endDate]);

    const deliveredCount = parseInt(deliveredResult.rows[0]?.delivered_count || '0');

    // Tính bậc hoa hồng (theo số đơn)
    let commissionRate = 3000;
    if (deliveredCount >= 100) commissionRate = 5000;
    else if (deliveredCount >= 50) commissionRate = 4000;

    // Lấy lương cứng từ bảng employees (hoặc mặc định 5tr)
    const empResult = await pool.query(`
      SELECT e.id_employee 
      FROM employees e WHERE e.id_user = $1
    `, [id_user]);
    const baseSalary = 5000000; // Default base salary

    const totalCommission = deliveredCount * commissionRate;

    // Lấy phí phạt (nếu có) - từ shipper_incomes nếu có bảng đó
    let penalty = 0;
    try {
      const penaltyRes = await pool.query(`
        SELECT COALESCE(SUM(penalty_amount), 0) as penalty
        FROM shipper_incomes
        WHERE id_user = $1
          AND EXTRACT(YEAR FROM created_at) = $2
          AND EXTRACT(MONTH FROM created_at) = $3
      `, [id_user, year, month]);
      penalty = parseInt(penaltyRes.rows[0]?.penalty || '0');
    } catch (_) { /* bảng chưa có data */ }

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      base_salary: baseSalary,
      delivered_count: deliveredCount,
      commission_rate: commissionRate,
      total_commission: totalCommission,
      penalty: penalty,
      net_income: baseSalary + totalCommission - penalty,
    };
  }

  // ============================================
  // INCOME HISTORY: Lịch sử lương 6 tháng gần nhất
  // ============================================
  async getIncomeHistory(id_user: number) {
    const results = [];
    const now = new Date();

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

      const deliveredRes = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM delivery_attempts da
        WHERE da.id_shipper = $1
          AND da.result = 'THÀNH CÔNG'
          AND DATE(da.attempted_at) BETWEEN $2 AND $3
      `, [id_user, startDate, endDate]);

      const count = parseInt(deliveredRes.rows[0]?.cnt || '0');
      if (count === 0) continue; // Bỏ qua tháng không có data

      let rate = 3000;
      if (count >= 100) rate = 5000;
      else if (count >= 50) rate = 4000;

      results.push({
        period: `${year}-${String(month).padStart(2, '0')}`,
        base_salary: 5000000,
        delivered_count: count,
        commission_rate: rate,
        total_commission: count * rate,
        penalty: 0,
        net_income: 5000000 + count * rate,
      });
    }

    return results;
  }
}

