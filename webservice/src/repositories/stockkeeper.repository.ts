import { pool } from '../config/db';

export class StockkeeperRepository {
  // Lấy Hub/Spoke mà thủ kho đang làm việc
  async getStockkeeperAssignment(id_user: number) {
    const result = await pool.query(`
      SELECT ea.id_hub, ea.id_spoke, ea.is_active,
             h.hub_name, h.id_location as hub_location_id,
             s.spoke_name, s.id_location as spoke_location_id
      FROM employees e
      JOIN employee_assignments ea ON e.id_employee = ea.id_employee
      LEFT JOIN hubs h ON ea.id_hub = h.id_hub
      LEFT JOIN spokes s ON ea.id_spoke = s.id_spoke
      WHERE e.id_user = $1 AND ea.is_active = TRUE
      LIMIT 1
    `, [id_user]);
    return result.rows[0] || null;
  }

  // Tìm đơn hàng theo tracking code
  async findOrderByTracking(tracking_code: string) {
    const result = await pool.query(`
      SELECT o.*,
             a.id_spoke as dest_spoke,
             s.id_hub as dest_hub,
             wi.id_hub as current_hub,
             wi.id_spoke as current_spoke,
             wi.shelf_location,
             wi.last_updated as last_warehouse_update
      FROM orders o
      LEFT JOIN areas a ON o.id_dest_area = a.id_area
      LEFT JOIN spokes s ON a.id_spoke = s.id_spoke
      LEFT JOIN warehouse_inventory wi ON wi.id_order = o.id_order
      WHERE o.tracking_code = $1
    `, [tracking_code]);
    return result.rows[0] || null;
  }

  // Kiểm tra đơn đã nhập kho TRƯỚC ĐÓ tại kho này chưa (ràng buộc: không xuất nếu chưa nhập)
  async findInventoryRecord(id_order: number, id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      SELECT * FROM warehouse_inventory
      WHERE id_order = $1 AND (id_hub = $2 OR id_spoke = $3)
    `, [id_order, id_hub, id_spoke]);
    return result.rows[0] || null;
  }

  // NHẬP KHO: Thêm/cập nhật bản ghi tồn kho
  async upsertInventory(id_order: number, id_hub: number | null, id_spoke: number | null, shelf_location: string | null, client: any) {
    // Xóa bản ghi cũ nếu có (hàng di chuyển từ kho này sang kho khác)
    await client.query('DELETE FROM warehouse_inventory WHERE id_order = $1', [id_order]);
    
    await client.query(`
      INSERT INTO warehouse_inventory (id_order, id_hub, id_spoke, shelf_location, last_updated)
      VALUES ($1, $2, $3, $4, NOW())
    `, [id_order, id_hub, id_spoke, shelf_location]);
  }

  // XUẤT KHO: Xóa bản ghi tồn kho
  async removeInventory(id_order: number, client: any) {
    await client.query('DELETE FROM warehouse_inventory WHERE id_order = $1', [id_order]);
  }

  // Cập nhật trạng thái đơn hàng
  async updateOrderStatus(id_order: number, status: string, client: any) {
    await client.query('UPDATE orders SET status = $1 WHERE id_order = $2', [status, id_order]);
  }

  async updateCurrentShipper(id_order: number, id_shipper: number | null, client: any) {
    await client.query('UPDATE orders SET current_shipper_id = $1 WHERE id_order = $2', [id_shipper, id_order]);
  }

  // Ghi log vào order_logs
  async insertOrderLog(id_order: number, id_location: number, id_actor: number, action: string, client: any) {
    await client.query(`
      INSERT INTO order_logs (id_order, id_location, id_actor, action)
      VALUES ($1, $2, $3, $4)
    `, [id_order, id_location, id_actor, action]);
  }

  // Xem danh sách hàng đang trong kho của mình
  async getInventoryList(id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      SELECT wi.id_order as id_inventory,
             wi.*,
             wi.last_updated as entered_at,
             wi.last_updated,
             o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.status, o.weight, o.cod_amount,
             a.province, a.district, a.area_type,
             EXTRACT(EPOCH FROM (NOW() - wi.last_updated)) / 3600 as hours_in_warehouse
      FROM warehouse_inventory wi
      JOIN orders o ON wi.id_order = o.id_order
      JOIN areas a ON o.id_dest_area = a.id_area
      WHERE ($1::int IS NULL OR wi.id_hub = $1)
        AND ($2::int IS NULL OR wi.id_spoke = $2)
      ORDER BY wi.last_updated ASC
    `, [id_hub, id_spoke]);
    return result.rows;
  }

  // Cảnh báo: Đơn tồn kho quá 24h chưa được điều phối (theo Docx)
  async getOverdueAlerts(id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      SELECT wi.id_order as id_inventory,
             wi.*,
             wi.last_updated as entered_at,
             o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.status, a.province, a.district,
             wi.shelf_location,
             ROUND(EXTRACT(EPOCH FROM (NOW() - wi.last_updated)) / 3600, 1) as hours_in_warehouse
      FROM warehouse_inventory wi
      JOIN orders o ON wi.id_order = o.id_order
      JOIN areas a ON o.id_dest_area = a.id_area
      WHERE ($1::int IS NULL OR wi.id_hub = $1)
        AND ($2::int IS NULL OR wi.id_spoke = $2)
        AND wi.last_updated < NOW() - INTERVAL '24 hours'
      ORDER BY wi.last_updated ASC
    `, [id_hub, id_spoke]);
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

  async getTxClient() {
    return await pool.connect();
  }
}
