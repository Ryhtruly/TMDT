import { pool } from '../config/db';

export class GeneralRepository {
  // === COD PAYOUT ===
  async getDeliveredOrdersForPayout(id_user: number) {
    return (await pool.query(`
      SELECT o.id_order, o.tracking_code, o.cod_amount, o.created_at
      FROM orders o JOIN stores s ON o.id_store = s.id_store JOIN shops sh ON s.id_shop = sh.id_shop
      WHERE sh.id_user = $1 AND o.status = 'GIAO THÀNH CÔNG' AND o.cod_amount > 0
        AND o.id_order NOT IN (SELECT unnest(string_to_array(COALESCE(
          (SELECT string_agg(cp.id_payout::text, ',') FROM cod_payouts cp WHERE cp.id_account = $1), ''), ','))::int)
      ORDER BY o.created_at ASC
    `, [id_user])).rows;
  }

  async createCodPayout(id_account: number, total_cod: number, service_fee: number, payout_date: string, client: any) {
    const result = await client.query(
      "INSERT INTO cod_payouts (id_account, total_cod, service_fee, payout_date, status) VALUES ($1, $2, $3, $4, 'CHỜ DUYỆT') RETURNING *",
      [id_account, total_cod, service_fee, payout_date]
    );
    return result.rows[0];
  }

  async getPayoutsByUser(id_user: number) {
    return (await pool.query('SELECT * FROM cod_payouts WHERE id_account = $1 ORDER BY payout_date DESC', [id_user])).rows;
  }

  async getAllPendingPayouts() {
    return (await pool.query("SELECT cp.*, u.phone FROM cod_payouts cp JOIN users u ON cp.id_account = u.id_user WHERE cp.status = 'CHỜ DUYỆT' ORDER BY cp.payout_date ASC")).rows;
  }

  async approvePayout(id_payout: number, client: any) {
    await client.query("UPDATE cod_payouts SET status = 'ĐÃ CHUYỂN' WHERE id_payout = $1", [id_payout]);
  }

  // === PROMOTIONS ===
  async getAllPromotions() { return (await pool.query('SELECT * FROM promotions ORDER BY starts_at DESC')).rows; }

  async getActivePromotions() {
    return (await pool.query("SELECT * FROM promotions WHERE is_active = TRUE AND starts_at <= NOW() AND expires_at >= NOW()")).rows;
  }

  async findPromoByCode(code: string) {
    return (await pool.query("SELECT * FROM promotions WHERE code = $1 AND is_active = TRUE AND starts_at <= NOW() AND expires_at >= NOW()", [code])).rows[0] || null;
  }

  async createPromotion(data: any) {
    const { code, name, promo_type, discount_value, min_order, max_discount, starts_at, expires_at } = data;
    const result = await pool.query(
      'INSERT INTO promotions (code, name, promo_type, discount_value, min_order, max_discount, starts_at, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [code, name, promo_type, discount_value, min_order || 0, max_discount, starts_at, expires_at]
    );
    return result.rows[0];
  }

  async togglePromotion(id_promo: string, is_active: boolean) {
    await pool.query('UPDATE promotions SET is_active = $1 WHERE id_promo = $2', [is_active, id_promo]);
  }

  // === INCIDENTS ===
  async createIncident(id_order: number, type: string, description: string) {
    const result = await pool.query(
      "INSERT INTO incidents (id_order, type, description, compensation, status) VALUES ($1, $2, $3, 0, 'ĐANG ĐIỀU TRA') RETURNING *",
      [id_order, type, description]
    );
    return result.rows[0];
  }

  async resolveIncident(id_incident: number, compensation: number) {
    const MAX_COMPENSATION = 5000000; // Docx: tối đa 5 triệu
    const actualComp = Math.min(compensation, MAX_COMPENSATION);
    const result = await pool.query(
      "UPDATE incidents SET compensation = $1, status = 'ĐÃ ĐỀN BÙ' WHERE id_incident = $2 RETURNING *",
      [actualComp, id_incident]
    );
    return result.rows[0];
  }

  async getIncidentsByOrder(id_order: number) { return (await pool.query('SELECT * FROM incidents WHERE id_order = $1', [id_order])).rows; }
  async getAllIncidents() { return (await pool.query('SELECT i.*, o.tracking_code FROM incidents i JOIN orders o ON i.id_order = o.id_order ORDER BY i.id_incident DESC')).rows; }

  // === NOTIFICATIONS ===
  async createNotification(id_user: number, title: string, content: string) {
    await pool.query('INSERT INTO notifications (id_user, title, content) VALUES ($1, $2, $3)', [id_user, title, content]);
  }

