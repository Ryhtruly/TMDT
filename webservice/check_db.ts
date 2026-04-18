import { pool } from './src/config/db';
pool.query("SELECT * FROM topup_transactions WHERE order_code = '63269556'")
  .then(res => console.log(res.rows[0]))
  .finally(()=>pool.end());
