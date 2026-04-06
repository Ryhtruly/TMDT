import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123',
  database: process.env.PG_DATABASE || 'QLKV',
});

pool.on('connect', () => {
  console.log('✅ Đã kết nối thành công tới PostgreSQL (QLKV)');
});

pool.on('error', (err) => {
  console.error('❌ Lỗi mất kết nối PostgreSQL:', err);
});
