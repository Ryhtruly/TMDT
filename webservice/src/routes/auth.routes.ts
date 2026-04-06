import { Router, Request, Response } from 'express';
import { login } from '../controllers/auth.controller';
import { verifyToken, checkRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint Đăng Nhập mở Public
router.post('/login', login);

// Endpoint Private dùng để Verify Token của Frontend (khi F5 trang web)
router.get('/me', verifyToken, (req: AuthRequest, res: Response) => {
  res.json({ 
    status: 'success', 
    message: 'Token còn hiệu lực!', 
    user: req.user 
  });
});

// Endpoint Test Phân Quyền (Ví dụ chỉ ADMIN và SHIPPER mới được truy cập)
router.get('/test-role-admin', verifyToken, checkRoles(['ADMIN', 'SHIPPER']), (req: AuthRequest, res: Response) => {
  res.json({ 
    status: 'success', 
    message: 'Tuyệt vời! Bạn đã pass được lớp màn lọc phân quyền Admin/Shipper.',
    user: req.user
  });
});

export default router;
