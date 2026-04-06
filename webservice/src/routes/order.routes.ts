import { Router } from 'express';
import { trackOrder } from '../controllers/order.controller';

const router = Router();

// Tra cứu hành trình vận đơn - PUBLIC (Docx: Người nhận không cần đăng nhập mà vẫn tra được)
router.get('/track/:tracking_code', trackOrder);

export default router;
