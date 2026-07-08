import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const databaseUrl = process.env.DATABASE_URL || 'postgres://keycloak:password@localhost:5431/keycloak';

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
        cedula VARCHAR(10) UNIQUE,
        personal_email VARCHAR(100),
        career VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add columns dynamically in case the table already existed before this update
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cedula VARCHAR(10) UNIQUE,
      ADD COLUMN IF NOT EXISTS personal_email VARCHAR(100),
      ADD COLUMN IF NOT EXISTS career VARCHAR(100),
      ADD COLUMN IF NOT EXISTS student_id SERIAL;
    `);
    
    console.log('✅ Users table is ready.');

    // 1. Super Admin
    const superAdminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['superadmin']);
    if (superAdminCheck.rows.length === 0) {
      console.log('🌱 Seeding superAdmin...');
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, career) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), 'superadmin', 'superadmin@uce.edu.ec', 'Super', 'Admin', await bcrypt.hash('superadmin3010', 10), ['superAdmin'], '1700000001', 'Administración Central']
      );
    }

    // 2. Admin Labs
    const adminLabsCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['adminlabs']);
    if (adminLabsCheck.rows.length === 0) {
      console.log('🌱 Seeding adminLabs...');
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, career) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), 'adminlabs', 'adminlabs@uce.edu.ec', 'Admin', 'Labs', await bcrypt.hash('adminlabs3010', 10), ['adminLabs'], '1700000002', 'Dirección de TI']
      );
    }

    // 3. Admin Canchas
    const adminCanchasCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admincanchas']);
    if (adminCanchasCheck.rows.length === 0) {
      console.log('🌱 Seeding adminCanchas...');
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, career) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), 'admincanchas', 'admincanchas@uce.edu.ec', 'Admin', 'Canchas', await bcrypt.hash('admincanchas3010', 10), ['adminCanchas'], '1700000003', 'Dirección de Deportes']
      );
    }

    // 4. Estudiante (aenavarreteg1)
    const estudianteCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['aenavarreteg1']);
    if (estudianteCheck.rows.length === 0) {
      console.log('🌱 Seeding estudiante (aenavarreteg1)...');
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, career) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), 'aenavarreteg1', 'aenavarreteg1@uce.edu.ec', 'Abel', 'Navarrete', await bcrypt.hash('abel3010', 10), ['estudiante'], '1712345678', 'Ingeniería en Computación']
      );
    } else {
      await pool.query('UPDATE users SET roles = $1 WHERE username = $2', [['estudiante'], 'aenavarreteg1']);
    }

    // 5. Profesor
    const profesorCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['profesor1']);
    if (profesorCheck.rows.length === 0) {
      console.log('🌱 Seeding profesor1...');
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, career) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), 'profesor1', 'profesor1@uce.edu.ec', 'Juan', 'Perez', await bcrypt.hash('profesor3010', 10), ['profesor'], '1700000004', 'Sistemas de Información']
      );
    }

    // 6. Autoridad (Decano/Subdecano/Director)
    const autoridadCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['autoridad1']);
    if (autoridadCheck.rows.length === 0) {
      console.log('🌱 Seeding autoridad1...');
      await pool.query(
        `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, career) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), 'autoridad1', 'autoridad1@uce.edu.ec', 'Ana', 'Gomez', await bcrypt.hash('autoridad3010', 10), ['autoridad'], '1700000005', 'Facultad de Ingeniería']
      );
    }
    
    console.log('✅ RBAC Seed users check completed.');

  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
  }
};
