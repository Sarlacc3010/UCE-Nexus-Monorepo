import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';

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
    if (decoded.roles && decoded.roles.includes('admin')) {
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
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    const user = userQuery.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    // Generar JWT Token
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles || ['user'],
      realm_access: {
        roles: user.roles || ['user']
      }
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

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
    const usersQuery = await pool.query('SELECT id, username, email, first_name, last_name, roles, created_at FROM users');
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
    const { username, email, firstName, lastName, password, roles } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email y password son campos requeridos.' });
      return;
    }

    // Validar si el usuario ya existe
    const userExistQuery = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExistQuery.rows.length > 0) {
      res.status(409).json({ error: 'El nombre de usuario o correo ya se encuentra registrado.' });
      return;
    }

    // Hashear contraseña y registrar
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    // Normalizar roles
    const userRoles = Array.isArray(roles) ? roles : ['user'];

    await pool.query(
      `INSERT INTO users (id, username, email, first_name, last_name, password, roles)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, username, email, firstName || '', lastName || '', passwordHash, userRoles]
    );

    res.status(201).json({ message: 'User registered successfully', id: userId });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
};
