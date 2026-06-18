import { pool } from '../config/db';
import { extractProvinceDistrictFromAddress, isSameArea } from '../utils/location';
import { ORDER_STATUS, orderStatusVariants } from '../utils/orderStatus';

export class StockkeeperRepository {
  // Láº¥y Hub/Spoke mÃ  thá»§ kho Ä‘ang lÃ m viá»‡c
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

  // TÃ¬m Ä‘Æ¡n hÃ ng theo tracking code
  async findOrderByTracking(tracking_code: string) {
    const result = await pool.query(`
      SELECT o.*,
             a.id_spoke as dest_spoke,
             s.id_hub as dest_hub,
             st.address as store_address,
             wi.id_hub as current_hub,
             wi.id_spoke as current_spoke,
             wi.shelf_location,
             wi.last_updated as last_warehouse_update
      FROM orders o
      LEFT JOIN areas a ON o.id_dest_area = a.id_area
      LEFT JOIN spokes s ON a.id_spoke = s.id_spoke
      LEFT JOIN stores st ON o.id_store = st.id_store
      LEFT JOIN warehouse_inventory wi ON wi.id_order = o.id_order
      WHERE o.tracking_code = $1
    `, [tracking_code]);
    return result.rows[0] || null;
  }

  // Kiá»ƒm tra Ä‘Æ¡n Ä‘Ã£ nháº­p kho TRÆ¯á»šC ÄÃ“ táº¡i kho nÃ y chÆ°a (rÃ ng buá»™c: khÃ´ng xuáº¥t náº¿u chÆ°a nháº­p)
  async findInventoryRecord(id_order: number, id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      SELECT * FROM warehouse_inventory
      WHERE id_order = $1 AND (id_hub = $2 OR id_spoke = $3)
    `, [id_order, id_hub, id_spoke]);
    return result.rows[0] || null;
  }

  // NHáº¬P KHO: ThÃªm/cáº­p nháº­t báº£n ghi tá»“n kho
  async upsertInventory(id_order: number, id_hub: number | null, id_spoke: number | null, shelf_location: string | null, client: any) {
    // XÃ³a báº£n ghi cÅ© náº¿u cÃ³ (hÃ ng di chuyá»ƒn tá»« kho nÃ y sang kho khÃ¡c)
    await client.query('DELETE FROM warehouse_inventory WHERE id_order = $1', [id_order]);

    await client.query(`
      INSERT INTO warehouse_inventory (id_order, id_hub, id_spoke, shelf_location, last_updated)
      VALUES ($1, $2, $3, $4, NOW())
    `, [id_order, id_hub, id_spoke, shelf_location]);
  }

  // XUáº¤T KHO: XÃ³a báº£n ghi tá»“n kho
  async removeInventory(id_order: number, client: any) {
    await client.query('DELETE FROM warehouse_inventory WHERE id_order = $1', [id_order]);
  }

  // Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
  async updateOrderStatus(id_order: number, status: string, client: any) {
    await client.query('UPDATE orders SET status = $1 WHERE id_order = $2', [status, id_order]);
  }

  async updateCurrentShipper(id_order: number, id_shipper: number | null, client: any) {
    await client.query('UPDATE orders SET current_shipper_id = $1 WHERE id_order = $2', [id_shipper, id_order]);
  }

  // Ghi log vÃ o order_logs
  async insertOrderLog(id_order: number, id_location: number, id_actor: number, action: string, client: any) {
    await client.query(`
      INSERT INTO order_logs (id_order, id_location, id_actor, action)
      VALUES ($1, $2, $3, $4)
    `, [id_order, id_location, id_actor, action]);
  }

  // Xem danh sÃ¡ch hÃ ng Ä‘ang trong kho cá»§a mÃ¬nh
  async getInventoryList(id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      SELECT wi.id_order as id_inventory,
             wi.*,
             wi.last_updated as entered_at,
             wi.last_updated,
             o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.status, o.weight, o.cod_amount,
             a.province, a.district, a.area_type,
             COALESCE(h.hub_name, sp.spoke_name) as current_warehouse_name,
             dest_sp.spoke_name as dest_spoke_name,
             dest_h.hub_name as dest_hub_name,
             EXTRACT(EPOCH FROM (NOW() - wi.last_updated)) / 3600 as hours_in_warehouse
      FROM warehouse_inventory wi
      JOIN orders o ON wi.id_order = o.id_order
      JOIN areas a ON o.id_dest_area = a.id_area
      LEFT JOIN hubs h ON h.id_hub = wi.id_hub
      LEFT JOIN spokes sp ON sp.id_spoke = wi.id_spoke
      LEFT JOIN spokes dest_sp ON dest_sp.id_spoke = a.id_spoke
      LEFT JOIN hubs dest_h ON dest_h.id_hub = dest_sp.id_hub
      WHERE ($1::int IS NULL OR wi.id_hub = $1)
        AND ($2::int IS NULL OR wi.id_spoke = $2)
      ORDER BY wi.last_updated ASC
    `, [id_hub, id_spoke]);
    return result.rows;
  }

  // Cáº£nh bÃ¡o: ÄÆ¡n tá»“n kho quÃ¡ 24h chÆ°a Ä‘Æ°á»£c Ä‘iá»u phá»‘i (theo Docx)
  async getOverdueAlerts(id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      SELECT wi.id_order as id_inventory,
             wi.*,
             wi.last_updated as entered_at,
             o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.status, a.province, a.district,
             wi.shelf_location,
             COALESCE(h.hub_name, sp.spoke_name) as current_warehouse_name,
             dest_sp.spoke_name as dest_spoke_name,
             dest_h.hub_name as dest_hub_name,
             ROUND(EXTRACT(EPOCH FROM (NOW() - wi.last_updated)) / 3600, 1) as hours_in_warehouse
      FROM warehouse_inventory wi
      JOIN orders o ON wi.id_order = o.id_order
      JOIN areas a ON o.id_dest_area = a.id_area
      LEFT JOIN hubs h ON h.id_hub = wi.id_hub
      LEFT JOIN spokes sp ON sp.id_spoke = wi.id_spoke
      LEFT JOIN spokes dest_sp ON dest_sp.id_spoke = a.id_spoke
      LEFT JOIN hubs dest_h ON dest_h.id_hub = dest_sp.id_hub
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
        WHERE status = ANY($2::text[])
          AND current_shipper_id IS NOT NULL
        GROUP BY current_shipper_id
      ) loads ON loads.current_shipper_id = swa.id_shipper
      WHERE swa.id_spoke = $1
        AND swa.is_active = TRUE
      ORDER BY swa.priority ASC, COALESCE(loads.active_orders, 0) ASC, swa.id_shipper ASC
    `,
      [id_spoke, orderStatusVariants(ORDER_STATUS.DELIVERING)]
    );
    return result.rows;
  }

  async getTxClient() {
    return await pool.connect();
  }

  // Resolve Spoke/Hub tá»« Ä‘á»‹a chá»‰ text (address string)
  async resolveSpokeAndHubByAddress(address: string) {
    const parsed = extractProvinceDistrictFromAddress(address || '');
    if (!parsed) return null;

    const result = await pool.query(`
      SELECT a.id_spoke, a.province, a.district, s.id_hub
      FROM areas a
      JOIN spokes s ON a.id_spoke = s.id_spoke
      ORDER BY a.id_area ASC
    `);

    return result.rows.find((row: any) =>
      isSameArea(row.province || '', row.district || '', parsed.province, parsed.district)
    ) || null;
  }

  // BAGS - Smart Next-Hop Grouping
  // XÃ¡c Ä‘á»‹nh "next hop" cá»§a má»—i Ä‘Æ¡n dá»±a trÃªn areaâ†’spokeâ†’hub mapping
  // Náº¿u Ä‘Æ¡n Ä‘ang á»Ÿ Hub A vÃ  dest_hub khÃ¡c Hub A â†’ cáº§n gom bao vá» Hub dest
  // Náº¿u Ä‘Æ¡n Ä‘ang á»Ÿ Hub mÃ  dest_hub = Hub nÃ y â†’ gom bao vá» Spoke Ä‘Ã­ch (local delivery)
  async getOrdersForBagging(id_hub: number | null, id_spoke: number | null) {
    const result = await pool.query(`
      WITH order_dest AS (
        SELECT
          wi.id_order,
          wi.last_updated,
          wi.id_hub as current_hub_id,
          wi.id_spoke as current_spoke_id,
          o.tracking_code,
          o.receiver_name,
          o.receiver_address,
          a.province,
          a.district,
          a.id_spoke as dest_spoke_id,
          dest_sp.spoke_name as dest_spoke_name,
          dest_sp.id_hub as dest_hub_id,
          dest_h.hub_name as dest_hub_name
        FROM warehouse_inventory wi
        JOIN orders o ON wi.id_order = o.id_order
        LEFT JOIN areas a ON o.id_dest_area = a.id_area
        LEFT JOIN spokes dest_sp ON a.id_spoke = dest_sp.id_spoke
        LEFT JOIN hubs dest_h ON dest_sp.id_hub = dest_h.id_hub
        WHERE ($1::int IS NULL OR wi.id_hub = $1)
          AND ($2::int IS NULL OR wi.id_spoke = $2)
          AND wi.id_order NOT IN (
            SELECT bi.id_order
            FROM bag_items bi
            JOIN bags b ON bi.id_bag = b.id_bag
            WHERE b.status IN ('CREATED', 'SEALED', 'IN_TRANSIT')
          )
      )
      SELECT *,
        -- Náº¿u dest_hub khÃ¡c hub hiá»‡n táº¡i â†’ next_hop lÃ  Hub Ä‘Ã­ch (inter-hub transit)
        -- Náº¿u cÃ¹ng hub â†’ next_hop lÃ  Spoke Ä‘Ã­ch (local last-mile)
        CASE
          WHEN current_hub_id IS NOT NULL AND dest_hub_id IS NOT NULL AND dest_hub_id != current_hub_id
            THEN 'HUB'
          WHEN dest_spoke_id IS NOT NULL
            THEN 'SPOKE'
          ELSE 'UNKNOWN'
        END as next_hop_type,
        CASE
          WHEN current_hub_id IS NOT NULL AND dest_hub_id IS NOT NULL AND dest_hub_id != current_hub_id
            THEN dest_hub_id
          WHEN dest_spoke_id IS NOT NULL
            THEN dest_spoke_id
          ELSE NULL
        END as next_hop_id,
        CASE
          WHEN current_hub_id IS NOT NULL AND dest_hub_id IS NOT NULL AND dest_hub_id != current_hub_id
            THEN dest_hub_name
          WHEN dest_spoke_name IS NOT NULL
            THEN dest_spoke_name
          ELSE 'Äiá»ƒm Ä‘áº¿n khÃ´ng xÃ¡c Ä‘á»‹nh'
        END as next_hop_name
      FROM order_dest
      ORDER BY next_hop_name, tracking_code
    `, [id_hub, id_spoke]);
    return result.rows;
  }

  async getBagsForWarehouse(id_hub: number | null, id_spoke: number | null) {
    const bagsResult = await pool.query(
      `
      SELECT b.id_bag,
             b.bag_code,
             b.origin_hub_id,
             origin_hub.hub_name as origin_hub_name,
             b.dest_hub_id,
             dest_hub.hub_name as dest_hub_name,
             b.dest_spoke_id,
             dest_spoke.spoke_name as dest_spoke_name,
             b.status,
             COUNT(bi.id_order)::int as item_count
      FROM bags b
      LEFT JOIN hubs origin_hub ON origin_hub.id_hub = b.origin_hub_id
      LEFT JOIN hubs dest_hub ON dest_hub.id_hub = b.dest_hub_id
      LEFT JOIN spokes dest_spoke ON dest_spoke.id_spoke = b.dest_spoke_id
      LEFT JOIN bag_items bi ON bi.id_bag = b.id_bag
      WHERE ($1::int IS NOT NULL AND (b.origin_hub_id = $1 OR b.dest_hub_id = $1))
         OR ($2::int IS NOT NULL AND b.dest_spoke_id = $2)
      GROUP BY b.id_bag, origin_hub.hub_name, dest_hub.hub_name, dest_spoke.spoke_name
      ORDER BY b.id_bag DESC
      LIMIT 50
      `,
      [id_hub, id_spoke]
    );

    const bags = bagsResult.rows;
    if (!bags.length) return [];

    const itemResult = await pool.query(
      `
      SELECT bi.id_bag,
             o.id_order,
             o.tracking_code,
             o.receiver_name,
             o.status,
             a.province,
             a.district
      FROM bag_items bi
      JOIN orders o ON o.id_order = bi.id_order
      LEFT JOIN areas a ON a.id_area = o.id_dest_area
      WHERE bi.id_bag = ANY($1::int[])
      ORDER BY bi.id_bag DESC, o.id_order ASC
      `,
      [bags.map((bag: any) => bag.id_bag)]
    );

    const itemsByBag = itemResult.rows.reduce((acc: Record<number, any[]>, item: any) => {
      acc[item.id_bag] = acc[item.id_bag] || [];
      acc[item.id_bag].push(item);
      return acc;
    }, {});

    return bags.map((bag: any) => ({
      ...bag,
      items: itemsByBag[bag.id_bag] || [],
    }));
  }

  async createBag(
    origin_hub_id: number | null,
    dest_hub_id: number | null,
    order_ids: number[],
    client: any,
    dest_spoke_id?: number | null
  ) {
    const bag_code = 'B-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const result = await client.query(
      `INSERT INTO bags (bag_code, origin_hub_id, dest_hub_id, dest_spoke_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_bag, bag_code`,
      [bag_code, origin_hub_id || null, dest_hub_id || null, dest_spoke_id || null, 'CREATED']
    );
    const id_bag = result.rows[0].id_bag;

    for (let id_order of order_ids) {
      await client.query('INSERT INTO bag_items (id_bag, id_order) VALUES ($1, $2)', [id_bag, id_order]);
    }
    return bag_code;
  }

  async updateBagStatus(bag_code: string, new_status: string) {
    const result = await pool.query(
      'UPDATE bags SET status = $1 WHERE bag_code = $2 RETURNING id_bag',
      [new_status, bag_code]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
