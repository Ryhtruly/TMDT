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
import { ensureSchema } from './db/ensureSchema';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/shipper', shipperRoutes);
app.use('/api/stockkeeper', stockkeeperRoutes);
app.use('/api', generalRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.send('Webservice logistics is running.');
});

app.get('/api/test-db', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version()');
    res.json({
      status: 'success',
      message: 'Connected to PostgreSQL successfully.',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('DB test endpoint failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Cannot connect to database',
      error: String(error),
    });
  }
});

const bootstrap = async () => {
  try {
    await ensureSchema();
    app.listen(port, () => {
      console.log(`[Server]: listening on http://localhost:${port}`);
      console.log(`[Test API]: http://localhost:${port}/api/test-db`);
    });
  } catch (error) {
    console.error('[Bootstrap]: failed to ensure schema', error);
    process.exit(1);
  }
};

void bootstrap();
