import bcrypt from 'bcryptjs';
import { AuthRepository } from '../repositories/auth.repository';
import { generateToken } from '../utils/jwt';
import { assertValidVietnamPhone } from '../utils/phone';

const authRepository = new AuthRepository();

export class AuthService {
  async authenticateUser(phone: string, passwordRaw: string) {
    const normalizedPhone = assertValidVietnamPhone(phone);
    const user = await authRepository.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new Error('Tài khoản không tồn tại hoặc đã bị khóa.');
    }

    const isPasswordValid =
      !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')
        ? passwordRaw === user.password
        : await bcrypt.compare(passwordRaw, user.password);

    if (!isPasswordValid) {
      throw new Error('Mật khẩu không chính xác.');
    }

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

    const payload = {
      id_user: user.id_user,
      phone: user.phone,
      roles,
      id_shop,
      id_employee,
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
        id_employee,
      },
    };
  }
}
