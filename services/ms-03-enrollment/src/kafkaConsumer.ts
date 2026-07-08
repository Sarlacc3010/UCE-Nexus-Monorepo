import { Kafka } from 'kafkajs';
import { pool } from './db';

const kafkaBrokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];

const kafka = new Kafka({
  clientId: 'ms-03-enrollment-consumer',
  brokers: kafkaBrokers,
});

const consumer = kafka.consumer({ groupId: 'enrollment-group' });

export async function startKafkaConsumer() {
  console.log('🔌 Conectando consumidor Kafka en ms-03-enrollment...');
  let connected = false;
  let retries = 5;

  while (!connected && retries > 0) {
    try {
      await consumer.connect();
      connected = true;
      console.log('✅ Consumidor Kafka conectado.');
    } catch (err) {
      retries -= 1;
      console.error(`⚠️ Error al conectar consumidor Kafka. Reintentos restantes: ${retries}`, err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (!connected) {
    console.error('❌ No se pudo conectar al Broker de Kafka para el módulo de Matrículas.');
    return;
  }

  try {
    await consumer.subscribe({ topic: 'payment-events', fromBeginning: false });
    console.log('🚀 Suscrito al canal de eventos "payment-events" para Matrículas.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const prefix = `${topic}[${partition} | ${message.offset}]`;
        console.log(`📥 Evento de pago recibido en Matrículas: ${prefix}`);

        try {
          if (!message.value) return;
          const event = JSON.parse(message.value.toString());
          console.log('   Contenido del evento:', event);

          const { type, student_id, semester_id, category } = event;

          // Solo procesar confirmaciones exitosas de tipo MATRICULA
          if (type === 'payment_completed' && category === 'MATRICULA') {
            const studentId = parseInt(student_id, 10);
            const semesterId = parseInt(semester_id, 10);

            if (isNaN(studentId) || isNaN(semesterId)) {
              console.warn('⚠️ ID de estudiante o semestre inválido en el evento de pago:', event);
              return;
            }

            console.log(`🔄 Actualizando estado de matrícula a MATRICULADO para estudiante ${studentId} en semestre ${semesterId}...`);
            const updateResult = await pool.query(
              `UPDATE student_semester_status 
               SET status = 'MATRICULADO', needs_payment = false, updated_at = NOW() 
               WHERE student_id = $1 AND semester_id = $2
               RETURNING *`,
              [studentId, semesterId]
            );

            if (updateResult.rowCount === 0) {
              console.warn(`⚠️ No se encontró registro en student_semester_status para estudiante ${studentId} en el semestre ${semesterId}. Creando matrícula directa...`);
              await pool.query(
                `INSERT INTO student_semester_status (student_id, semester_id, status, needs_payment, payment_amount)
                 VALUES ($1, $2, 'MATRICULADO', false, 0.00)`,
                [studentId, semesterId]
              );
            }
            console.log(`✅ Matrícula del estudiante ${studentId} actualizada a MATRICULADO.`);
          }
        } catch (error) {
          console.error('❌ Error al procesar el mensaje de pago en el consumidor:', error);
        }
      },
    });
  } catch (error) {
    console.error('❌ Error al subscribir o correr el consumidor de Kafka:', error);
  }
}
