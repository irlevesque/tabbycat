import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import deviceRoutes from './routes/devices';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tabsync';

app.use(cors());
app.use(express.json());

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/devices', deviceRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Tab Sync API Server' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
