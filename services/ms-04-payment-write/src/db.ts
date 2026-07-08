import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://uce:password@localhost:5432/uce_nexus_prod';

export const pool = new Pool({
  connectionString
});

export async function initDb() {
  console.log('🔌 Conectando a la base de datos de Pagos (Escritura)...');
  let retries = 5;
  let client;

  while (retries > 0) {
    try {
      client = await pool.connect();
      break;
    } catch (err) {
      retries -= 1;
      console.log(`⚠️ Esperando por la base de datos de pagos... Intentos restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!client) {
    console.error('❌ Falló la conexión con la base de datos de pagos.');
    return;
  }

  try {
    console.log('🌱 Inicializando tabla de pagos...');
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(50) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          description VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL, -- 'MATRICULA', 'CANCHA', 'ESTACIONAMIENTO'
          status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'FAILED'
          payment_method VARCHAR(50),
          transaction_ref VARCHAR(100), -- ID del intento de Stripe
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableSql);
    console.log('✅ Tabla de pagos inicializada exitosamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la tabla de pagos:', error);
  } finally {
    client.release();
  }
}
