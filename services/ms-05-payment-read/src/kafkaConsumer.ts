import { Kafka } from 'kafkajs';
import { redisClient } from './redis';

const kafkaBrokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];

const kafka = new Kafka({
  clientId: 'ms-05-payment-read-consumer',
  brokers: kafkaBrokers,
});

const consumer = kafka.consumer({ groupId: 'payment-read-group' });

export async function startKafkaConsumer() {
  console.log('🔌 Conectando consumidor Kafka en ms-05-payment-read...');
  let connected = false;
  let retries = 5;

  while (!connected && retries > 0) {
    try {
      await consumer.connect();
      connected = true;
      console.log('✅ Consumidor Kafka (Lectura) conectado.');
    } catch (err) {
      retries -= 1;
      console.error(`⚠️ Error al conectar consumidor Kafka. Reintentos restantes: ${retries}`, err);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!connected) {
    console.error('❌ No se pudo conectar al Broker de Kafka para la lectura de Pagos.');
    return;
  }

  try {
    await consumer.subscribe({ topic: 'payment-events', fromBeginning: false });
    console.log('🚀 Suscrito al canal "payment-events" para cachear pagos.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) return;
          const event = JSON.parse(message.value.toString());
          console.log('📥 [Kafka Consumer - ms-05] Evento recibido:', event);

          const { type, payment_id, student_id, amount, description, category, transaction_ref, timestamp } = event;

          if (type === 'payment_completed') {
            const paymentRecord = {
              id: paymentIdClean(payment_id),
              student_id,
              amount: parseFloat(amount),
              description,
              category,
              status: 'COMPLETED',
              transaction_ref,
              created_at: timestamp || new Date().toISOString()
            };

            const redisKey = `payments:student:${student_id}`;
            const paymentKey = `payment:${paymentRecord.id}`;

            console.log(`💾 Cacheando pago ${paymentRecord.id} para el estudiante ${student_id} en Redis...`);

            // Guardar el pago individual
            await redisClient.set(paymentKey, JSON.stringify(paymentRecord));
            
            // Obtener lista actual de Redis para añadir este pago
            const currentListStr = await redisClient.get(redisKey);
            let paymentList = [];
            if (currentListStr) {
              paymentList = JSON.parse(currentListStr);
            }
            
            // Evitar duplicaciones
            if (!paymentList.some((p: any) => p.id === paymentRecord.id)) {
              paymentList.unshift(paymentRecord); // Añadir al inicio
              await redisClient.set(redisKey, JSON.stringify(paymentList));
            }
            console.log('✅ Pago cacheado con éxito.');
          }
        } catch (err) {
          console.error('❌ Error procesando evento de Kafka en ms-05:', err);
        }
      },
    });
  } catch (error) {
    console.error('❌ Error al subscribir o correr el consumidor de Kafka (ms-05):', error);
  }
}

function paymentIdClean(id: any): string {
  return typeof id === 'string' ? id : JSON.stringify(id);
}
