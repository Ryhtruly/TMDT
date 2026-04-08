import { pool } from '../config/db';
import { isSameArea } from '../utils/location';

export class ShopRepository {
  // Tìm user theo SĐT (dùng validate đăng ký trùng)
  async findUserByPhone(phone: string) {
    const result = await pool.query('SELECT id_user FROM users WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  }

  // Lấy Role ID theo tên
  async findRoleByName(role_name: string) {
    const result = await pool.query('SELECT id_role FROM roles WHERE role_name = $1', [role_name]);
    return result.rows[0] || null;
  }

  // Tạo user mới
  async createUser(phone: string, hashedPassword: string, client: any) {
    const result = await client.query(
      'INSERT INTO users (phone, password, is_active) VALUES ($1, $2, TRUE) RETURNING id_user',
      [phone, hashedPassword]
    );
    return result.rows[0].id_user;
  }

  // Gán role cho user
  async assignRole(id_user: number, id_role: number, client: any) {
    await client.query('INSERT INTO user_roles (id_user, id_role) VALUES ($1, $2)', [id_user, id_role]);
  }

  // Tạo Shop profile
  async createShop(id_user: number, shop_name: string, tax_code: string, representative: string, client: any) {
    const result = await client.query(
      'INSERT INTO shops (id_user, shop_name, tax_code, representative) VALUES ($1, $2, $3, $4) RETURNING id_shop',
      [id_user, shop_name, tax_code, representative]
    );
    return result.rows[0].id_shop;
  }

  // Tạo ví tiền mặc định khi đăng ký
  async createWallet(id_user: number, client: any) {
    await client.query(
      'INSERT INTO wallets (id_account, balance, credit_limit, used_credit) VALUES ($1, 0, 60000, 0)',
      [id_user]
    );
  }

  // Lấy thông tin Shop đầy đủ theo id_user
  async findShopByUserId(id_user: number) {
    const result = await pool.query(`
      SELECT s.*, u.phone, w.balance, w.credit_limit, w.used_credit,
             w.id_wallet
      FROM shops s
      JOIN users u ON s.id_user = u.id_user
      LEFT JOIN wallets w ON w.id_account = u.id_user
      WHERE s.id_user = $1
    `, [id_user]);
    return result.rows[0] || null;
  }

  // === STORES (Kho hàng / địa chỉ lấy hàng) ===
  async getStoresByShopId(id_shop: number) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE id_shop = $1 ORDER BY id_store ASC',
      [id_shop]
    );
    return result.rows;
  }

  async getAllSpokes() {
    const result = await pool.query(`
      SELECT s.id_spoke, s.spoke_name, l.address
      FROM spokes s
      JOIN locations l ON s.id_location = l.id_location
      ORDER BY s.id_spoke ASC
    `);
    return result.rows;
  }

  async findAreaByProvinceDistrict(province: string, district: string) {
    const result = await pool.query('SELECT * FROM areas ORDER BY id_area ASC');
    return result.rows.find((row) => isSameArea(row.province, row.district, province, district)) || null;
  }

  async createStore(id_shop: number, store_name: string, phone: string, address: string, description: string, client: any) {
    const result = await client.query(
      'INSERT INTO stores (id_shop, store_name, phone, address, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id_shop, store_name, phone, address, description]
    );
    return result.rows[0];
  }

  async updateStore(id_store: number, id_shop: number, store_name: string, phone: string, address: string, description: string) {
    const result = await pool.query(`
      UPDATE stores SET store_name=$1, phone=$2, address=$3, description=$4
      WHERE id_store=$5 AND id_shop=$6 RETURNING *
    `, [store_name, phone, address, description, id_store, id_shop]);
    return result.rows[0] || null;
  }

  async deleteStore(id_store: number, id_shop: number) {
    try {
      const result = await pool.query(
        'DELETE FROM stores WHERE id_store=$1 AND id_shop=$2 RETURNING id_store',
        [id_store, id_shop]
      );
      return result.rowCount;
    } catch (error: any) {
      if (error.code === '23503') {
        throw new Error('Không thể xóa kho này vì đã có đơn hàng được tạo từ đây.');
      }
      throw error;
    }
  }

  // === BANK ACCOUNTS ===
  async getBanksByUserId(id_user: number) {
    const result = await pool.query(
      'SELECT * FROM bank_accounts WHERE id_user = $1',
      [id_user]
    );
    return result.rows;
  }

