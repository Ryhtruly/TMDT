import { pool } from '../config/db';

export class AdminRepository {
  // Lấy danh sách Hub
  async getHubs() {
    const result = await pool.query('SELECT * FROM hubs ORDER BY id_hub ASC');
    return result.rows;
  }

  // Lấy danh sách Spoke
  async getSpokes() {
    const result = await pool.query(`
      SELECT s.*, h.hub_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('district', a.district, 'province', a.province, 'area_type', a.area_type)
            ORDER BY a.district
          ) FILTER (WHERE a.id_area IS NOT NULL),
          '[]'
        ) AS areas
      FROM spokes s 
      JOIN hubs h ON s.id_hub = h.id_hub
      LEFT JOIN areas a ON a.id_spoke = s.id_spoke
      GROUP BY s.id_spoke, s.id_hub, s.id_location, s.spoke_name, h.hub_name
      ORDER BY s.id_spoke ASC
    `);
    return result.rows;
  }

  // Lấy danh sách Areas
  async getAreas() {
    const result = await pool.query(`
      SELECT a.*, s.spoke_name
      FROM areas a
      LEFT JOIN spokes s ON a.id_spoke = s.id_spoke
      ORDER BY a.id_area ASC
    `);
    return result.rows;
  }

  // Dashboard Stats
  async getDashboardCounts() {
    const [
      orders, users, shops, wallets, chartRes,
      pendingShipperRes, pendingPayoutRes, paidThisMonthRes
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as cnt FROM orders"),
      pool.query("SELECT COUNT(*) as cnt FROM users WHERE is_active = TRUE"),
      pool.query("SELECT COUNT(*) as cnt FROM shops"),
      pool.query("SELECT SUM(balance) as sum FROM wallets"),
      pool.query(`
        SELECT TO_CHAR(created_at, 'DD/MM') as name, COUNT(*) as orders 
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR(created_at, 'DD/MM')
        ORDER BY MIN(created_at) ASC
      `),
      pool.query("SELECT SUM(total_cod) as sum FROM shipper_cod_reconciliations WHERE status = 'CHO_XAC_NHAN'"),
      pool.query("SELECT SUM(total_cod) as sum FROM cod_payouts WHERE status = 'CHO_DUYET'"),
      pool.query("SELECT SUM(total_cod) as sum FROM cod_payouts WHERE status = 'DA_CHUYEN' AND created_at >= date_trunc('month', CURRENT_DATE)")
    ]);

    // Lấy nguyên dữ liệu thật từ DB, không dùng mock data nữa
    const chartData = chartRes.rows.map(r => ({ name: r.name, orders: parseInt(r.orders) }));

