const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '123', database: 'QLKV' });

// Mapping: id_spoke → danh sách quận/huyện quản lý
// Spoke 1: Bưu cục Quận 1 → HCM Nội thành (Quận 1-12, Bình Thạnh, Phú Nhuận, Gò Vấp, Tân Bình, Tân Phú, Bình Tân)
// Spoke 2: Bưu cục Thủ Đức → HCM Ngoại thành/vùng ven (Thủ Đức, Bình Chánh, Hóc Môn, Củ Chi, Cần Giờ, Nhà Bè)
// Spoke 3: Bưu cục Đống Đa → HN Nội thành (Đống Đa, Ba Đình, Hoàn Kiếm, Hai Bà Trưng, Thanh Xuân, Cầu Giấy, Tây Hồ, Hoàng Mai, Long Biên, Nam Từ Liêm, Bắc Từ Liêm, Hà Đông)
// Spoke 4: Bưu cục Cầu Giấy → HN Ngoại thành (Sóc Sơn, Đông Anh, Gia Lâm, Thanh Trì, Mê Linh + các huyện ngoại ô)
// Spoke 5: Bưu cục Hải Châu → ĐN Nội thành (Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu)
// Spoke 6: Bưu cục Sơn Trà → ĐN Ngoại thành (Cẩm Lệ, Hòa Vang, Hoàng Sa)

const newAreas = [
  // ===== TP. HỒ CHÍ MINH - Spoke 1 (Nội thành) =====
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 2',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 3',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 4',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 5',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 6',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 7',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 8',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 9',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 10',      area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 11',      area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Quận 12',      area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Bình Thạnh',   area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Phú Nhuận',    area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Gò Vấp',       area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Tân Bình',     area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Tân Phú',      area_type: 'NỘI THÀNH' },
  { id_spoke: 1, province: 'Hồ Chí Minh', district: 'Bình Tân',     area_type: 'NỘI THÀNH' },

  // ===== TP. HỒ CHÍ MINH - Spoke 2 (Vùng ven/Ngoại thành) =====
  { id_spoke: 2, province: 'Hồ Chí Minh', district: 'Bình Chánh',   area_type: 'NGOẠI THÀNH' },
  { id_spoke: 2, province: 'Hồ Chí Minh', district: 'Hóc Môn',      area_type: 'NGOẠI THÀNH' },
  { id_spoke: 2, province: 'Hồ Chí Minh', district: 'Củ Chi',       area_type: 'NGOẠI THÀNH' },
  { id_spoke: 2, province: 'Hồ Chí Minh', district: 'Cần Giờ',      area_type: 'NGOẠI THÀNH' },
  { id_spoke: 2, province: 'Hồ Chí Minh', district: 'Nhà Bè',       area_type: 'NGOẠI THÀNH' },

  // ===== HÀ NỘI - Spoke 3 (Nội thành) =====
  { id_spoke: 3, province: 'Hà Nội', district: 'Ba Đình',           area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Hoàn Kiếm',         area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Hai Bà Trưng',      area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Hoàng Mai',         area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Thanh Xuân',        area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Tây Hồ',            area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Long Biên',         area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Nam Từ Liêm',       area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Bắc Từ Liêm',       area_type: 'NỘI THÀNH' },
  { id_spoke: 3, province: 'Hà Nội', district: 'Hà Đông',           area_type: 'NỘI THÀNH' },

  // ===== HÀ NỘI - Spoke 4 (Ngoại thành/Vùng ven) =====
  { id_spoke: 4, province: 'Hà Nội', district: 'Sóc Sơn',           area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Đông Anh',          area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Gia Lâm',           area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Thanh Trì',         area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Mê Linh',           area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Thạch Thất',        area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Quốc Oai',          area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Hoài Đức',          area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Đan Phượng',        area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Phúc Thọ',          area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Ba Vì',             area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Chương Mỹ',         area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Thanh Oai',         area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Thường Tín',        area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Phú Xuyên',         area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Ứng Hòa',           area_type: 'NGOẠI THÀNH' },
  { id_spoke: 4, province: 'Hà Nội', district: 'Mỹ Đức',            area_type: 'NGOẠI THÀNH' },

  // ===== ĐÀ NẴNG - Spoke 5 (Nội thành) =====
  { id_spoke: 5, province: 'Đà Nẵng', district: 'Thanh Khê',        area_type: 'NỘI THÀNH' },
  { id_spoke: 5, province: 'Đà Nẵng', district: 'Ngũ Hành Sơn',     area_type: 'NỘI THÀNH' },
  { id_spoke: 5, province: 'Đà Nẵng', district: 'Liên Chiểu',       area_type: 'NỘI THÀNH' },

  // ===== ĐÀ NẴNG - Spoke 6 (Ngoại thành) =====
  { id_spoke: 6, province: 'Đà Nẵng', district: 'Cẩm Lệ',           area_type: 'NGOẠI THÀNH' },
  { id_spoke: 6, province: 'Đà Nẵng', district: 'Hòa Vang',         area_type: 'NGOẠI THÀNH' },
  { id_spoke: 6, province: 'Đà Nẵng', district: 'Hoàng Sa',         area_type: 'NGOẠI THÀNH' },
];

async function seed() {
  const client = await pool.connect();
  try {
    // Kiểm tra những area đã tồn tại để tránh trùng lặp
    const existing = await client.query('SELECT province, district FROM areas');
    const existingSet = new Set(existing.rows.map(r => `${r.province}|${r.district}`));

    const toInsert = newAreas.filter(a => !existingSet.has(`${a.province}|${a.district}`));

    if (toInsert.length === 0) {
      console.log('✅ Tất cả areas đã tồn tại trong DB, không cần thêm.');
      return;
    }

    let inserted = 0;
    for (const area of toInsert) {
      await client.query(
        'INSERT INTO areas (id_spoke, province, district, area_type) VALUES ($1, $2, $3, $4)',
        [area.id_spoke, area.province, area.district, area.area_type]
      );
      inserted++;
    }

    const total = await client.query('SELECT COUNT(*) as cnt FROM areas');
    console.log(`✅ Đã thêm ${inserted} quận/huyện mới vào DB.`);
    console.log(`📊 Tổng số areas trong DB: ${total.rows[0].cnt}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('❌ Lỗi:', err.message); process.exit(1); });
