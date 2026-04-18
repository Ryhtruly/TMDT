const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '123', database: 'QLKV' });

// Giá chuẩn theo thị trường GHN/GHTK thực tế 2024
// base_weight_g = 1000g (1kg đầu tiên miễn thêm)
// extra_per_500g = phí cộng thêm mỗi 500g tiếp theo
const rules = [
  // LIGHT (< 20kg)
  { id: 17, price: 15500, bw: 1000, extra: 1500 },  // Nội tỉnh, Nội thành:    15,500đ/1kg, +1,500đ/500g tiếp
  { id: 18, price: 22000, bw: 1000, extra: 2000 },  // Nội tỉnh, Ngoại thành: 22,000đ/1kg, +2,000đ/500g tiếp
  { id: 19, price: 30000, bw: 1000, extra: 2000 },  // Liên Vùng, Nội thành:  30,000đ/1kg, +2,000đ/500g tiếp
  { id: 20, price: 40000, bw: 1000, extra: 2500 },  // Liên Vùng, Ngoại thành: 40,000đ/1kg, +2,500đ/500g tiếp
  { id: 21, price: 38000, bw: 1000, extra: 2500 },  // Xuyên Miền, Nội thành: 38,000đ/1kg, +2,500đ/500g tiếp
  { id: 22, price: 48000, bw: 1000, extra: 3000 },  // Xuyên Miền, Ngoại thành: 48,000đ/1kg, +3,000đ/500g tiếp

  // HEAVY (>= 20kg) – tính extra per 1kg
  { id: 23, price:  90000, bw: 20000, extra: 2500 },  // Nội tỉnh, Nội thành
  { id: 24, price: 120000, bw: 20000, extra: 3000 },  // Nội tỉnh, Ngoại thành
  { id: 25, price: 180000, bw: 20000, extra: 4000 },  // Liên Vùng, Nội thành
  { id: 26, price: 230000, bw: 20000, extra: 4500 },  // Liên Vùng, Ngoại thành
  { id: 27, price: 260000, bw: 20000, extra: 5500 },  // Xuyên Miền, Nội thành
  { id: 28, price: 320000, bw: 20000, extra: 6500 },  // Xuyên Miền, Ngoại thành
];

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rules) {
      await client.query(
        'UPDATE pricing_rules SET price = $1, base_weight_g = $2, extra_per_500g = $3 WHERE id_rule = $4',
        [r.price, r.bw, r.extra, r.id]
      );
    }
    await client.query('COMMIT');

    // Giả lập tính giá sau khi fix
    console.log('=== Xuyên Miền, Nội thành ===');
    const { price, bw, extra } = { price: 38000, bw: 1000, extra: 2500 };
    for (const w of [500, 1000, 2000, 5000, 10000]) {
      const steps = w <= bw ? 0 : Math.ceil((w - bw) / 500);
      const fee = price + steps * extra;
      console.log(`  ${w}g (${w/1000}kg): ${fee.toLocaleString('vi-VN')}đ`);
    }
    console.log('\n✅ Done cập nhật bảng giá!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌', e.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

fix();
