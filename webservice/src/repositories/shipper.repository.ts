import { pool } from '../config/db';
import {
  extractProvinceDistrictFromAddress,
  extractProvinceDistrictWardFromAddress,
  isSameArea,
  isSameWardArea,
} from '../utils/location';

export class ShipperRepository {
  async getShipperAssignment(id_employee: number) {
    const result = await pool.query(
      `
      SELECT ea.id_spoke, ea.id_hub, s.spoke_name
      FROM employee_assignments ea
      LEFT JOIN spokes s ON ea.id_spoke = s.id_spoke
      WHERE ea.id_employee = $1 AND ea.is_active = TRUE
      LIMIT 1
    `,
      [id_employee]
    );
    return result.rows[0] || null;
  }

  async findEmployeeByUserId(id_user: number) {
    const result = await pool.query('SELECT id_employee FROM employees WHERE id_user = $1', [id_user]);
    return result.rows[0] || null;
  }

  async getPickupCandidates() {
    const result = await pool.query(
      `
      SELECT o.id_order, o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.cod_amount, o.weight, o.status, o.created_at,
             s.store_name, s.address as pickup_address, s.phone as pickup_phone,
             a.province, a.district, COALESCE(o.payer_type, 'SENDER') as payer_type
      FROM orders o
      JOIN stores s ON o.id_store = s.id_store
      JOIN areas a ON o.id_dest_area = a.id_area
      WHERE o.status = 'CHỜ LẤY HÀNG'
      ORDER BY o.created_at ASC
    `
    );
    return result.rows;
  }

  async getWardAssignmentsBySpoke(id_spoke: number) {
    const result = await pool.query(
      `
      SELECT swa.*,
             COALESCE(loads.active_orders, 0) as active_orders
      FROM shipper_ward_assignments swa
      JOIN users u ON u.id_user = swa.id_shipper AND u.is_active = TRUE
      LEFT JOIN (
        SELECT current_shipper_id, COUNT(*) as active_orders
        FROM orders
        WHERE status = 'ĐANG GIAO'
          AND current_shipper_id IS NOT NULL
        GROUP BY current_shipper_id
      ) loads ON loads.current_shipper_id = swa.id_shipper
      WHERE swa.id_spoke = $1
        AND swa.is_active = TRUE
      ORDER BY swa.priority ASC, COALESCE(loads.active_orders, 0) ASC, swa.id_shipper ASC
    `,
      [id_spoke]
    );
    return result.rows;
  }

  async resolveSpokeByAddress(address: string) {
    const parsed = extractProvinceDistrictFromAddress(address || '');
    if (!parsed) return null;

    const result = await pool.query(`
      SELECT a.id_area, a.province, a.district, a.id_spoke
      FROM areas a
      ORDER BY a.id_area ASC
    `);

    return (
      result.rows.find((row) =>
        isSameArea(row.province, row.district, parsed.province, parsed.district)
      ) || null
    );
  }

  async resolveAssignedShipperByAddress(id_spoke: number, address: string) {
    const parsed = extractProvinceDistrictWardFromAddress(address || '');
    if (!parsed) return null;

    const assignments = await this.getWardAssignmentsBySpoke(id_spoke);
    if (!assignments.length) return null;

    const exactWard = assignments.find((assignment: any) =>
      assignment.ward &&
      isSameWardArea(
        assignment.province,
        assignment.district,
        assignment.ward,
        parsed.province,
        parsed.district,
        parsed.ward
      )
    );
    if (exactWard) return Number(exactWard.id_shipper);

    const districtFallback = assignments.find((assignment: any) =>
      !assignment.ward &&
      isSameArea(assignment.province, assignment.district, parsed.province, parsed.district)
    );
    if (districtFallback) return Number(districtFallback.id_shipper);

    return null;
  }

