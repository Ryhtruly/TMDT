import { Request, Response, NextFunction } from 'express';
import { verifyTokenContent } from '../utils/jwt';

// Định nghĩa lại Type của Request để gán thêm thuộc tính 'user'
export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Không có quyền truy cập, thiếu phân quyền Token Bearer!' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyTokenContent(token);

  if (!decoded) {
    res.status(403).json({ status: 'error', message: 'Token bị giả mạo hoặc đã hết hạn truy cập.' });
    return;
  }

  req.user = decoded; // Object lưu toàn bộ ID, Mật khẩu, ID Shop để các Controler phía sau dùng!
  next();
};

export const checkRoles = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.roles) {
      res.status(403).json({ status: 'error', message: 'Bạn không có vai trò nào trong hệ thống quản trị này!' });
      return;
    }

    // Kiểm tra xem User có ít nhất 1 Role khớp với allowedRoles không (giao tập hợp)
    const hasRole = req.user.roles.some((role: string) => allowedRoles.includes(role));
    
    if (!hasRole) {
      res.status(403).json({ status: 'error', message: `Truy cập thất bại. Bạn cần ít nhất 1 trong các quyền sau: ${allowedRoles.join(', ')}` });
      return;
    }

    next();
  };
};