  async addBankAccount(id_user: number, bank_name: string, account_number: string, account_holder: string) {
    const result = await pool.query(
      'INSERT INTO bank_accounts (id_user, bank_name, account_number, account_holder) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_user, bank_name, account_number, account_holder]
    );
    return result.rows[0];
  }

  async deleteBankAccount(id_bank: number, id_user: number) {
    const result = await pool.query(
      'DELETE FROM bank_accounts WHERE id_bank=$1 AND id_user=$2 RETURNING id_bank',
      [id_bank, id_user]
    );
    return result.rowCount;
  }

  // === VÍ TIỀN ===
  async getWalletByUserId(id_user: number) {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE id_account = $1',
      [id_user]
    );
    return result.rows[0] || null;
  }

  async getTransactionHistory(id_wallet: number) {
    const result = await pool.query(
      'SELECT * FROM transaction_history WHERE id_wallet = $1 ORDER BY created_at DESC LIMIT 50',
      [id_wallet]
    );
    return result.rows;
  }

  // Nạp tiền vào ví
  async topupWallet(id_wallet: number, amount: number, client: any) {
    await client.query(
      'UPDATE wallets SET balance = balance + $1 WHERE id_wallet = $2',
      [amount, id_wallet]
    );
    await client.query(
      'INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)',
      [id_wallet, amount, 'NẠP TIỀN']
    );
  }

  // Yêu cầu rút tiền khỏi ví
  async withdrawWallet(id_wallet: number, amount: number, client: any) {
    await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE id_wallet = $2',
      [amount, id_wallet]
    );
    await client.query(
      'INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)',
      [id_wallet, -amount, 'RÚT TIỀN COD']
    );
  }

  // === HỦY ĐƠN (Có kiểm tra trạng thái) ===
  async findOrderForCancellation(id_order: number, id_shop: number) {
    const result = await pool.query(`
      SELECT o.id_order, o.status, o.shipping_fee, o.insurance_fee
      FROM orders o
      JOIN stores s ON o.id_store = s.id_store
      WHERE o.id_order = $1 AND s.id_shop = $2
    `, [id_order, id_shop]);
    return result.rows[0] || null;
  }

  async cancelOrder(id_order: number, client: any) {
    await client.query(
      "UPDATE orders SET status = 'ĐÃ HỦY' WHERE id_order = $1",
      [id_order]
    );
  }

  // Hoàn tiền phí ship khi hủy
  async refundToWallet(id_wallet: number, amount: number, client: any) {
    await client.query(
      'UPDATE wallets SET balance = balance + $1 WHERE id_wallet = $2',
      [amount, id_wallet]
    );
    await client.query(
      'INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)',
      [id_wallet, amount, 'HOÀN TIỀN HỦY ĐƠN']
    );
  }

  // === BÁO CÁO DÒNG TIỀN ===
  async getCashflowReport(id_user: number) {
    const shopResult = await pool.query('SELECT id_shop FROM shops WHERE id_user = $1', [id_user]);
    if (!shopResult.rows[0]) return null;
    const id_shop = shopResult.rows[0].id_shop;

    const [totalFees, pendingCod, deliveredCod] = await Promise.all([
      // Tổng phí ship đã trả (tất cả đơn không hủy)
      pool.query(`
        SELECT SUM(o.shipping_fee + o.insurance_fee) as total_fees_paid
        FROM orders o JOIN stores s ON o.id_store = s.id_store
        WHERE s.id_shop = $1 AND o.status != 'ĐÃ HỦY'
      `, [id_shop]),
      // COD đang trên đường (đơn chưa giao thành công)
      pool.query(`
        SELECT SUM(o.cod_amount) as pending_cod
        FROM orders o JOIN stores s ON o.id_store = s.id_store
        WHERE s.id_shop = $1 AND o.status NOT IN ('GIAO THÀNH CÔNG', 'ĐÃ HỦY', 'HOÀN HÀNG')
      `, [id_shop]),
      // COD đã giao thành công (chờ đối soát)
      pool.query(`
        SELECT SUM(o.cod_amount) as delivered_cod
        FROM orders o JOIN stores s ON o.id_store = s.id_store
        WHERE s.id_shop = $1 AND o.status = 'GIAO THÀNH CÔNG'
      `, [id_shop])
    ]);

    return {
      total_fees_paid: parseFloat(totalFees.rows[0].total_fees_paid || '0'),
      pending_cod: parseFloat(pendingCod.rows[0].pending_cod || '0'),
      delivered_cod_awaiting_payout: parseFloat(deliveredCod.rows[0].delivered_cod || '0')
    };
  }

  async getTxClient() {
    return await pool.connect();
  }
}