  async getNotificationsByUser(id_user: number) {
    return (await pool.query('SELECT * FROM notifications WHERE id_user = $1 ORDER BY created_at DESC LIMIT 50', [id_user])).rows;
  }

  async markAsRead(id_noti: number, id_user: number) {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id_noti = $1 AND id_user = $2', [id_noti, id_user]);
  }

  async markAllRead(id_user: number) {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id_user = $1', [id_user]);
  }

  // === FEEDBACKS ===
  async createFeedback(id_user: number, title: string, content: string) {
    const result = await pool.query(
      "INSERT INTO feedbacks (id_user, title, content, status) VALUES ($1, $2, $3, 'MỚI') RETURNING *",
      [id_user, title, content]
    );
    return result.rows[0];
  }

  async getAllFeedbacks() { return (await pool.query("SELECT f.*, u.phone FROM feedbacks f JOIN users u ON f.id_user = u.id_user ORDER BY f.id_feedback DESC")).rows; }

  async updateFeedbackStatus(id_feedback: number, status: string) {
    await pool.query('UPDATE feedbacks SET status = $1 WHERE id_feedback = $2', [status, id_feedback]);
  }

  // === SHIPPER COD ĐỐI SOÁT ===
  async getShipperCodSummary(id_shipper: number, date: string) {
    const result = await pool.query(`
      SELECT da.id_order, o.tracking_code, o.cod_amount, da.result
      FROM delivery_attempts da
      JOIN orders o ON da.id_order = o.id_order
      WHERE da.id_shipper = $1 AND da.result = 'THÀNH CÔNG' AND DATE(o.created_at) = $2
    `, [id_shipper, date]);
    const orders = result.rows;
    const total_cod = orders.reduce((sum: number, o: any) => sum + Number(o.cod_amount || 0), 0);
    return { date, total_orders: orders.length, total_cod_collected: total_cod, orders };
  }

  // === HOÀN HÀNG (Docx: Nội tỉnh 5.000đ, tuyến khác 50% cước giao đi) ===
  async getOrderForReturn(id_order: number) {
    return (await pool.query('SELECT * FROM orders WHERE id_order = $1', [id_order])).rows[0] || null;
  }

  async getRouteTypeForOrder(id_order: number) {
    const result = await pool.query(`
      SELECT r.route_type FROM orders o
      JOIN areas a ON o.id_dest_area = a.id_area
      JOIN spokes s ON a.id_spoke = s.id_spoke
      LEFT JOIN routes r ON r.dest_spoke = s.id_spoke
      WHERE o.id_order = $1 LIMIT 1
    `, [id_order]);
    return result.rows[0]?.route_type || 'INTER_HUB';
  }

  async setOrderReturn(id_order: number, return_fee: number, client: any) {
    await client.query("UPDATE orders SET status = 'HOÀN HÀNG', is_return = TRUE, return_fee = $1 WHERE id_order = $2", [return_fee, id_order]);
  }

  // === SHIPPER INCOME (Bảng 33 Docx: lương cứng + hoa hồng - phạt) ===
  async getOrCreateShipperIncome(id_user: number, period: string) {
    let result = await pool.query('SELECT * FROM shipper_incomes WHERE id_user = $1 AND period = $2', [id_user, period]);
    if (!result.rows[0]) {
      result = await pool.query(
        "INSERT INTO shipper_incomes (id_user, base_salary, total_commission, penalty, period) VALUES ($1, 0, 0, 0, $2) RETURNING *",
        [id_user, period]
      );
    }
    return result.rows[0];
  }

  async updateShipperIncome(id_income: number, base_salary: number, total_commission: number, penalty: number) {
    await pool.query(
      'UPDATE shipper_incomes SET base_salary=$1, total_commission=$2, penalty=$3 WHERE id_income=$4',
      [base_salary, total_commission, penalty, id_income]
    );
  }

  async calcShipperCommission(id_user: number, period: string) {
    // Đếm số đơn giao thành công trong tháng → hoa hồng 3.000đ-5.000đ/đơn (Docx dòng 1549)
    const result = await pool.query(`
      SELECT COUNT(*) as total_delivered
      FROM delivery_attempts da
      WHERE da.id_shipper = $1 AND da.result = 'THÀNH CÔNG'
        AND TO_CHAR(da.created_at, 'YYYY-MM') = $2
    `, [id_user, period]);
    const total = parseInt(result.rows[0].total_delivered || '0');
    const rate = total > 100 ? 5000 : total > 50 ? 4000 : 3000; // Tính theo bậc
    return { total_delivered: total, rate_per_order: rate, total_commission: total * rate };
  }

  async getShipperIncomeHistory(id_user: number) {
    return (await pool.query('SELECT * FROM shipper_incomes WHERE id_user = $1 ORDER BY period DESC', [id_user])).rows;
  }

