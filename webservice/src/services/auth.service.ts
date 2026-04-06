import bcrypt from 'bcryptjs';
import { AuthRepository } from '../repositories/auth.repository';
import { generateToken } from '../utils/jwt';

const authRepository = new AuthRepository();

export class AuthService {
  async authenticateUser(phone: string, passwordRaw: string) {
    // 1. Phân quyền Database (Repo) tìm user
    const user = await authRepository.findUserByPhone(phone);
    if (!user) {
      throw new Error('Tài khoản không tồn tại hoặc đã bị khóa.');
    }

    // 2. Logic So sánh Mật khẩu đa hình
    let isPasswordValid = false;
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      isPasswordValid = (passwordRaw === user.password); // Mock logic
    } else {
      isPasswordValid = await bcrypt.compare(passwordRaw, user.password); // Bcrypt chuẩn
    }

    if (!isPasswordValid) {
      throw new Error('Mật khẩu không chính xác.');
    }

    // 3. Nghiệp vụ Gộp Profile Data
    const roles = await authRepository.findUserRoles(user.id_user);
    
    let id_shop = null;
    let id_employee = null;
    let display_name = 'Người Dùng Hệ Thống';

    if (roles.includes('SHOP')) {
      const shopInfo = await authRepository.findShopInfoByUserId(user.id_user);
      if (shopInfo) {
        id_shop = shopInfo.id_shop;
        display_name = shopInfo.shop_name;
      }
    }
    
    if (roles.includes('SHIPPER') || roles.includes('STOCKKEEPER') || roles.includes('ADMIN')) {
      const empInfo = await authRepository.findEmployeeInfoByUserId(user.id_user);
      if (empInfo) {
        id_employee = empInfo.id_employee;
        if (display_name === 'Người Dùng Hệ Thống') display_name = empInfo.full_name;
      }
    }

    // 4. Sinh Token
    const payload = {
      id_user: user.id_user,
      phone: user.phone,
      roles: roles,
      id_shop,
      id_employee
    };
    const token = generateToken(payload);

    return {
      token,
      user_info: {
        id_user: user.id_user,
        phone: user.phone,
        roles,
        display_name,
        id_shop,
        id_employee
      }
    };
  }
}
