import bcrypt from 'bcryptjs';
import { AdminRepository } from '../repositories/admin.repository';

const adminRepo = new AdminRepository();

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
        [phone, hashedPassword]
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
      
      // Bước 1: Khai báo vào bảng Locations (Tọa độ)
      const locRes = await client.query(
        'INSERT INTO locations (location_type, location_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING id_location',
        ['HUB', hubData.location_name, hubData.address, hubData.latitude, hubData.longitude]
      );
      const id_location = locRes.rows[0].id_location;

      // Bước 2: Tạo Hub neo theo thẻ Location
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
  async createSpoke(spokeData: { id_hub: number, spoke_name: string, location_name: string, address: string, latitude: number, longitude: number }) {
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
        [spokeData.id_hub, id_location, spokeData.spoke_name]
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
  async setAreaCoverage(areaData: { id_spoke: number, province: string, district: string, area_type: string }) {
    const client = await adminRepo.getTxClient();
    try {
      // Dùng cú pháp UPSERT hoặc Insert bình thường bắt lỗi duplicate Unique
      const result = await client.query(
        'INSERT INTO areas (id_spoke, province, district, area_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [areaData.id_spoke, areaData.province, areaData.district, areaData.area_type]
      );
      return result.rows[0];
    } catch (error: any) {
      if(error.code === '23505') throw new Error('Quận/Huyện này đã bị Bưu cục khác quản lý (Lỗi Unique Constraint Zone)!');
      throw new Error('Không thể phân vùng khu vực này.');
    } finally {
      client.release();
    }
  }

  async updatePricingRule(id_rule: number, price: number, weight_step: number) {
    const client = await adminRepo.getTxClient();
    try {
      const result = await client.query(
        'UPDATE pricing_rules SET price = $1, weight_step = $2 WHERE id_rule = $3 RETURNING *',
        [price, weight_step, id_rule]
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

  // --- CẤU HÌNH % PHÍ BẢO HIỂM ĐỘNG (dạng pricing_rule đặc biệt) ---
  // Lưu vào pricing_rules với route_type = 'INSURANCE' để tách biệt
  async setInsuranceConfig(threshold: number, rate_percent: number) {
    const client = await adminRepo.getTxClient();
    try {
      // Dùng UPSERT: nếu đã có thì cập nhật, chưa có thì thêm mới
      const result = await client.query(`
        INSERT INTO pricing_rules (route_type, area_type, weight_step, price)
        VALUES ('INSURANCE', 'CONFIG', $1, $2)
        ON CONFLICT (route_type, area_type, weight_step)
        DO UPDATE SET price = EXCLUDED.price
        RETURNING *
      `, [threshold, rate_percent]);
      return {
        threshold: threshold,
        rate_percent: rate_percent,
        note: `Hàng trị giá trên ${threshold.toLocaleString()}đ sẽ phải chịu phí bảo hiểm ${rate_percent}%`
      };
    } catch(error: any) {
      // Nếu DB chưa có Unique Constraint trên 3 cột, dùng UPDATE thay thế
      await client.query(
        'UPDATE pricing_rules SET price = $1 WHERE route_type = $2 AND area_type = $3',
        [rate_percent, 'INSURANCE', 'CONFIG']
      );
      return { threshold, rate_percent, note: 'Cập nhật cấu hình phí bảo hiểm thành công.' };
    } finally {
      client.release();
    }
  }
}