    return {
      orders: parseInt(orders.rows[0].cnt || '0'),
      users: parseInt(users.rows[0].cnt || '0'),
      shops: parseInt(shops.rows[0].cnt || '0'),
      wallets: parseFloat(wallets.rows[0].sum || '0'),
      cod_pending_shipper: parseFloat(pendingShipperRes.rows[0].sum || '0'),
      cod_pending_payout: parseFloat(pendingPayoutRes.rows[0].sum || '0'),
      cod_paid_this_month: parseFloat(paidThisMonthRes.rows[0].sum || '0'),
      chartData
    };
  }

  // Trả về Pool Client để Service phục vụ Transaction SQL
  async getTxClient() {
    return await pool.connect();
  }

  // Cập nhật thông tin Hub
  async updateHub(id_hub: number, hub_name: string, description: string) {
    const result = await pool.query(
      'UPDATE hubs SET hub_name = $1, description = $2 WHERE id_hub = $3 RETURNING *',
      [hub_name, description, id_hub]
    );
    return result.rows[0] || null;
  }

  // Cập nhật thông tin Spoke
  async updateSpoke(id_spoke: number, spoke_name: string) {
    const result = await pool.query(
      'UPDATE spokes SET spoke_name = $1 WHERE id_spoke = $2 RETURNING *',
      [spoke_name, id_spoke]
    );
    return result.rows[0] || null;
  }

  // Xóa Hub
  async deleteHub(id_hub: number) {
    const result = await pool.query('DELETE FROM hubs WHERE id_hub = $1 RETURNING *', [id_hub]);
    return result.rowCount ? true : false;
  }

  // Xóa Spoke
  async deleteSpoke(id_spoke: number) {
    const result = await pool.query('DELETE FROM spokes WHERE id_spoke = $1 RETURNING *', [id_spoke]);
    return result.rowCount ? true : false;
  }

  // Lấy Role hiện tại của User
  async findUserRoles(id_user: number) {
    const result = await pool.query(
      'SELECT ur.id_role, r.role_name FROM user_roles ur JOIN roles r ON ur.id_role = r.id_role WHERE ur.id_user = $1',
      [id_user]
    );
    return result.rows;
  }

  // Cấp thêm Role cho User
  async grantRole(id_user: number, id_role: number) {
    const result = await pool.query(
      'INSERT INTO user_roles (id_user, id_role) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [id_user, id_role]
    );
    return result.rows[0];
  }

  // Thu hồi Role khỏi User
  async revokeRole(id_user: number, id_role: number) {
    const result = await pool.query(
      'DELETE FROM user_roles WHERE id_user = $1 AND id_role = $2 RETURNING *',
      [id_user, id_role]
    );
    return result.rowCount;
  }

  // Lấy danh sách tất cả Roles trong hệ thống
  async getAllRoles() {
    const result = await pool.query('SELECT * FROM roles ORDER BY id_role ASC');
    return result.rows;
  }

  // Lấy danh sách nhân viên
  async getEmployees() {
    const result = await pool.query(`
      SELECT 
        e.id_employee, e.full_name, e.gender, e.email, e.citizen_id, e.home_address, e.dob,
        u.id_user, u.phone, u.is_active,
        COALESCE(json_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '[]') AS roles,
        MAX(ea.id_hub) AS id_hub,
        MAX(ea.id_spoke) AS id_spoke,
        MAX(h.hub_name) AS hub_name,
        MAX(sp.spoke_name) AS spoke_name
      FROM employees e
      LEFT JOIN users u ON e.id_user = u.id_user
      LEFT JOIN user_roles ur ON u.id_user = ur.id_user
      LEFT JOIN roles r ON ur.id_role = r.id_role
      LEFT JOIN employee_assignments ea ON e.id_employee = ea.id_employee AND ea.is_active = TRUE
      LEFT JOIN hubs h ON ea.id_hub = h.id_hub
      LEFT JOIN spokes sp ON ea.id_spoke = sp.id_spoke
      GROUP BY e.id_employee, u.id_user
      ORDER BY e.id_employee ASC
    `);
    return result.rows;
  }

  // Vô hiệu hóa tài khoản
  async deactivateEmployee(id_user: number) {
    const result = await pool.query(
      'UPDATE users SET is_active = FALSE WHERE id_user = $1 RETURNING id_user, phone, is_active',
      [id_user]
    );
    return result.rows[0] || null;
  }

  // Lấy danh sách Shop
  async getAllShops() {
    const result = await pool.query(`
      SELECT 
        s.id_shop, s.shop_name, NULL as tax_code, NULL as representative,
        u.phone, u.is_active,
        COALESCE(w.balance, 0) AS wallet_balance,
        COUNT(DISTINCT o.id_order) AS total_orders
      FROM shops s
      LEFT JOIN users u ON s.id_user = u.id_user
      LEFT JOIN wallets w ON w.id_account = u.id_user
      LEFT JOIN stores st ON st.id_shop = s.id_shop
      LEFT JOIN orders o ON o.id_store = st.id_store
      GROUP BY s.id_shop, u.phone, u.is_active, w.balance
      ORDER BY s.id_shop ASC
    `);
    return result.rows;
  }

  // Lấy toàn bộ đơn hàng (Admin)
  async getAllOrders(status?: string, limit = 50, offset = 0) {
    const params: any[] = [limit, offset];
    let where = '';
    let countWhere = '';
    if (status) {
      params.push(status);
      where = `WHERE o.status = $${params.length}`;
      countWhere = `WHERE o.status = $1`;
    }
    const result = await pool.query(`
      SELECT 
        o.id_order, o.tracking_code, o.status, o.shipping_fee, o.cod_amount,
        o.receiver_name, o.receiver_phone, o.weight, o.created_at,
        s.shop_name, st.store_name
      FROM orders o
      JOIN stores st ON o.id_store = st.id_store
      JOIN shops s ON st.id_shop = s.id_shop
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    // Fix: Add table alias 'o' to 'orders' so o.status matches
    const countRes = await pool.query(`SELECT COUNT(*) FROM orders o ${countWhere}`, status ? [status] : []);
    
    return { rows: result.rows, total: parseInt(countRes.rows[0].count) };
  }

  // Lấy danh sách Bags
  async getAllBags() {
    const result = await pool.query(`
      SELECT 
        b.*,
        h1.hub_name AS origin_hub_name,
        h2.hub_name AS dest_hub_name,
        COUNT(bi.id_order) AS item_count
      FROM bags b
      LEFT JOIN hubs h1 ON b.origin_hub_id = h1.id_hub
      LEFT JOIN hubs h2 ON b.dest_hub_id = h2.id_hub
      LEFT JOIN bag_items bi ON b.id_bag = bi.id_bag
      GROUP BY b.id_bag, h1.hub_name, h2.hub_name
      ORDER BY b.id_bag DESC
    `);
    return result.rows;
  }

  async getShipperWardAssignments() {
    const result = await pool.query(`
      SELECT swa.*,
             u.phone as shipper_phone,
             e.full_name as shipper_name,
             s.spoke_name
      FROM shipper_ward_assignments swa
      JOIN users u ON u.id_user = swa.id_shipper
      JOIN employees e ON e.id_user = u.id_user
      JOIN spokes s ON s.id_spoke = swa.id_spoke
      ORDER BY swa.id_spoke ASC, swa.priority ASC, swa.province ASC, swa.district ASC, swa.ward ASC NULLS LAST
    `);
    return result.rows;
  }

  async createShipperWardAssignment(data: {
    id_shipper: number;
    id_spoke: number;
    province: string;
    district: string;
    ward?: string | null;
    priority?: number;
  }) {
    const result = await pool.query(
      `
      INSERT INTO shipper_ward_assignments
        (id_shipper, id_spoke, province, district, ward, priority, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *
    `,
      [
        data.id_shipper,
        data.id_spoke,
        data.province,
        data.district,
        data.ward || null,
        data.priority || 100,
      ]
    );
    return result.rows[0] || null;
  }

  async deleteShipperWardAssignment(id_assignment: number) {
    const result = await pool.query(
      'DELETE FROM shipper_ward_assignments WHERE id_assignment = $1 RETURNING id_assignment',
      [id_assignment]
    );
    return result.rowCount ? true : false;
  }
}
