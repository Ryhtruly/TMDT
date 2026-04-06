const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '123',
  database: process.env.PG_DATABASE || 'QLKV'
});

pool.query(`
  SELECT u.phone, LEFT(u.password, 4) as pw_prefix, u.is_active,
         string_agg(r.role_name, ', ') as roles
  FROM users u
  LEFT JOIN user_roles ur ON u.id_user = ur.id_user
  LEFT JOIN roles r ON ur.id_role = r.id_role
  GROUP BY u.id_user, u.phone, u.password, u.is_active
  ORDER BY u.id_user
`).then(r => {
  console.log('\n=== USERS IN DATABASE ===');
  r.rows.forEach(x => {
    const pwType = x.pw_prefix === '$2b$' ? 'BCRYPT' : x.pw_prefix === '$2a$' ? 'BCRYPT' : 'PLAIN';
    console.log(`SĐT: ${x.phone} | PW: ${pwType} | Active: ${x.is_active} | Roles: ${x.roles}`);
  });
  pool.end();
}).catch(e => {
  console.error('Lỗi kết nối DB:', e.message);
  pool.end();
});