  // === AUDIT LOG (Bảng 34 Docx) ===
  async writeAuditLog(id_actor: number, action: string, object_type: string, payload_json: any) {
    await pool.query(
      'INSERT INTO audit_log (id_actor, action, object_type, payload_json) VALUES ($1, $2, $3, $4)',
      [id_actor, action, object_type, JSON.stringify(payload_json)]
    );
  }

  async getAuditLogs(limit: number = 50) {
    return (await pool.query(`
      SELECT al.*, u.phone as actor_phone
      FROM audit_log al LEFT JOIN users u ON al.id_actor = u.id_user
      ORDER BY al.created_at DESC LIMIT $1
    `, [limit])).rows;
  }

  // === BÁO CÁO VẬN HÀNH SHOP (Docx dòng 1426-1433) ===
  async getShopOperationsReport(id_user: number) {
    const shopResult = await pool.query('SELECT id_shop FROM shops WHERE id_user = $1', [id_user]);
    if (!shopResult.rows[0]) return null;
    const id_shop = shopResult.rows[0].id_shop;

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE o.status = 'GIAO THÀNH CÔNG') as don_giao_thanh_cong,
        COUNT(*) FILTER (WHERE o.status = 'GIAO THẤT BẠI') as don_giao_that_bai,
        COUNT(*) FILTER (WHERE o.status = 'HOÀN HÀNG') as don_hoan_hang,
        COUNT(*) FILTER (WHERE o.status = 'ĐANG GIAO') as don_dang_giao,
        COUNT(*) FILTER (WHERE o.status = 'ĐÃ LẤY HÀNG') as don_da_lay_hang,
        COUNT(*) FILTER (WHERE o.status = 'CHỜ LẤY HÀNG') as don_cho_lay_hang,
        COUNT(*) FILTER (WHERE o.status = 'TẠI KHO') as don_tai_kho,
        COUNT(*) FILTER (WHERE o.status = 'ĐÃ HỦY') as don_da_huy,
        COUNT(*) as tong_don
      FROM orders o JOIN stores s ON o.id_store = s.id_store
      WHERE s.id_shop = $1
    `, [id_shop]);
    return result.rows[0];
  }

  // === TÌM KIẾM ĐƠN NÂNG CAO (Docx dòng 1399, 1526) ===
  async searchOrders(id_user: number, filters: any) {
    const shopResult = await pool.query('SELECT id_shop FROM shops WHERE id_user = $1', [id_user]);
    if (!shopResult.rows[0]) return [];
    const id_shop = shopResult.rows[0].id_shop;

    let query = `
      SELECT o.*, s.store_name, st.service_name
      FROM orders o
      JOIN stores s ON o.id_store = s.id_store
      LEFT JOIN service_types st ON o.id_service_type = st.id_service
      WHERE s.id_shop = $1
    `;
    const params: any[] = [id_shop];
    let idx = 2;

    if (filters.tracking_code) { query += ` AND o.tracking_code ILIKE $${idx}`; params.push(`%${filters.tracking_code}%`); idx++; }
    if (filters.receiver_phone) { query += ` AND o.receiver_phone = $${idx}`; params.push(filters.receiver_phone); idx++; }
    if (filters.receiver_name) { query += ` AND o.receiver_name ILIKE $${idx}`; params.push(`%${filters.receiver_name}%`); idx++; }
    if (filters.status) { query += ` AND o.status = $${idx}`; params.push(filters.status); idx++; }
    if (filters.date_from) { query += ` AND o.created_at >= $${idx}`; params.push(filters.date_from); idx++; }
    if (filters.date_to) { query += ` AND o.created_at <= $${idx}`; params.push(filters.date_to); idx++; }

    query += ` ORDER BY o.created_at DESC LIMIT 100`;
    return (await pool.query(query, params)).rows;
  }

  // === AN TOÀN: Kiểm tra có đơn hàng trong kho trước khi xóa Hub/Spoke (Docx dòng 29) ===
  async hasActiveOrdersInHub(id_hub: number) {
    const result = await pool.query(
      'SELECT COUNT(*) as cnt FROM warehouse_inventory WHERE id_hub = $1',
      [id_hub]
    );
    return parseInt(result.rows[0].cnt) > 0;
  }

  async hasActiveOrdersInSpoke(id_spoke: number) {
    const result = await pool.query(
      'SELECT COUNT(*) as cnt FROM warehouse_inventory WHERE id_spoke = $1',
      [id_spoke]
    );
    return parseInt(result.rows[0].cnt) > 0;
  }

  async getTxClient() { return await pool.connect(); }
}
