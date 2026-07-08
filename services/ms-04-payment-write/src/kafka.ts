import { Kafka, Producer } from 'kafkajs';

const kafkaBrokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];

const kafka = new Kafka({
  clientId: 'ms-04-payment-write-producer',
  brokers: kafkaBrokers,
});

export const producer = kafka.producer();

export async function startKafkaProducer() {
  console.log('🔌 Conectando productor de Kafka en ms-04-payment-write...');
  let connected = false;
  let retries = 5;

  while (!connected && retries > 0) {
    try {
      await producer.connect();
      connected = true;
      console.log('✅ Productor de Kafka conectado.');
    } catch (err) {
      retries -= 1;
      console.error(`⚠️ Error al conectar productor de Kafka. Reintentos restantes: ${retries}`, err);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!connected) {
    console.error('❌ No se pudo conectar al Broker de Kafka para la escritura de Pagos.');
  }
}

export async function publishPaymentEvent(type: string, paymentData: any) {
  try {
    const payload = {
      type,
      ...paymentData,
      timestamp: new Date().toISOString(),
    };

    console.log(`📤 Publicando evento de pago en Kafka: ${type}`, payload);
    await producer.send({
      topic: 'payment-events',
      messages: [
        {
          key: paymentData.student_id ? paymentData.student_id.toString() : 'payment-general',
          value: JSON.stringify(payload),
        },
      ],
    });
    console.log('✅ Evento publicado con éxito.');
  } catch (err) {
    console.error('❌ Error al publicar evento de pago en Kafka:', err);
  }
}