  async getOrdersToDeliver(id_spoke: number, id_user: number) {
    const result = await pool.query(
      `
      SELECT o.id_order, o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.cod_amount, o.weight, o.status, o.created_at,
             o.current_shipper_id,
             latest_log.action as latest_action,
             a.province, a.district, a.id_spoke as dest_spoke,
             COALESCE(o.payer_type, 'SENDER') as payer_type,
             COALESCE(o.shipping_fee, 0) as shipping_fee,
             COALESCE(o.insurance_fee, 0) as insurance_fee,
             (SELECT COUNT(*) FROM delivery_attempts da WHERE da.id_order = o.id_order) as attempt_count
      FROM orders o
      JOIN areas a ON o.id_dest_area = a.id_area
      LEFT JOIN LATERAL (
        SELECT ol.action
        FROM order_logs ol
        WHERE ol.id_order = o.id_order
        ORDER BY ol.created_at DESC, ol.id_log DESC
        LIMIT 1
      ) latest_log ON TRUE
      WHERE a.id_spoke = $1
        AND (
          (
            o.status = 'ĐÃ LẤY HÀNG'
            AND latest_log.action = 'XUAT KHO -> GIAO CUOI'
            AND (o.current_shipper_id IS NULL OR o.current_shipper_id = $2)
          )
          OR (o.status = 'ĐANG GIAO' AND o.current_shipper_id = $2)
          OR (o.status = 'GIAO THẤT BẠI' AND (o.current_shipper_id IS NULL OR o.current_shipper_id = $2))
        )
      ORDER BY o.created_at ASC
    `,
      [id_spoke, id_user]
    );
    return result.rows;
  }

  async findOrderByTracking(tracking_code: string) {
    const result = await pool.query(
      `
      SELECT o.*,
             s.address as store_address,
             a.id_spoke as dest_spoke,
             latest_log.action as latest_action,
             COALESCE(o.payer_type, 'SENDER') as payer_type,
             (SELECT COUNT(*) FROM delivery_attempts da WHERE da.id_order = o.id_order) as attempt_count
      FROM orders o
      JOIN stores s ON s.id_store = o.id_store
      LEFT JOIN areas a ON a.id_area = o.id_dest_area
      LEFT JOIN LATERAL (
        SELECT ol.action
        FROM order_logs ol
        WHERE ol.id_order = o.id_order
        ORDER BY ol.created_at DESC, ol.id_log DESC
        LIMIT 1
      ) latest_log ON TRUE
      WHERE o.tracking_code = $1
    `,
      [tracking_code]
    );
    return result.rows[0] || null;
  }

  async findOrderByTrackingForUpdate(tracking_code: string, client: any) {
    const result = await client.query(
      `
      SELECT o.*,
             s.address as store_address,
             a.id_spoke as dest_spoke,
             latest_log.action as latest_action,
             COALESCE(o.payer_type, 'SENDER') as payer_type,
             (SELECT COUNT(*) FROM delivery_attempts da WHERE da.id_order = o.id_order) as attempt_count
      FROM orders o
      JOIN stores s ON s.id_store = o.id_store
      LEFT JOIN areas a ON a.id_area = o.id_dest_area
      LEFT JOIN LATERAL (
        SELECT ol.action
        FROM order_logs ol
        WHERE ol.id_order = o.id_order
        ORDER BY ol.created_at DESC, ol.id_log DESC
        LIMIT 1
      ) latest_log ON TRUE
      WHERE o.tracking_code = $1
      FOR UPDATE OF o
    `,
      [tracking_code]
    );
    return result.rows[0] || null;
  }

  async updateOrderStatus(id_order: number, new_status: string, client: any) {
    await client.query('UPDATE orders SET status = $1 WHERE id_order = $2', [new_status, id_order]);
  }

  async updateCurrentShipper(id_order: number, current_shipper_id: number | null, client: any) {
    await client.query('UPDATE orders SET current_shipper_id = $1 WHERE id_order = $2', [current_shipper_id, id_order]);
  }

