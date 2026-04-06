const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123',
  database: process.env.PG_DATABASE || 'QLKV'
});

const testPasswords = [
  'Shipper1@123', 'Shipper2@123', 'Admin@123', 
  'shipper1@123', '123456', 'password',
  'Shipper@123', '123'
];

async function run() {
  const result = await pool.query(
    `SELECT u.id_user, u.phone, u.password,
            string_agg(r.role_name, ', ') as roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id_user = ur.id_user
     LEFT JOIN roles r ON ur.id_role = r.id_role
     WHERE r.role_name IN ('SHIPPER', 'ADMIN')
     GROUP BY u.id_user, u.phone, u.password
     ORDER BY u.id_user`
  );

  console.log(`\nFound ${result.rows.length} users with SHIPPER/ADMIN role\n`);

  for (const user of result.rows) {
    const isPlain = !user.password.startsWith('$2');
    console.log(`--- ${user.phone} [${user.roles}] ---`);
    
    if (isPlain) {
      console.log(`  Mật khẩu PLAIN: "${user.password}"`);
    } else {
      console.log(`  Mật khẩu BCRYPT: ${user.password.substring(0, 20)}...`);
      for (const pw of testPasswords) {
        const match = await bcrypt.compare(pw, user.password);
        if (match) {
          console.log(`  ✅ Mật khẩu đúng: "${pw}"`);
          break;
        }
      }
    }
  }
  
  await pool.end();
}

run().catch(e => { console.error('ERROR:', e.message); pool.end(); });
