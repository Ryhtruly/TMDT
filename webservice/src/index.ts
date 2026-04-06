import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import orderRoutes from './routes/order.routes';
import shopRoutes from './routes/shop.routes';
import shipperRoutes from './routes/shipper.routes';
import stockkeeperRoutes from './routes/stockkeeper.routes';
import generalRoutes from './routes/general.routes';

// Load biến môi trường
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Đăng ký API Route Lõi
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/shipper', shipperRoutes);
app.use('/api/stockkeeper', stockkeeperRoutes);
app.use('/api', generalRoutes);

// Base Route
app.get('/', (req: Request, res: Response) => {
  res.send('🚀 Kênh Server Web Service Logistics (QLKV) đang chạy thành công!');
});

// API Kiểm tra kết nối Database
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as curent_time, version()');
    res.json({
      status: 'success',
      message: 'Đã kết nối thành công tới Database QLKV!',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Lỗi API test connection', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Không thể kết nối DB', 
      error: String(error) 
    });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`[Server]: Đang lắng nghe tại cổng http://localhost:${port}`);
  console.log(`[Test API]: Hãy truy cập http://localhost:${port}/api/test-db để kiểm tra DB`);
});
