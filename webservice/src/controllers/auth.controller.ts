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

    const authData = await authService.authenticateUser(phone, password);

    res.json({
      status: 'success',
      message: 'Đăng nhập thành công!',
      accessToken: authData.token,
      user_info: authData.user_info,
    });
  } catch (error: any) {
    const message = String(error.message || '');
    if (message.includes('Số điện thoại')) {
      res.status(400).json({ status: 'error', message });
      return;
    }
    if (message.includes('Tài khoản không tồn tại') || message.includes('Mật khẩu không chính xác')) {
      res.status(401).json({ status: 'error', message });
      return;
    }
    console.error('Core lỗi khi login:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi backend nội bộ router', error: String(error) });
  }
};