  async countDeliveryAttempts(id_order: number) {
    const result = await pool.query('SELECT COUNT(*) as cnt FROM delivery_attempts WHERE id_order = $1', [id_order]);
    return parseInt(result.rows[0].cnt || '0', 10);
  }

  async insertDeliveryAttempt(
    id_order: number,
    attempt_no: number,
    id_shipper: number,
    result_val: string,
    reason_fail: string | null,
    evidence_url: string | null,
    client: any
  ) {
    await client.query(
      `
      INSERT INTO delivery_attempts (id_order, attempt_no, id_shipper, result, reason_fail, evidence_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [id_order, attempt_no, id_shipper, result_val, reason_fail, evidence_url]
    );
  }

  async insertOrderLog(
    id_order: number,
    id_location: number,
    id_actor: number,
    action: string,
    evidence_url: string | null,
    client: any
  ) {
    await client.query(
      `
      INSERT INTO order_logs (id_order, id_location, id_actor, action, evidence_url)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [id_order, id_location, id_actor, action, evidence_url]
    );
  }

  async findWalletByShopOrder(id_order: number, client: any) {
    const result = await client.query(
      `
      SELECT w.id_wallet, w.balance
      FROM wallets w
      JOIN shops sh ON w.id_account = sh.id_user
      JOIN stores s ON s.id_shop = sh.id_shop
      JOIN orders o ON o.id_store = s.id_store
      WHERE o.id_order = $1
      FOR UPDATE
    `,
      [id_order]
    );
    return result.rows[0] || null;
  }

  async chargeRedeliveryFee(id_wallet: number, client: any) {
    const fee = 11000;
    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id_wallet = $2', [fee, id_wallet]);
    await client.query('INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)', [
      id_wallet,
      -fee,
      'PHI GIAO LAI LAN 4+',
    ]);
    return fee;
  }

  async getSpokeLocation(id_spoke: number) {
    const result = await pool.query('SELECT id_location FROM spokes WHERE id_spoke = $1', [id_spoke]);
    return result.rows[0]?.id_location || null;
  }

  async getFirstHubLocation() {
    const result = await pool.query('SELECT id_location FROM hubs ORDER BY id_hub LIMIT 1');
    return result.rows[0]?.id_location || null;
  }

