import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://enrollment_user:enrollment_password@postgres-enrollment:5432/uce_enrollment_dev';

export const pool = new Pool({
  connectionString
});

const catalogConnectionString = process.env.CATALOG_DATABASE_URL || 'postgresql://catalog_user:catalog_password@postgres-catalog:5432/uce_catalog_dev';

export const catalogPool = new Pool({
  connectionString: catalogConnectionString
});

export async function initDb() {
  console.log('🟢 Conectando a la base de datos de Matrículas/Académico...');
  let retries = 5;
  let client;
  
  while (retries > 0) {
    try {
      client = await pool.connect();
      break;
    } catch (err) {
      retries -= 1;
      console.log(`⚠️ Esperando por la base de datos... Intentos restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!client) {
    console.error('❌ Falló la conexión con la base de datos de matrículas.');
    return;
  }

  try {
    // Buscar schema.sql en src o dist según ejecute ts-node o node
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '..', 'src', 'schema.sql');
    }

    if (fs.existsSync(schemaPath)) {
      console.log(`🌱 Ejecutando migración desde: ${schemaPath}`);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Base de datos de Matrículas/Académico inicializada y sembrada.');
    } else {
      console.warn('⚠️ No se encontró schema.sql. Se omitirá la inicialización automática.');
    }
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos de matrículas:', error);
  } finally {
    client.release();
  }
}
