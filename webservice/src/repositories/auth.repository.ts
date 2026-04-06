import { pool } from '../config/db';

export class AuthRepository {
  async findUserByPhone(phone: string) {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1 AND is_active = TRUE', [phone]);
    return result.rows[0] || null;
  }

  async findUserRoles(userId: number) {
    const roleResult = await pool.query(`
      SELECT r.role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.id_role = r.id_role 
      WHERE ur.id_user = $1
    `, [userId]);
    return roleResult.rows.map(row => row.role_name);
  }

  async findShopInfoByUserId(userId: number) {
    const result = await pool.query('SELECT id_shop, shop_name FROM shops WHERE id_user = $1', [userId]);
    return result.rows[0] || null;
  }

  async findEmployeeInfoByUserId(userId: number) {
    const result = await pool.query('SELECT id_employee, full_name FROM employees WHERE id_user = $1', [userId]);
    return result.rows[0] || null;
  }
}
