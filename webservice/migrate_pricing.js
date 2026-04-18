const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '123', database: 'QLKV' });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reset pricing_rules
    await client.query('DELETE FROM pricing_rules');
    await client.query('ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS goods_type VARCHAR(10) DEFAULT \'LIGHT\'');
    await client.query('ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS base_weight_g DECIMAL(10,2) DEFAULT 500');
    await client.query('ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS extra_per_500g DECIMAL(10,2) DEFAULT 2000');

    // Hàng Nhẹ (LIGHT < 20kg) - base 500g, extra per 500g
    const light = [
      ['Nội tỉnh',   'NỘI THÀNH',   500,   15500, 2000],
      ['Nội tỉnh',   'NGOẠI THÀNH', 500,   22000, 2500],
      ['Liên Vùng',  'NỘI THÀNH',   500,   32000, 3000],
      ['Liên Vùng',  'NGOẠI THÀNH', 500,   42000, 3500],
      ['Xuyên Miền', 'NỘI THÀNH',   500,   50000, 5000],
      ['Xuyên Miền', 'NGOẠI THÀNH', 500,   60000, 5500],
    ];
    for (const [rt, at, bw, price, extra] of light) {
      await client.query(
        `INSERT INTO pricing_rules (route_type, area_type, goods_type, base_weight_g, price, extra_per_500g)
         VALUES ($1, $2, 'LIGHT', $3, $4, $5)`,
        [rt, at, bw, price, extra]
      );
    }

    // Hàng Nặng (HEAVY >= 20kg) - base 20000g, extra per 1000g (reuse extra_per_500g column)
    const heavy = [
      ['Nội tỉnh',   'NỘI THÀNH',   20000, 100000, 3000],
      ['Nội tỉnh',   'NGOẠI THÀNH', 20000, 130000, 3500],
      ['Liên Vùng',  'NỘI THÀNH',   20000, 200000, 5000],
      ['Liên Vùng',  'NGOẠI THÀNH', 20000, 250000, 5500],
      ['Xuyên Miền', 'NỘI THÀNH',   20000, 300000, 7000],
      ['Xuyên Miền', 'NGOẠI THÀNH', 20000, 360000, 8000],
    ];
    for (const [rt, at, bw, price, extra] of heavy) {
      await client.query(
        `INSERT INTO pricing_rules (route_type, area_type, goods_type, base_weight_g, price, extra_per_500g)
         VALUES ($1, $2, 'HEAVY', $3, $4, $5)`,
        [rt, at, bw, price, extra]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Pricing migration done! New rules:', 12);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
