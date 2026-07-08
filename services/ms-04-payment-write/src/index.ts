import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import crypto from 'crypto';
import { pool, initDb } from './db';
import { startKafkaProducer, publishPaymentEvent } from './kafka';
import { generateInvoicePdf } from './pdfGenerator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Iniciar pasarela Stripe
// Si no se define STRIPE_SECRET_KEY, usaremos una llave mock para habilitar el modo simulación
const stripeKey = process.env.STRIPE_SECRET_KEY || 'simulated_stripe_secret_key_3010';
const isMockMode = stripeKey.includes('MockKey') || stripeKey.includes('simulated');
const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16' as any,
});

// Endpoint 1: Crear Intención de Pago (Stripe PaymentIntent)
app.post('/api/payments/intent', async (req: Request, res: Response): Promise<void> => {
  const { student_id, amount, description, category, email } = req.body;

  if (!student_id || !amount || !description || !category) {
    res.status(400).json({ error: 'Faltan parámetros: student_id, amount, description, category son requeridos.' });
    return;
  }

  try {
    let clientSecret = 'mock_client_secret_value';
    let transactionRef = `pi_mock_${crypto.randomUUID().substring(0, 8)}`;

    if (!isMockMode) {
      // Crear PaymentIntent real en Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Stripe procesa en centavos
        currency: 'usd',
        metadata: { student_id, category, description, email: email || '' },
      });
      clientSecret = paymentIntent.client_secret || '';
      transactionRef = paymentIntent.id;
    } else {
      console.log(`ℹ️ [Stripe Sandbox] Simulando creación de PaymentIntent para cobro de $${amount} (${category})`);
    }

    // Persistir el pago como PENDING en la base de datos
    const dbPaymentId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO payments (id, student_id, amount, description, category, status, transaction_ref)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
      [dbPaymentId, student_id, amount, description, category, transactionRef]
    );

    // Publicar evento inicial en Kafka
    await publishPaymentEvent('payment_created', {
      payment_id: dbPaymentId,
      student_id,
      amount,
      category,
      transaction_ref: transactionRef
    });

    res.status(201).json({
      clientSecret,
      paymentId: dbPaymentId,
      transactionRef,
      amount
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Endpoint 2: Confirmar Pago (Valida Stripe y emite factura PDF + correo + evento Kafka)
app.post('/api/payments/confirm', async (req: Request, res: Response): Promise<void> => {
  const { paymentId, transactionRef, email, paymentMethod } = req.body;

  if (!paymentId || !transactionRef) {
    res.status(400).json({ error: 'Faltan parámetros: paymentId y transactionRef son obligatorios.' });
    return;
  }

  try {
    // 1. Validar el estado del pago con Stripe
    let isSuccess = false;
    let finalPaymentMethod = paymentMethod || 'Tarjeta de Crédito';

    if (!isMockMode) {
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionRef);
      if (paymentIntent.status === 'succeeded') {
        isSuccess = true;
        const charges = paymentIntent.latest_charge as any;
        if (charges && typeof charges === 'object') {
          finalPaymentMethod = charges.payment_method_details?.type || finalPaymentMethod;
        }
      }
    } else {
      // En modo simulación (sandbox), aprobamos de forma automática
      isSuccess = true;
      console.log(`ℹ️ [Stripe Sandbox] Simulando aprobación automática para la referencia ${transactionRef}`);
    }

    if (!isSuccess) {
      res.status(400).json({ error: 'La transacción no ha sido confirmada ni cobrada en Stripe.' });
      return;
    }

    // 2. Actualizar estado a COMPLETED en PostgreSQL
    const updateResult = await pool.query(
      `UPDATE payments 
       SET status = 'COMPLETED', payment_method = $1, updated_at = NOW()
       WHERE id = $2 AND transaction_ref = $3
       RETURNING *`,
      [finalPaymentMethod, paymentId, transactionRef]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: 'El registro de pago especificado no se encuentra en la base de datos.' });
      return;
    }

    const dbPayment = updateResult.rows[0];

    // 3. Generar la factura en PDF en memoria (pdfkit)
    const invoicePdfBuffer = await generateInvoicePdf({
      id: dbPayment.id,
      studentId: dbPayment.student_id,
      amount: parseFloat(dbPayment.amount),
      description: dbPayment.description,
      category: dbPayment.category,
      paymentMethod: dbPayment.payment_method,
      transactionRef: dbPayment.transaction_ref,
      createdAt: dbPayment.created_at
    });

    // 4. Enviar notificación por correo con el PDF adjunto llamando a ms-07-notifications
    const recipientEmail = email || `${dbPayment.student_id}@uce.edu.ec`;
    const notificationsUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://ms-07-notifications:8000/api/notifications/payment';

    try {
      console.log(`📧 Enviando correo de confirmación de pago a ${recipientEmail} a través de ms-07-notifications...`);
      const response = await fetch(notificationsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          payment_id: dbPayment.id,
          amount: dbPayment.amount,
          description: dbPayment.description,
          pdf_base64: invoicePdfBuffer.toString('base64')
        })
      });
      if (response.ok) {
        console.log('✅ Correo de confirmación enviado exitosamente.');
      } else {
        const errText = await response.text();
        console.warn('⚠️ El servicio de notificaciones reportó un error al enviar el correo:', errText);
      }
    } catch (err) {
      console.error('⚠️ No se pudo comunicar con el servicio de notificaciones:', err);
    }

    // 5. Publicar evento `payment_completed` en Kafka
    await publishPaymentEvent('payment_completed', {
      payment_id: dbPayment.id,
      student_id: dbPayment.student_id,
      amount: dbPayment.amount,
      category: dbPayment.category,
      transaction_ref: dbPayment.transaction_ref,
      semester_id: 1 // Por defecto o inferido en la transacción para matricular en ms-03
    });

    res.status(200).json({
      success: true,
      message: 'Pago procesado y verificado exitosamente.',
      paymentId: dbPayment.id,
      status: 'COMPLETED'
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'ms-04-payment-write', mode: isMockMode ? 'simulation' : 'production' });
});

// Iniciar aplicación
initDb().then(() => {
  startKafkaProducer().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 ms-04-payment-write corriendo en http://localhost:${PORT} [Modo: ${isMockMode ? 'SIMULACION' : 'STRIPE_PROD'}]`);
    });
  });
});
