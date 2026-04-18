const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '123', database: 'QLKV' });

// Thêm Bưu Cục mới + Locations tương ứng + Areas gắn vào
// HCM Hub = id_hub 1, HN Hub = id_hub 2, DN Hub = id_hub 3

const newSpokes = [
  // ===== TP. HCM =====
  {
    hub: 1, spoke_name: 'Bưu cục Bình Chánh',
    location: { name: 'Bưu cục Bình Chánh', address: '260 Nguyễn Văn Linh, Bình Chánh, TP. HCM', lat: 10.7242, lng: 106.6219 },
    areas: [
      { province: 'Hồ Chí Minh', district: 'Bình Chánh', area_type: 'NGOẠI THÀNH' },
      { province: 'Hồ Chí Minh', district: 'Nhà Bè', area_type: 'NGOẠI THÀNH' },
    ]
  },
  {
    hub: 1, spoke_name: 'Bưu cục Hóc Môn',
    location: { name: 'Bưu cục Hóc Môn', address: '51 Lý Nam Đế, TT. Hóc Môn, TP. HCM', lat: 10.8887, lng: 106.5944 },
    areas: [
      { province: 'Hồ Chí Minh', district: 'Hóc Môn', area_type: 'NGOẠI THÀNH' },
      { province: 'Hồ Chí Minh', district: 'Củ Chi', area_type: 'NGOẠI THÀNH' },
    ]
  },
  {
    hub: 1, spoke_name: 'Bưu cục Bình Tân',
    location: { name: 'Bưu cục Bình Tân', address: '56 Lê Văn Quới, P. Bình Hưng Hòa, Bình Tân, TP. HCM', lat: 10.7758, lng: 106.6143 },
    areas: [
      { province: 'Hồ Chí Minh', district: 'Bình Tân', area_type: 'NỘI THÀNH' },
      { province: 'Hồ Chí Minh', district: 'Tân Phú', area_type: 'NỘI THÀNH' },
    ]
  },
  {
    hub: 1, spoke_name: 'Bưu cục Gò Vấp',
    location: { name: 'Bưu cục Gò Vấp', address: '138 Quang Trung, P. 10, Gò Vấp, TP. HCM', lat: 10.8350, lng: 106.6836 },
    areas: [
      { province: 'Hồ Chí Minh', district: 'Gò Vấp', area_type: 'NỘI THÀNH' },
      { province: 'Hồ Chí Minh', district: 'Bình Thạnh', area_type: 'NỘI THÀNH' },
      { province: 'Hồ Chí Minh', district: 'Phú Nhuận', area_type: 'NỘI THÀNH' },
    ]
  },
  // ===== HÀ NỘI =====
  {
    hub: 2, spoke_name: 'Bưu cục Hoàn Kiếm',
    location: { name: 'Bưu cục Hoàn Kiếm', address: '25 Đinh Tiên Hoàng, P. Lý Thái Tổ, Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8542 },
    areas: [
      { province: 'Hà Nội', district: 'Hoàn Kiếm', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Ba Đình', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Tây Hồ', area_type: 'NỘI THÀNH' },
    ]
  },
  {
    hub: 2, spoke_name: 'Bưu cục Hoàng Mai',
    location: { name: 'Bưu cục Hoàng Mai', address: '468 Trương Định, P. Tương Mai, Hoàng Mai, Hà Nội', lat: 20.9873, lng: 105.8612 },
    areas: [
      { province: 'Hà Nội', district: 'Hoàng Mai', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Hai Bà Trưng', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Thanh Trì', area_type: 'NGOẠI THÀNH' },
    ]
  },
  {
    hub: 2, spoke_name: 'Bưu cục Hà Đông',
    location: { name: 'Bưu cục Hà Đông', address: '48 Quang Trung, P. Hà Cầu, Hà Đông, Hà Nội', lat: 20.9692, lng: 105.7809 },
    areas: [
      { province: 'Hà Nội', district: 'Hà Đông', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Nam Từ Liêm', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Thanh Xuân', area_type: 'NỘI THÀNH' },
      { province: 'Hà Nội', district: 'Hoài Đức', area_type: 'NGOẠI THÀNH' },
    ]
  },
  // ===== ĐÀ NẴNG =====
  {
    hub: 3, spoke_name: 'Bưu cục Liên Chiểu',
    location: { name: 'Bưu cục Liên Chiểu', address: '8 Nguyễn Lương Bằng, P. Hòa Khánh Nam, Liên Chiểu, ĐN', lat: 16.0784, lng: 108.1501 },
    areas: [
      { province: 'Đà Nẵng', district: 'Liên Chiểu', area_type: 'NỘI THÀNH' },
      { province: 'Đà Nẵng', district: 'Thanh Khê', area_type: 'NỘI THÀNH' },
      { province: 'Đà Nẵng', district: 'Hòa Vang', area_type: 'NGOẠI THÀNH' },
    ]
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy danh sách spokes đã có để tránh trùng
    const existingSpokes = await client.query('SELECT spoke_name FROM spokes');
    const existingSpokeNames = new Set(existingSpokes.rows.map(r => r.spoke_name));

    // Lấy danh sách areas đã có để tránh trùng  
    const existingAreas = await client.query('SELECT province, district FROM areas');
    const existingAreaSet = new Set(existingAreas.rows.map(r => `${r.province}|${r.district}`));

    let addedSpokes = 0;
    let addedAreas = 0;

    for (const s of newSpokes) {
      if (existingSpokeNames.has(s.spoke_name)) {
        console.log(`⏭️  Bỏ qua spoke đã có: ${s.spoke_name}`);
        continue;
      }

      // 1. Thêm location
      const locRes = await client.query(
        `INSERT INTO locations (location_type, location_name, address, latitude, longitude)
         VALUES ('SPOKE', $1, $2, $3, $4) RETURNING id_location`,
        [s.location.name, s.location.address, s.location.lat, s.location.lng]
      );
      const id_location = locRes.rows[0].id_location;

      // 2. Thêm spoke
      const spokeRes = await client.query(
        `INSERT INTO spokes (id_hub, id_location, spoke_name) VALUES ($1, $2, $3) RETURNING id_spoke`,
        [s.hub, id_location, s.spoke_name]
      );
      const id_spoke = spokeRes.rows[0].id_spoke;
      addedSpokes++;

      // 3. Thêm areas gắn vào spoke mới (chỉ những district chưa có)
      for (const area of s.areas) {
        const key = `${area.province}|${area.district}`;
        if (!existingAreaSet.has(key)) {
          await client.query(
            `INSERT INTO areas (id_spoke, province, district, area_type) VALUES ($1, $2, $3, $4)`,
            [id_spoke, area.province, area.district, area.area_type]
          );
          existingAreaSet.add(key);
          addedAreas++;
        } else {
          // Cập nhật spoke cho area đã tồn tại về spoke mới phù hợp hơn
          await client.query(
            `UPDATE areas SET id_spoke = $1 WHERE province = $2 AND district = $3`,
            [id_spoke, area.province, area.district]
          );
          console.log(`🔄 Gắn lại ${area.district} → ${s.spoke_name}`);
        }
      }

      console.log(`✅ Thêm spoke: ${s.spoke_name} (SPK-${id_spoke})`);
    }

    await client.query('COMMIT');

    const totalSpokes = await client.query('SELECT COUNT(*) as cnt FROM spokes');
    const totalAreas = await client.query('SELECT COUNT(*) as cnt FROM areas');
    console.log(`\n📊 Tổng kết: ${totalSpokes.rows[0].cnt} spokes, ${totalAreas.rows[0].cnt} areas trong DB`);
    console.log(`➕ Đã thêm mới: ${addedSpokes} spokes, ${addedAreas} areas`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('❌ Lỗi:', err.message); process.exit(1); });
