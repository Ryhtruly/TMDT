/**
 * Script chạy 1 lần để hash tất cả plaintext passwords trong DB demo.
 * Chạy: npx ts-node scripts/seed-passwords.ts
 */
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123',
  database: process.env.PG_DATABASE || 'QLKV',
});

const users = [
  { phone: '0901234567', password: 'Admin@123' },
  { phone: '0987654321', password: 'Shop1@123' },
  { phone: '0912345678', password: 'Shop2@123' },
  { phone: '0923456789', password: 'Shop3@123' },
  { phone: '0933445566', password: 'Shipper1@123' },
  { phone: '0944556677', password: 'Shipper2@123' },
  { phone: '0955667788', password: 'Shipper3@123' },
  { phone: '0966778899', password: 'Shipper4@123' },
  { phone: '0977889900', password: 'Stock1@123' },
  { phone: '0988990011', password: 'Stock2@123' },
  { phone: '0999000111', password: 'Emp1@123' },
  { phone: '0999000222', password: 'Emp2@123' },
];

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔐 Bắt đầu hash passwords...\n');
    for (const user of users) {
      const hashed = await bcrypt.hash(user.password, 10);
      await client.query('UPDATE users SET password = $1 WHERE phone = $2', [hashed, user.phone]);
      console.log(`✅ ${user.phone} → hashed`);
    }
    console.log('\n✅ Xong! Tất cả passwords đã được hash.');
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
