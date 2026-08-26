import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import productsRoutes from './routes/products';
import workOrdersRoutes from './routes/workOrders';
import stockMovementsRoutes from './routes/stockMovements';
import dashboardRoutes from './routes/dashboard';
import reportsRoutes from './routes/reports';
import equipmentRoutes from './routes/equipment';

const app = express();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Çok fazla giriş denemesi yapıldı, lütfen 15 dakika sonra tekrar deneyiniz.' }
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/work-orders', workOrdersRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/equipment', equipmentRoutes);

app.use(errorHandler);

export default app;
