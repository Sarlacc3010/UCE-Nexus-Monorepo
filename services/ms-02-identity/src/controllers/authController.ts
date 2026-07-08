import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'ms-02-identity',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
});
const producer = kafka.producer();

// Inicializar productor de Kafka
const initKafka = async () => {
  try {
    await producer.connect();
    console.log('✅ Connected to Kafka Producer in Identity Service');
  } catch (error) {
    console.error('❌ Failed to connect Kafka Producer:', error);
  }
};
initKafka();

const emitAuditEvent = async (action: string, details: any) => {
  try {
    await producer.send({
      topic: 'audit_events',
      messages: [
        {
          value: JSON.stringify({
            service: 'ms-02-identity',
            action,
            details,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (error) {
    console.error('⚠️ Failed to emit audit event:', error);
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'supersecrettokenkey123!';

// Middleware interno rápido para validar si es administrador
const getAdminUser = (req: Request): any | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.roles && (decoded.roles.includes('admin') || decoded.roles.includes('superAdmin') || decoded.roles.includes('autoridad'))) {
      return decoded;
    }
  } catch (err) {
    return null;
  }
  return null;
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    return;
  }

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userQuery.rows.length === 0) {
      await emitAuditEvent('USER_LOGIN_FAILED', { username, reason: 'User not found' });
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    const user = userQuery.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await emitAuditEvent('USER_LOGIN_FAILED', { username, userId: user.id, reason: 'Invalid password' });
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    // Generar JWT Token
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles || ['user'],
      student_id: user.student_id,
      realm_access: {
        roles: user.roles || ['user']
      }
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // Emitir evento de éxito
    await emitAuditEvent('USER_LOGIN_SUCCESS', { username, userId: user.id, roles: user.roles });

    res.status(200).json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      roles: user.roles
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
    return;
  }

  try {
    const usersQuery = await pool.query('SELECT id, username, email, first_name, last_name, roles, cedula, personal_email, career, created_at FROM users');
    res.status(200).json(usersQuery.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users from database.' });
  }
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
    return;
  }

  try {
    const { username, firstName, lastName, password, roles, cedula, personalEmail, career } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username y password son campos requeridos.' });
      return;
    }

    const email = `${username.toLowerCase()}@uce.edu.ec`;

    // Validar si el usuario o cedula ya existe
    const userExistQuery = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 OR cedula = $3',
      [username, email, cedula]
    );

    if (userExistQuery.rows.length > 0) {
      res.status(409).json({ error: 'El nombre de usuario, correo institucional autogenerado o cédula ya se encuentra registrado.' });
      return;
    }

    // Hashear contraseña y registrar
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    // Normalizar roles
    const userRoles = Array.isArray(roles) ? roles : ['estudiante'];

    await pool.query(
      `INSERT INTO users (id, username, email, first_name, last_name, password, roles, cedula, personal_email, career)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, username, email, firstName || '', lastName || '', passwordHash, userRoles, cedula || null, personalEmail || null, career || null]
    );

    await emitAuditEvent('USER_CREATED', { admin: admin.username, createdUser: username, roles: userRoles });

    res.status(201).json({ message: 'User registered successfully', id: userId, email });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
    return;
  }

  const { id } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles)) {
    res.status(400).json({ error: 'Roles array is required' });
    return;
  }

  try {
    const updateResult = await pool.query(
      'UPDATE users SET roles = $1 WHERE id = $2 RETURNING username',
      [roles, id]
    );

    if (updateResult.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await emitAuditEvent('USER_ROLES_UPDATED', { admin: admin.username, updatedUser: updateResult.rows[0].username, newRoles: roles });

    res.status(200).json({ message: 'User roles updated successfully' });
  } catch (error: any) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles.' });
  }
};
