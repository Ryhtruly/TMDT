import bcrypt from 'bcryptjs';
import { AdminRepository } from '../repositories/admin.repository';
import { assertValidVietnamPhone } from '../utils/phone';

const adminRepo = new AdminRepository();

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export class AdminService {
  async getDashboard() {
    return await adminRepo.getDashboardCounts();
  }

  async getInfrastructure() {
    const hubs = await adminRepo.getHubs();
    const spokes = await adminRepo.getSpokes();
    const areas = await adminRepo.getAreas();
    return { hubs, spokes, areas };
  }

  async createEmployee(employeeData: any) {
    const { phone, password, email, citizen_id, full_name, gender, dob, home_address, id_role, id_hub, id_spoke } = employeeData;

    if (!phone || !password || !full_name || !email || !citizen_id || !id_role) {
      throw new Error('Thiếu tham số bắt buộc.');
    }

    const normalizedPhone = assertValidVietnamPhone(phone, 'SĐT nhân sự');

    if (!id_hub && !id_spoke) {
      throw new Error('Bắt buộc gán Nhân sự về 1 Hub/Spoke.');
    }

    const client = await adminRepo.getTxClient();
    try {
      await client.query('BEGIN');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const userRes = await client.query(
        'INSERT INTO users (phone, password, is_active) VALUES ($1, $2, TRUE) RETURNING id_user',
        [normalizedPhone, hashedPassword]
      );
      const id_user = userRes.rows[0].id_user;

      await client.query('INSERT INTO user_roles (id_user, id_role) VALUES ($1, $2)', [id_user, id_role]);

      const empRes = await client.query(
        'INSERT INTO employees (id_user, full_name, gender, dob, email, citizen_id, home_address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_employee',
        [id_user, full_name, gender, dob, email, citizen_id, home_address]
      );
      const id_employee = empRes.rows[0].id_employee;

      await client.query(
        'INSERT INTO employee_assignments (id_employee, id_hub, id_spoke) VALUES ($1, $2, $3)',
        [id_employee, id_hub || null, id_spoke || null]
      );

      await client.query('COMMIT');
      return { id_user, id_employee, full_name, role_id: id_role };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Tạo thất bại. Xem lại trùng Căn Cước/SĐT/Email.');
    } finally {
      client.release();
    }
  }

  // --- MỞ RỘNG MẠNG LƯỚI ---
  async createHub(hubData: { location_name: string, address: string, latitude: number, longitude: number, description: string }) {
    const client = await adminRepo.getTxClient();
    try {
      await client.query('BEGIN');

      const locRes = await client.query(
        'INSERT INTO locations (location_type, location_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING id_location',
        ['HUB', hubData.location_name, hubData.address, hubData.latitude, hubData.longitude]
      );
      const id_location = locRes.rows[0].id_location;

      const hubRes = await client.query(
        'INSERT INTO hubs (id_location, hub_name, description) VALUES ($1, $2, $3) RETURNING id_hub',
        [id_location, hubData.location_name, hubData.description]
      );

      await client.query('COMMIT');
      return { id_hub: hubRes.rows[0].id_hub, name: hubData.location_name };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Không thể khởi tạo Căn cứ Hub mới.');
    } finally {
      client.release();
    }
  }

  // --- MỞ RỘNG BƯU CỤC CON (SPOKE) ---
  async createSpoke(spokeData: { id_hub?: number, spoke_name: string, location_name: string, address: string, latitude: number, longitude: number }) {
    const client = await adminRepo.getTxClient();
    try {
      await client.query('BEGIN');

      const locRes = await client.query(
        'INSERT INTO locations (location_type, location_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING id_location',
        ['SPOKE', spokeData.location_name, spokeData.address, spokeData.latitude, spokeData.longitude]
      );
      const id_location = locRes.rows[0].id_location;

      const spokeRes = await client.query(
        'INSERT INTO spokes (id_hub, id_location, spoke_name) VALUES ($1, $2, $3) RETURNING id_spoke',
        [spokeData.id_hub || null, id_location, spokeData.spoke_name]
      );

      await client.query('COMMIT');
      return { id_spoke: spokeRes.rows[0].id_spoke, name: spokeData.spoke_name };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Không thể khởi tạo Bưu cục Spoke này.');
    } finally {
      client.release();
    }
  }

  // --- QUY HOẠCH VÙNG LÃNH THỔ CỦA BƯU CỤC ---
  async setAreaCoverage(areaData: { id_spoke?: number, province: string, district: string, area_type: string }) {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query(
        'INSERT INTO areas (id_spoke, province, district, area_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [areaData.id_spoke || null, areaData.province, areaData.district, areaData.area_type]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') throw new Error('Quận/Huyện này đã bị Bưu cục khác quản lý (Lỗi Unique Constraint Zone)!');
      throw new Error('Không thể phân vùng khu vực này.');
    } finally {
      client.release();
    }
  }

  async assignSpokeToHub(id_hub: number, id_spoke: number) {
    const client = await adminRepo.getTxClient();
    try {
      const hubRes = await client.query(`
        SELECT l.latitude, l.longitude, h.hub_name
        FROM hubs h JOIN locations l ON h.id_location = l.id_location
        WHERE h.id_hub = $1
      `, [id_hub]);
      if (!hubRes.rows[0]) throw new Error('Khong tim thay Hub');

      const spokeRes = await client.query(`
        SELECT s.id_hub, l.latitude, l.longitude, s.spoke_name
        FROM spokes s JOIN locations l ON s.id_location = l.id_location
        WHERE s.id_spoke = $1
      `, [id_spoke]);
      if (!spokeRes.rows[0]) throw new Error('Khong tim thay Spoke');

      if (spokeRes.rows[0].id_hub) throw new Error('Spoke này đã có Hub chủ quản. Phải gỡ khỏi Hub cũ trước.');

      const dist = getDistance(hubRes.rows[0].latitude, hubRes.rows[0].longitude, spokeRes.rows[0].latitude, spokeRes.rows[0].longitude);
      if (dist > 150) throw new Error(`Khoảng cách quá xa (${Math.round(dist)}km > 150km). Spoke "${spokeRes.rows[0].spoke_name}" không thể vào Hub "${hubRes.rows[0].hub_name}"!`);

      await client.query('UPDATE spokes SET id_hub = $1 WHERE id_spoke = $2', [id_hub, id_spoke]);
      return true;
    } finally {
      client.release();
    }
  }

  async unassignSpokeFromHub(id_hub: number, id_spoke: number) {
    const client = await adminRepo.getTxClient();
    try {
      await client.query('UPDATE spokes SET id_hub = NULL WHERE id_spoke = $1 AND id_hub = $2', [id_spoke, id_hub]);
      return true;
    } finally {
      client.release();
    }
  }

  async assignAreaToSpoke(id_spoke: number, id_area: number) {
    const client = await adminRepo.getTxClient();
    try {
      // Check area exists and is orphan
      const areaRes = await client.query('SELECT id_spoke, province, district FROM areas WHERE id_area = $1', [id_area]);
      if (!areaRes.rows[0]) throw new Error('Khong tim thay Khu vuc (Area)');
      if (areaRes.rows[0].id_spoke) throw new Error('Khu vuc nay da co Spoke quan ly. Phai go khoi Spoke cu truoc.');

      const newProvince = String(areaRes.rows[0].province || '').trim();
      const newDistrict = String(areaRes.rows[0].district || '').trim();

      // Check province compatibility: new area must not be from a completely different region
      const existingAreas = await client.query(
        'SELECT DISTINCT province FROM areas WHERE id_spoke = $1',
        [id_spoke]
      );
      if (existingAreas.rows.length > 0) {
        const existingProvinces: string[] = existingAreas.rows.map((r: any) => String(r.province || '').trim());
        // Define regional groups (simplified)
        const hcmRegion = ['Ho Chi Minh', 'TP.HCM', 'Ho Chi Minh City', 'Binh Duong', 'Dong Nai', 'Long An', 'Ba Ria', 'Tay Ninh', 'Binh Phuoc'];
        const hnRegion = ['Ha Noi', 'Hanoi', 'Bac Ninh', 'Hung Yen', 'Ha Nam', 'Vinh Phuc', 'Ha Dong', 'Bac Giang', 'Thai Nguyen', 'Hai Phong', 'Nam Dinh', 'Ninh Binh'];
        const dnRegion = ['Da Nang', 'Quang Nam', 'Thua Thien', 'Quang Ngai'];

        const getRegion = (province: string) => {
          const p = province.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (hcmRegion.some(r => p.includes(r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) return 'HCM';
          if (hnRegion.some(r => p.includes(r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) return 'HN';
          if (dnRegion.some(r => p.includes(r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) return 'DN';
          return p.substring(0, 6); // fallback: first 6 chars as region key
        };

        const newRegion = getRegion(newProvince);
        const hasConflict = existingProvinces.some(ep => {
          const existingRegion = getRegion(ep);
          // Only block if clearly different named regions
          return newRegion !== existingRegion &&
            newRegion !== ep.substring(0, 6) &&
            !['HCM', 'HN', 'DN'].includes(newRegion) === false;
        });

        // Strict check: if new province is HCM-region and existing is HN-region (or vice versa), block
        const newR = getRegion(newProvince);
        const conflictingRegion = existingProvinces.some(ep => {
          const er = getRegion(ep);
          return (newR === 'HCM' && er === 'HN') || (newR === 'HN' && er === 'HCM') ||
                 (newR === 'HCM' && er === 'DN') || (newR === 'DN' && er === 'HCM') ||
                 (newR === 'HN' && er === 'DN') || (newR === 'DN' && er === 'HN');
        });

        if (conflictingRegion) {
          throw new Error(
            `Xung dot vung dia ly! Khu vuc "${newDistrict} (${newProvince})" thuoc vung khac voi cac khu vuc hien tai cua Buu cuc nay.`
          );
        }
      }

      await client.query('UPDATE areas SET id_spoke = $1 WHERE id_area = $2', [id_spoke, id_area]);
      return true;
    } finally {
      client.release();
    }
  }

  async unassignAreaFromSpoke(id_spoke: number, id_area: number) {
    const client = await adminRepo.getTxClient();
    try {
      await client.query('UPDATE areas SET id_spoke = NULL WHERE id_area = $1 AND id_spoke = $2', [id_area, id_spoke]);
      return true;
    } finally {
      client.release();
    }
  }

  async updatePricingRule(id_rule: number, price: number, base_weight_g: number, extra_per_500g: number) {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query(
        'UPDATE pricing_rules SET price = $1, base_weight_g = $2, extra_per_500g = $3 WHERE id_rule = $4 RETURNING *',
        [price, base_weight_g, extra_per_500g, id_rule]
      );
      if (!result.rows[0]) throw new Error(`Không tìm thấy Pricing Rule ID=${id_rule}`);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // --- SỬA TÊN HUB ---
  async updateHub(id_hub: number, hub_name: string, description: string) {
    const updated = await adminRepo.updateHub(id_hub, hub_name, description);
    if (!updated) throw new Error(`Không tìm thấy Hub ID=${id_hub}`);
    return updated;
  }

  // --- SỬA TÊN BƯU CỤC SPOKE ---
  async updateSpoke(id_spoke: number, spoke_name: string) {
    const updated = await adminRepo.updateSpoke(id_spoke, spoke_name);
    if (!updated) throw new Error(`Không tìm thấy Spoke ID=${id_spoke}`);
    return updated;
  }

  // --- XÓA HUB ---
  async deleteHub(id_hub: number) {
    try {
      const deleted = await adminRepo.deleteHub(id_hub);
      if (!deleted) throw new Error(`Không tìm thấy Hub ID=${id_hub}`);
      return true;
    } catch (error: any) {
      if (error.code === '23503') throw new Error('Không thể xóa Kho Trung Tâm này vì vẫn còn Bưu Cục (Spokes) hoặc Nhân Sự đang liên kết!');
      throw error;
    }
  }

  // --- XÓA BƯU CỤC SPOKE ---
  async deleteSpoke(id_spoke: number) {
    try {
      const deleted = await adminRepo.deleteSpoke(id_spoke);
      if (!deleted) throw new Error(`Không tìm thấy Spoke ID=${id_spoke}`);
      return true;
    } catch (error: any) {
      if (error.code === '23503') throw new Error('Không thể xóa Bưu Cục này vì vẫn còn Khu vực phân phối, Nhân sự hoặc Đơn hàng đang liên kết!');
      throw error;
    }
  }

  // --- CẤP THÊM ROLE CHO USER ---
  async grantRoleToUser(id_user: number, id_role: number) {
    const allRoles = await adminRepo.getAllRoles();
    const validRole = allRoles.find(r => r.id_role === id_role);
    if (!validRole) throw new Error(`Role ID=${id_role} không tồn tại trong hệ thống.`);

    await adminRepo.grantRole(id_user, id_role);
    const currentRoles = await adminRepo.findUserRoles(id_user);
    return { id_user, roles: currentRoles };
  }

  // --- THU HỒI ROLE CỦA USER ---
  async revokeRoleFromUser(id_user: number, id_role: number) {
    const deleted = await adminRepo.revokeRole(id_user, id_role);
    if (!deleted) throw new Error(`User không có Role ID=${id_role} này hoặc User không tồn tại.`);
    const currentRoles = await adminRepo.findUserRoles(id_user);
    return { id_user, roles: currentRoles };
  }

  // --- LẤY DANH SÁCH TẤT CẢ ROLES ---
  async getAllRoles() {
    return await adminRepo.getAllRoles();
  }

  async getEmployees() {
    return await adminRepo.getEmployees();
  }

  async updateEmployee(id_user: number, employeeData: any) {
    if (!Number.isFinite(id_user) || id_user <= 0) {
      throw new Error('User ID khong hop le.');
    }

    const { phone, email, citizen_id, full_name, gender, dob, home_address } = employeeData;

    if (!phone || !full_name || !email || !citizen_id) {
      throw new Error('Thieu thong tin bat buoc: phone, full_name, email, citizen_id.');
    }

    const normalizedPhone = assertValidVietnamPhone(phone, 'SDT nhan su');
    const client = await adminRepo.getTxClient();

    try {
      await client.query('BEGIN');

      const existingEmployee = await client.query(
        'SELECT id_employee FROM employees WHERE id_user = $1',
        [id_user]
      );
      if (!existingEmployee.rows[0]) {
        throw new Error(`Khong tim thay nhan vien User ID=${id_user}`);
      }

      const duplicatePhone = await client.query(
        'SELECT id_user FROM users WHERE phone = $1 AND id_user <> $2 LIMIT 1',
        [normalizedPhone, id_user]
      );
      if (duplicatePhone.rows[0]) {
        throw new Error('SDT nay da duoc su dung boi user khac.');
      }

      const userRes = await client.query(
        'UPDATE users SET phone = $1 WHERE id_user = $2 RETURNING id_user, phone, is_active',
        [normalizedPhone, id_user]
      );
      if (!userRes.rows[0]) {
        throw new Error(`Khong tim thay User ID=${id_user}`);
      }

      const employeeRes = await client.query(
        `UPDATE employees
         SET full_name = $1,
             gender = $2,
             dob = $3,
             email = $4,
             citizen_id = $5,
             home_address = $6
         WHERE id_user = $7
         RETURNING id_employee, id_user, full_name, gender, dob, email, citizen_id, home_address`,
        [full_name, gender || null, dob || null, email, citizen_id, home_address || null, id_user]
      );

      await client.query('COMMIT');
      return { ...employeeRes.rows[0], phone: userRes.rows[0].phone, is_active: userRes.rows[0].is_active };
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        throw new Error('Cap nhat that bai. SDT/Email/CCCD co the da bi trung.');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async deactivateEmployee(id_user: number) {
    const result = await adminRepo.deactivateEmployee(id_user);
    if (!result) throw new Error(`Không tìm thấy User ID=${id_user}`);
    return result;
  }

  async getAllShops() {
    return await adminRepo.getAllShops();
  }

  async getAllOrders(status?: string, limit?: number, offset?: number) {
    return await adminRepo.getAllOrders(status, limit, offset);
  }

  async getAllBags() {
    return await adminRepo.getAllBags();
  }

  async getPricingRules() {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query('SELECT * FROM pricing_rules ORDER BY id_rule ASC');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getServiceTypes() {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query('SELECT * FROM service_types ORDER BY id_service ASC');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateServiceType(id_service: number, base_multiplier: number, description: string) {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query(
        'UPDATE service_types SET base_multiplier = $1, description = $2 WHERE id_service = $3 RETURNING *',
        [base_multiplier, description, id_service]
      );
      if (result.rowCount === 0) throw new Error('Service type không tồn tại');
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getShipperWardAssignments() {
    return await adminRepo.getShipperWardAssignments();
  }

  async createShipperWardAssignment(data: any) {
    const { id_shipper, id_spoke, province, district, ward, priority } = data;
    if (!id_shipper || !id_spoke || !province || !district) {
      throw new Error('Thieu thong tin bat buoc: id_shipper, id_spoke, province, district.');
    }

    return await adminRepo.createShipperWardAssignment({
      id_shipper: parseInt(id_shipper),
      id_spoke: parseInt(id_spoke),
      province: String(province).trim(),
      district: String(district).trim(),
      ward: ward ? String(ward).trim() : null,
      priority: priority ? parseInt(priority) : 100,
    });
  }

  async deleteShipperWardAssignment(id_assignment: number) {
    const deleted = await adminRepo.deleteShipperWardAssignment(id_assignment);
    if (!deleted) throw new Error(`Khong tim thay assignment ID=${id_assignment}`);
    return true;
  }

  // --- CẤU HÌNH % PHÍ BẢO HIỂM ĐỘNG ---
  async setInsuranceConfig(threshold: number, rate_percent: number) {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query(`
        INSERT INTO pricing_rules (route_type, area_type, weight_step, price)
        VALUES ('INSURANCE', 'CONFIG', $1, $2)
        ON CONFLICT (route_type, area_type, weight_step)
        DO UPDATE SET price = EXCLUDED.price
        RETURNING *
      `, [threshold, rate_percent]);
      return {
        threshold,
        rate_percent,
        note: `Hàng trị giá trên ${threshold.toLocaleString()}đ sẽ phải chịu phí bảo hiểm ${rate_percent}%`
      };
    } catch (error: any) {
      await client.query(
        'UPDATE pricing_rules SET price = $1 WHERE route_type = $2 AND area_type = $3',
        [rate_percent, 'INSURANCE', 'CONFIG']
      );
      return { threshold, rate_percent, note: 'Cập nhật cấu hình phí bảo hiểm thành công.' };
    } finally {
      client.release();
    }
  }

  // --- BẬT/TẮT TUYẾN ĐƯỜNG ---
  async toggleRoute(id_route: number) {
    const { pool } = require('../config/db');
    const result = await pool.query(
      `UPDATE routes SET is_active = NOT is_active WHERE id_route = $1 RETURNING id_route, is_active`,
      [id_route]
    );
    if (!result.rows[0]) throw new Error('Không tìm thấy tuyến đường.');
    const newStatus = result.rows[0].is_active;
    return {
      id_route,
      is_active: newStatus,
      message: newStatus ? 'Đã kích hoạt tuyến đường.' : 'Đã vô hiệu hóa tuyến đường.'
    };
  }

  // --- HOÀN HÀNG ---
  async completeReturn(id_order: number) {
    const client = await adminRepo.getTxClient();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query('SELECT status FROM orders WHERE id_order = $1 FOR UPDATE', [id_order]);
      if (!orderRes.rows[0]) throw new Error('Không tìm thấy đơn hàng.');

      const { status } = orderRes.rows[0];
      const { ORDER_STATUS } = require('../utils/orderStatus');

      if (status !== ORDER_STATUS.RETURNED && status !== ORDER_STATUS.RETURNING) {
        throw new Error(`Chỉ có thể xác nhận trả shop khi đơn ở trạng thái Hoàn hàng. Hiện tại: ${status}`);
      }

      await client.query('UPDATE orders SET status = $1 WHERE id_order = $2', [ORDER_STATUS.RETURN_COMPLETED, id_order]);

      // Ghi log
      await client.query(`
        INSERT INTO order_logs (id_order, action)
        VALUES ($1, 'XÁC NHẬN ĐÃ TRẢ SHOP')
      `, [id_order]);

      await client.query('COMMIT');
      return { id_order, status: ORDER_STATUS.RETURN_COMPLETED, message: 'Xác nhận đã trả shop thành công.' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

}
