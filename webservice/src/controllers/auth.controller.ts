import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp điện thoại và mật khẩu.' });
      return;
    }

    // Pass vào Service
    const authData = await authService.authenticateUser(phone, password);

    // Trả ra Client
    res.json({
      status: 'success',
      message: 'Đăng nhập thành công!',
      accessToken: authData.token,
      user_info: authData.user_info
    });

  } catch (error: any) {
    if (error.message === 'Tài khoản không tồn tại hoặc đã bị khóa.' || error.message === 'Mật khẩu không chính xác.') {
      res.status(401).json({ status: 'error', message: error.message });
      return;
    }
    console.error('Core Lỗi khi Login:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi Backend nội bộ Router', error: String(error) });
  }
};
