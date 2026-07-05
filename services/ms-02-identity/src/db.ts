import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const databaseUrl = process.env.DATABASE_URL || 'postgres://iam_user:password@localhost:5431/uce_nexus_iam';

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const initDb = async () => {
  try {
    console.log('🔌 Connecting to IAM database...');
    
    // Crear tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        roles TEXT[] DEFAULT ARRAY['user'],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table is ready.');

    // Verificar si existe el usuario administrador principal
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      console.log('🌱 Seeding default Super Admin...');
      const adminId = crypto.randomUUID();
      const adminPasswordHash = await bcrypt.hash('admin3010', 10);
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, 'admin', 'admin@uce.edu.ec', 'Super', 'Admin', adminPasswordHash, ['admin']]
      );
      console.log('👤 Default Super Admin created (admin/admin3010).');
    }

    // Verificar e insertar el usuario del desarrollador Abel
    const developerCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['aenavarreteg1']);
    if (developerCheck.rows.length === 0) {
      console.log('🌱 Seeding developer admin user (aenavarreteg1)...');
      const devId = crypto.randomUUID();
      const devPasswordHash = await bcrypt.hash('abel3010', 10);
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [devId, 'aenavarreteg1', 'aenavarreteg1@uce.edu.ec', 'Abel', 'Navarrete', devPasswordHash, ['admin', 'user']]
      );
      console.log('👤 Developer user created (aenavarreteg1/abel3010).');
    }

  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
  }
};
