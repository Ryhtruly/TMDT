import { pool } from '../config/db';

export class BagRepository {
  async createBag(bag_code: string, origin_hub_id: number, dest_hub_id: number, client: any) {
    const result = await client.query(
      "INSERT INTO bags (bag_code, origin_hub_id, dest_hub_id, status) VALUES ($1, $2, $3, 'SEALED') RETURNING *",
      [bag_code, origin_hub_id, dest_hub_id]
    );
    return result.rows[0];
  }

  async addItemToBag(id_bag: number, id_order: number, client: any) {
    await client.query('INSERT INTO bag_items (id_bag, id_order) VALUES ($1, $2)', [id_bag, id_order]);
  }

  async findBagByCode(bag_code: string) {
    const result = await pool.query('SELECT * FROM bags WHERE bag_code = $1', [bag_code]);
    return result.rows[0] || null;
  }

  async getBagItems(id_bag: number) {
    const result = await pool.query(`
      SELECT bi.*, o.tracking_code, o.receiver_name, o.status, o.weight
      FROM bag_items bi JOIN orders o ON bi.id_order = o.id_order
      WHERE bi.id_bag = $1
    `, [id_bag]);
    return result.rows;
  }

  async updateBagStatus(id_bag: number, status: string, client: any) {
    await client.query('UPDATE bags SET status = $1 WHERE id_bag = $2', [status, id_bag]);
  }

  async getBagsByHub(id_hub: number) {
    const result = await pool.query(`
      SELECT b.*, h1.hub_name as origin_hub, h2.hub_name as dest_hub,
             (SELECT COUNT(*) FROM bag_items bi WHERE bi.id_bag = b.id_bag) as item_count
      FROM bags b
      JOIN hubs h1 ON b.origin_hub_id = h1.id_hub
      JOIN hubs h2 ON b.dest_hub_id = h2.id_hub
      WHERE b.origin_hub_id = $1 OR b.dest_hub_id = $1
      ORDER BY b.id_bag DESC
    `, [id_hub]);
    return result.rows;
  }

  async getTxClient() { return await pool.connect(); }
}
