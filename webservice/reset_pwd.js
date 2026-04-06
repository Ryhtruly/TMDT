const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123',
  database: process.env.PG_DATABASE || 'QLKV'
});
pool.query("UPDATE users SET password = '111' WHERE phone = '0999000222'")
  .then(() => {
    console.log('Update success!');
    pool.end();
  }).catch(e => {
    console.error(e);
    pool.end();
  });
