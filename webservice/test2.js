require('dotenv').config(); 
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.query("UPDATE topup_transactions SET status = 'SUCCESS' WHERE order_code = $1 AND status = 'PENDING' RETURNING *", ['63144476'])
  .then(res => { console.log('Updated:', res.rowCount); return pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