  async getTodayDeliveryStats(id_user: number) {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE result = 'THÀNH CÔNG') as delivered_today,
        COUNT(*) FILTER (WHERE result = 'THẤT BẠI') as failed_today
      FROM delivery_attempts
      WHERE id_shipper = $1
        AND DATE(created_at) = CURRENT_DATE
    `,
      [id_user]
    );
    return result.rows[0] || { delivered_today: 0, failed_today: 0 };
  }

  async getPendingCashOrdersByUser(id_user: number) {
    const result = await pool.query(
      `
      SELECT o.id_order,
             o.tracking_code,
             o.receiver_name,
             o.receiver_phone,
             o.receiver_address,
             COALESCE(o.cod_amount, 0) as cod_amount,
             COALESCE(o.shipping_fee, 0) as shipping_fee,
             COALESCE(o.insurance_fee, 0) as insurance_fee,
             COALESCE(o.payer_type, 'SENDER') as payer_type,
             CASE
               WHEN COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
                 THEN COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)
               ELSE 0
             END as receiver_fee_amount,
             COALESCE(o.cod_amount, 0) +
             CASE
               WHEN COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
                 THEN COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)
               ELSE 0
             END as cash_to_remit,
             da.delivered_at
      FROM orders o
      JOIN LATERAL (
        SELECT da.created_at as delivered_at
        FROM delivery_attempts da
        WHERE da.id_order = o.id_order
          AND da.id_shipper = $1
          AND da.result = 'THÀNH CÔNG'
        ORDER BY da.attempt_no DESC, da.created_at DESC
        LIMIT 1
      ) da ON TRUE
      WHERE o.status = 'GIAO THÀNH CÔNG'
        AND o.shipper_reconciliation_id IS NULL
        AND (
          COALESCE(o.cod_amount, 0) > 0
          OR COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
        )
      ORDER BY da.delivered_at DESC, o.id_order DESC
    `,
      [id_user]
    );
    return result.rows;
  }

  async createCodReconciliation(data: any, client: any) {
    const { id_shipper, total_cod, total_receiver_fee, total_cash, order_count } = data;
    const result = await client.query(
      `
      INSERT INTO shipper_cod_reconciliations
        (id_shipper, reconciliation_date, total_cod, total_receiver_fee, total_cash, order_count, status)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 'DA_NOP')
      RETURNING *
    `,
      [id_shipper, total_cod, total_receiver_fee, total_cash, order_count]
    );
    return result.rows[0];
  }

  async markOrdersReconciled(orderIds: number[], reconciliationId: number, client: any) {
    if (orderIds.length === 0) return;
    await client.query('UPDATE orders SET shipper_reconciliation_id = $1 WHERE id_order = ANY($2::int[])', [
      reconciliationId,
      orderIds,
    ]);
  }

  async getRecentCodReconciliations(id_user: number) {
    const result = await pool.query(
      `
      SELECT *
      FROM shipper_cod_reconciliations
      WHERE id_shipper = $1
      ORDER BY created_at DESC
      LIMIT 10
    `,
      [id_user]
    );
    return result.rows;
  }

  async getIncomeCurrentMonth(id_user: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const deliveredResult = await pool.query(
      `
      SELECT COUNT(*) as delivered_count
      FROM delivery_attempts da
      WHERE da.id_shipper = $1
        AND da.result = 'THÀNH CÔNG'
        AND DATE(da.created_at) BETWEEN $2 AND $3
    `,
      [id_user, startDate, endDate]
    );

    const deliveredCount = parseInt(deliveredResult.rows[0]?.delivered_count || '0', 10);

    let commissionRate = 3000;
    if (deliveredCount >= 100) commissionRate = 5000;
    else if (deliveredCount >= 50) commissionRate = 4000;

    const baseSalary = 5000000;

    let penalty = 0;
    try {
      const penaltyRes = await pool.query(
        `
        SELECT COALESCE(SUM(penalty_amount), 0) as penalty
        FROM shipper_incomes
        WHERE id_user = $1
          AND EXTRACT(YEAR FROM created_at) = $2
          AND EXTRACT(MONTH FROM created_at) = $3
      `,
        [id_user, year, month]
      );
      penalty = parseInt(penaltyRes.rows[0]?.penalty || '0', 10);
    } catch (_) {
      penalty = 0;
    }

    const totalCommission = deliveredCount * commissionRate;

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      base_salary: baseSalary,
      delivered_count: deliveredCount,
      commission_rate: commissionRate,
      total_commission: totalCommission,
      penalty,
      net_income: baseSalary + totalCommission - penalty,
    };
  }

  async getIncomeHistory(id_user: number) {
    const results = [];
    const now = new Date();

    for (let i = 1; i <= 6; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

      const deliveredRes = await pool.query(
        `
        SELECT COUNT(*) as cnt
        FROM delivery_attempts da
        WHERE da.id_shipper = $1
          AND da.result = 'THÀNH CÔNG'
          AND DATE(da.created_at) BETWEEN $2 AND $3
      `,
        [id_user, startDate, endDate]
      );

      const count = parseInt(deliveredRes.rows[0]?.cnt || '0', 10);
      if (count === 0) continue;

      let rate = 3000;
      if (count >= 100) rate = 5000;
      else if (count >= 50) rate = 4000;

      results.push({
        period: `${year}-${String(month).padStart(2, '0')}`,
        delivered_count: count,
        commission_rate: rate,
        total_commission: count * rate,
      });
    }

    return results;
  }

  async getTxClient() {
    return await pool.connect();
  }
}
