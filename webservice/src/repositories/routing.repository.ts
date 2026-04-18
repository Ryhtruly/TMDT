import { pool } from '../config/db';
import { extractProvinceDistrictFromAddress, isSameArea } from '../utils/location';

export class RoutingRepository {
  // Tìm Spoke gốc từ Store (Store → Shop area → Spoke)
  async findOriginSpokeByStore(id_store: number) {
    const storeRes = await pool.query('SELECT id_store, address FROM stores WHERE id_store = $1', [id_store]);
    const store = storeRes.rows[0];
    if (!store?.address) return null;

    const parsed = extractProvinceDistrictFromAddress(store.address);
    if (!parsed) return null;

    const result = await pool.query(`
      SELECT a.id_area, a.province, a.district, a.area_type,
             s.id_spoke, s.spoke_name, s.id_hub, h.hub_name, s.id_location as spoke_location
      FROM areas a
      JOIN spokes s ON a.id_spoke = s.id_spoke
      JOIN hubs h ON s.id_hub = h.id_hub
      ORDER BY a.id_area ASC
    `);

    return result.rows.find((row) => isSameArea(row.province, row.district, parsed.province, parsed.district)) || null;
  }

  // Tìm Spoke đích từ Area
  async findDestSpokeByArea(id_area: number) {
    const result = await pool.query(`
      SELECT a.id_spoke, s.spoke_name, s.id_hub, h.hub_name, s.id_location as spoke_location
      FROM areas a
      JOIN spokes s ON a.id_spoke = s.id_spoke
      JOIN hubs h ON s.id_hub = h.id_hub
      WHERE a.id_area = $1
    `, [id_area]);
    return result.rows[0] || null;
  }

  // Tìm route đã tồn tại giữa 2 Spoke
  async findExistingRoute(origin_spoke: number, dest_spoke: number) {
    const result = await pool.query(
      'SELECT * FROM routes WHERE origin_spoke = $1 AND dest_spoke = $2',
      [origin_spoke, dest_spoke]
    );
    return result.rows[0] || null;
  }

  // Tạo route mới
  async createRoute(origin_spoke: number, dest_spoke: number, route_type: string, total_nodes: number, client: any) {
    const result = await client.query(
      'INSERT INTO routes (origin_spoke, dest_spoke, route_type, total_nodes) VALUES ($1, $2, $3, $4) RETURNING id_route',
      [origin_spoke, dest_spoke, route_type, total_nodes]
    );
    return result.rows[0].id_route;
  }

  // Thêm node vào route
  async addRouteNode(id_route: number, id_location: number, stop_order: number, is_intermediate: boolean, client: any) {
    await client.query(
      'INSERT INTO route_nodes (id_route, id_location, stop_order, is_intermediate) VALUES ($1, $2, $3, $4)',
      [id_route, id_location, stop_order, is_intermediate]
    );
  }

  // Lấy chi tiết các node của route
  async getRouteNodes(id_route: number) {
    const result = await pool.query(`
      SELECT rn.*, l.location_name, l.location_type, l.address
      FROM route_nodes rn
      JOIN locations l ON rn.id_location = l.id_location
      WHERE rn.id_route = $1
      ORDER BY rn.stop_order ASC
    `, [id_route]);
    return result.rows;
  }

  // Lấy khoảng cách giữa 2 location
  async getDistance(from_loc: number, to_loc: number) {
    const result = await pool.query(
      'SELECT distance_km, estimated_time FROM route_distances WHERE from_location = $1 AND to_location = $2',
      [from_loc, to_loc]
    );
    return result.rows[0] || null;
  }

  // Lưu/cập nhật khoảng cách
  async upsertDistance(from_loc: number, to_loc: number, distance_km: number, estimated_time: number, client: any) {
    await client.query(`
      INSERT INTO route_distances (from_location, to_location, distance_km, estimated_time)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (from_location, to_location) DO UPDATE SET distance_km = $3, estimated_time = $4
    `, [from_loc, to_loc, distance_km, estimated_time]);
  }

  // Lấy location của Hub
  async getHubLocation(id_hub: number) {
    const result = await pool.query('SELECT id_location FROM hubs WHERE id_hub = $1', [id_hub]);
    return result.rows[0]?.id_location || null;
  }

  // Xem tất cả routes
  async getAllRoutes() {
    const result = await pool.query(`
      SELECT r.*,
             s1.spoke_name as origin_name, h1.hub_name as origin_hub,
             s2.spoke_name as dest_name, h2.hub_name as dest_hub
      FROM routes r
      JOIN spokes s1 ON r.origin_spoke = s1.id_spoke
      JOIN hubs h1 ON s1.id_hub = h1.id_hub
      JOIN spokes s2 ON r.dest_spoke = s2.id_spoke
      JOIN hubs h2 ON s2.id_hub = h2.id_hub
      ORDER BY r.id_route ASC
    `);
    return result.rows;
  }

  async getTxClient() {
    return await pool.connect();
  }

  // ==== AUTO GENERATE ROUTE METHODS ====
  async getSpokeWithLocation(id_spoke: number) {
    const result = await pool.query('SELECT * FROM spokes WHERE id_spoke = $1', [id_spoke]);
    return result.rows[0] || null;
  }

  async getHubWithLocation(id_hub: number) {
    const result = await pool.query('SELECT * FROM hubs WHERE id_hub = $1', [id_hub]);
    return result.rows[0] || null;
  }
}
