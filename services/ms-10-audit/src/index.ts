import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, AuditLog } from './db';
import { initKafkaConsumer } from './kafkaConsumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4010;

app.use(cors());
app.use(express.json());

// Initialize Connections
connectDB();
initKafkaConsumer();

// Middleware to extract roles (simple decoding for API Gateway forwarding)
const requireSuperAdminOrAutoridad = (req: Request, res: Response, next: any) => {
  const rolesHeader = req.headers['x-user-roles'] as string;
  if (!rolesHeader) {
    return res.status(403).json({ error: 'Acceso denegado. No se encontraron roles.' });
  }
  const roles = rolesHeader.split(',');
  if (roles.includes('superAdmin') || roles.includes('autoridad')) {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado. Se requiere rol superAdmin o autoridad.' });
};

// Endpoint to query audit logs
app.get('/logs', requireSuperAdminOrAutoridad, async (req: Request, res: Response) => {
  try {
    const { service, action, limit = 50, page = 1 } = req.query;
    
    const query: any = {};
    if (service) query.service = service;
    if (action) query.action = action;

    const skip = (Number(page) - 1) * Number(limit);

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await AuditLog.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Error fetching audit logs' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'ms-10-audit' });
});

app.listen(PORT, () => {
  console.log(`🚀 Audit Service running on port ${PORT}`);
});
