const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '123', database: 'QLKV' });
async function run() {
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_shift VARCHAR(50);`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS dropoff_spoke_id INT REFERENCES spokes(id_spoke);`);
  console.log('Migrated');
  process.exit(0);
}
run();
