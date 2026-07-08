import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { redisClient, startRedis } from './redis';
import { startKafkaConsumer } from './kafkaConsumer';
import { pool } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Endpoint 1: Historial de pagos de un estudiante
app.get('/api/payments/student/:studentId', async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;

  if (!studentId) {
    res.status(400).json({ error: 'studentId es obligatorio.' });
    return;
  }

  const redisKey = `payments:student:${studentId}`;

  try {
    // 1. Intentar obtener de Redis
    const cachedPayments = await redisClient.get(redisKey);
    if (cachedPayments) {
      console.log(`⚡ [Redis Cache Hit] Historial de pagos para estudiante ${studentId}`);
      res.json(JSON.parse(cachedPayments));
      return;
    }

    // 2. Fallback a Postgres
    console.log(`🔌 [Postgres Fallback] Consultando historial de pagos para estudiante ${studentId}...`);
    const dbResult = await pool.query(
      `SELECT id, student_id, amount, description, category, status, transaction_ref, created_at
       FROM payments 
       WHERE student_id = $1 AND status = 'COMPLETED'
       ORDER BY created_at DESC`,
      [studentId]
    );

    const paymentRecords = dbResult.rows.map((row) => ({
      id: row.id,
      student_id: row.student_id,
      amount: parseFloat(row.amount),
      description: row.description,
      category: row.category,
      status: row.status,
      transaction_ref: row.transaction_ref,
      created_at: row.created_at
    }));

    // 3. Guardar en Redis para futuras consultas
    await redisClient.set(redisKey, JSON.stringify(paymentRecords));

    res.json(paymentRecords);
  } catch (error: any) {
    console.error('Error fetching student payments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint 2: Estado de un pago individual
app.get('/api/payments/status/:paymentId', async (req: Request, res: Response): Promise<void> => {
  const { paymentId } = req.params;

  if (!paymentId) {
    res.status(400).json({ error: 'paymentId es requerido.' });
    return;
  }

  const redisKey = `payment:${paymentId}`;

  try {
    // 1. Intentar obtener de Redis
    const cachedPayment = await redisClient.get(redisKey);
    if (cachedPayment) {
      console.log(`⚡ [Redis Cache Hit] Estado de pago individual para ${paymentId}`);
      res.json(JSON.parse(cachedPayment));
      return;
    }

    // 2. Fallback a Postgres
    console.log(`🔌 [Postgres Fallback] Consultando estado de pago ${paymentId}...`);
    const dbResult = await pool.query(
      `SELECT id, student_id, amount, description, category, status, transaction_ref, created_at
       FROM payments 
       WHERE id = $1`,
      [paymentId]
    );

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Pago no encontrado.' });
      return;
    }

    const row = dbResult.rows[0];
    const paymentRecord = {
      id: row.id,
      student_id: row.student_id,
      amount: parseFloat(row.amount),
      description: row.description,
      category: row.category,
      status: row.status,
      transaction_ref: row.transaction_ref,
      created_at: row.created_at
    };

    // 3. Guardar en Redis
    await redisClient.set(redisKey, JSON.stringify(paymentRecord));

    res.json(paymentRecord);
  } catch (error: any) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/payments/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT category, SUM(amount) as total
      FROM payments
      WHERE status = 'COMPLETED'
      GROUP BY category
    `;
    const result = await pool.query(query);
    
    let aranceles = 0;
    let parqueadero = 0;
    
    result.rows.forEach((row: any) => {
      if (row.category === 'MATRICULA') {
        aranceles = parseFloat(row.total || '0');
      } else if (row.category === 'ESTACIONAMIENTO') {
        parqueadero = parseFloat(row.total || '0');
      }
    });
    
    res.json({
      aranceles,
      parqueadero
    });
  } catch (error: any) {
    console.error('Error fetching payments stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'ms-05-payment-read' });
});

// Iniciar aplicación
startRedis().then(() => {
  startKafkaConsumer().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 ms-05-payment-read corriendo en http://localhost:${PORT}`);
    });
  });
});
