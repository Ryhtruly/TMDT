import { pool } from '../config/db';
import { extractProvinceDistrictFromAddress, isSameArea } from '../utils/location';

export class OrderRepository {
  // Lấy thông tin Store để verify Shop sở hữu
  async findStoreByIdAndShop(id_store: number, id_shop: number) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE id_store = $1 AND id_shop = $2',
      [id_store, id_shop]
    );
    return result.rows[0] || null;
  }

  // Lấy thông tin Vùng đích (để tính loại vùng và area_type)
  async findAreaById(id_area: number) {
    const result = await pool.query(
      'SELECT a.*, s.id_hub as parent_hub_id FROM areas a LEFT JOIN spokes s ON a.id_spoke = s.id_spoke WHERE a.id_area = $1',
      [id_area]
    );
    return result.rows[0] || null;
  }

  async findOriginAreaByStore(id_store: number) {
    const storeRes = await pool.query('SELECT id_store, address FROM stores WHERE id_store = $1', [id_store]);
    const store = storeRes.rows[0];
    if (!store?.address) return null;

    const parsed = extractProvinceDistrictFromAddress(store.address);
    if (!parsed) return null;

    const areasRes = await pool.query(`
      SELECT a.*, s.id_hub as parent_hub_id
      FROM areas a
      LEFT JOIN spokes s ON a.id_spoke = s.id_spoke
      ORDER BY a.id_area ASC
    `);
    return areasRes.rows.find((row) => isSameArea(row.province, row.district, parsed.province, parsed.district)) || null;
  }

  // Lấy service type để biết hệ số nhân
  async findServiceType(id_service: number) {
    const result = await pool.query('SELECT * FROM service_types WHERE id_service = $1', [id_service]);
    return result.rows[0] || null;
  }

  // Lấy toàn bộ service types để hiển thị cho Shop chọn
  async getAllServiceTypes() {
    const result = await pool.query('SELECT * FROM service_types ORDER BY id_service ASC');
    return result.rows;
  }

  // Lấy bảng giá (theo vùng nội/ngoại thành)
  async findBestPricingRule(route_type: string, area_type: string, weight: number) {
    // Tính cân nặng quy đổi theo từng nấc (weight_step)
    const result = await pool.query(`
      SELECT * FROM pricing_rules
      WHERE route_type = $1 AND area_type = $2 AND weight_step >= $3
      ORDER BY weight_step ASC
      LIMIT 1
    `, [route_type, area_type, weight]);

    // Nếu không có rule phù hợp, lấy rule lớn nhất (hàng siêu nặng)
    if (!result.rows[0]) {
      const fallback = await pool.query(`
        SELECT * FROM pricing_rules
        WHERE route_type = $1 AND area_type = $2
        ORDER BY weight_step DESC LIMIT 1
      `, [route_type, area_type]);
      return fallback.rows[0] || null;
    }
    return result.rows[0];
  }

  // Khoá ví và kiểm tra số dư (Pessimistic Locking - chống race condition)
  async findWalletForUpdate(id_user: number, client: any) {
    const result = await client.query(
      'SELECT * FROM wallets WHERE id_account = $1 FOR UPDATE',
      [id_user]
    );
    return result.rows[0] || null;
  }

  // Trừ tiền ví + ghi lịch sử
  async deductWalletAndLog(id_wallet: number, amount: number, note: string, client: any) {
    await client.query(`
      UPDATE wallets 
      SET 
        used_credit = used_credit + CASE WHEN balance < $1 THEN $1 - balance ELSE 0 END,
        balance = CASE WHEN balance < $1 THEN 0 ELSE balance - $1 END
      WHERE id_wallet = $2
    `, [amount, id_wallet]);
    await client.query(
      'INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)',
      [id_wallet, -amount, note]
    );
  }

  // Chèn đơn hàng
  async insertOrder(data: any, client: any) {
    const {
      tracking_code, id_store, id_service_type,
      receiver_name, receiver_phone, receiver_address,
      id_dest_area, weight, item_value, cod_amount,
      insurance_fee, shipping_fee, note, status, payer_type, fee_payment_method,
      pickup_shift, dropoff_spoke_id
    } = data;

    const result = await client.query(`
      INSERT INTO orders 
        (tracking_code, id_store, id_service_type, receiver_name, receiver_phone,
         receiver_address, id_dest_area, weight, item_value, cod_amount,
         insurance_fee, shipping_fee, status, payer_type, fee_payment_method, pickup_shift, dropoff_spoke_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id_order
    `, [tracking_code, id_store, id_service_type, receiver_name, receiver_phone,
        receiver_address, id_dest_area, weight, item_value, cod_amount,
        insurance_fee, shipping_fee, status, payer_type || 'SENDER', fee_payment_method || 'WALLET', pickup_shift || null, dropoff_spoke_id || null]);
    return result.rows[0].id_order;
  }

  async insertCashCollection(data: any, client: any) {
    const {
      id_order,
      collection_type,
      payer_party,
      collection_stage,
      expected_amount,
    } = data;

    if (Number(expected_amount || 0) <= 0) return null;

    const result = await client.query(
      `
      INSERT INTO order_cash_collections
        (id_order, collection_type, payer_party, collection_stage, expected_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [id_order, collection_type, payer_party, collection_stage, expected_amount]
    );
    return result.rows[0];
  }

  // Ghi log đơn hàng
  async insertOrderLog(id_order: number, id_location: number, id_actor: number, action: string, client: any) {
    await client.query(
      'INSERT INTO order_logs (id_order, id_location, id_actor, action) VALUES ($1, $2, $3, $4)',
      [id_order, id_location, id_actor, action]
    );
  }

  // Lấy danh sách đơn của Shop
  async findOrdersByShopUserId(id_user: number, status_filter?: string) {
    let query = `
      SELECT o.id_order, o.tracking_code, o.receiver_name, o.receiver_phone,
             o.receiver_address, o.status, o.payer_type, o.fee_payment_method, o.shipping_fee, o.insurance_fee,
             o.cod_amount, o.item_value, o.weight, o.created_at,
             CASE
               WHEN COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
                 THEN COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)
               ELSE 0
             END as receiver_fee_on_delivery,
             CASE
               WHEN COALESCE(o.payer_type, 'SENDER') = 'SENDER'
                 AND COALESCE(o.fee_payment_method, 'WALLET') = 'CASH'
                 THEN COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)
               ELSE 0
             END as sender_cash_fee_on_pickup,
             COALESCE(o.cod_amount, 0) +
             CASE
               WHEN COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
                 THEN COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)
               ELSE 0
             END as cash_to_collect_on_delivery,
             (COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)) as total_fee,
             s.store_name, s.address as pickup_address,
             st.service_name
      FROM orders o
      JOIN stores s ON o.id_store = s.id_store
      JOIN shops sh ON s.id_shop = sh.id_shop
      LEFT JOIN service_types st ON o.id_service_type = st.id_service
      WHERE sh.id_user = $1
    `;
    const params: any[] = [id_user];

    if (status_filter) {
      query += ` AND o.status = $2`;
      params.push(status_filter);
    }

    query += ` ORDER BY o.created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Tra cứu chi tiết đơn theo tracking code
  async findOrderByTrackingCode(tracking_code: string) {
    const orderResult = await pool.query(`
      SELECT o.*, a.province, a.district, a.area_type,
             s.store_name, s.address as pickup_address, s.phone as pickup_phone,
             st.service_name
      FROM orders o
      JOIN areas a ON o.id_dest_area = a.id_area
      JOIN stores s ON o.id_store = s.id_store
      LEFT JOIN service_types st ON o.id_service_type = st.id_service
      WHERE o.tracking_code = $1
    `, [tracking_code]);

    if (!orderResult.rows[0]) return null;

    const logs = await pool.query(`
      SELECT ol.action, ol.created_at, ol.evidence_url,
             l.location_name, l.location_type,
             u.phone as actor_phone
      FROM order_logs ol
      JOIN locations l ON ol.id_location = l.id_location
      JOIN users u ON ol.id_actor = u.id_user
      WHERE ol.id_order = $1
      ORDER BY ol.created_at ASC
    `, [orderResult.rows[0].id_order]);

    return { order: orderResult.rows[0], timeline: logs.rows };
  }

  // Lấy Pool Client cho Transaction
  async getTxClient() {
    return await pool.connect();
  }
}
