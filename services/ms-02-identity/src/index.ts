import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/identity', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ms-02-identity' });
});

app.listen(PORT, () => {
  console.log(`ms-02-identity (Keycloak BFF) running on port ${PORT}`);
});
