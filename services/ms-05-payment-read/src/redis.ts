import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('❌ Error en el Cliente Redis de Pagos (Lectura):', err));

export async function startRedis() {
  console.log('🔌 Conectando a Redis en ms-05-payment-read...');
  let connected = false;
  let retries = 5;

  while (!connected && retries > 0) {
    try {
      await redisClient.connect();
      connected = true;
      console.log('✅ Cliente Redis conectado.');
    } catch (err) {
      retries -= 1;
      console.error(`⚠️ Error al conectar Redis. Reintentos restantes: ${retries}`, err);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (!connected) {
    console.error('❌ No se pudo establecer conexión con Redis.');
  }
}
