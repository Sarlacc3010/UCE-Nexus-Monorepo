// src/index.ts
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import logger from './logger';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Proxy para ms-02-identity (Debe ir ANTES de express.json para evitar que el body parser consuma el stream y rompa el proxy en POST)
const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:4002';
app.use('/api/identity', createProxyMiddleware({ target: identityServiceUrl, changeOrigin: true }));

app.use(express.json());

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



// 1. SEGURIDAD: Configuración de Autenticación Custom con JWT
const JWT_SECRET = process.env.JWT_SECRET || 'supersecrettokenkey123!';

const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Token mal formado.' });
            return;
        }
        jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
            if (err) {
                logger.warn(`Intento de acceso con token inválido: ${err.message}`);
                res.status(403).json({ error: 'Token inválido o expirado. Acceso denegado.' });
                return;
            }
            (req as any).user = decoded;
            next();
        });
    } else {
        res.status(401).json({ error: 'No se proporcionó un token de autorización.' });
    }
};

const requireRole = (role: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = (req as any).user;
        const roles = user?.roles || [];
        if (!roles.includes(role)) {
            logger.warn(`Acceso denegado. Se requiere el rol: ${role}. Roles actuales: ${roles}`);
            res.status(403).json({ error: `Acceso denegado. Se requiere rol: ${role}` });
            return;
        }
        next();
    };
};


// 2. CONEXIÓN gRPC: Cargar el contrato y crear el cliente
const PROTO_PATH = path.join(__dirname, 'booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking as any;
const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'localhost:50051';
const bookingClient = new bookingProto.BookingService(bookingServiceUrl, grpc.credentials.createInsecure());

// 3. RUTAS
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica el estado del Gateway
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'API Gateway Operativo', gateway: 'MS-01', ambiente: process.env.NODE_ENV || 'local'
    });
});

// Proxy de Autenticación para evitar bloqueos de CORS en el navegador (BFF pattern)
app.post('/api/login', async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
        return;
    }

    try {
        const tokenUrl = `${identityServiceUrl}/api/identity/login`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error: any) {
        logger.error('Error al redirigir autenticación a ms-02-identity:', error);
        res.status(500).json({ error: 'Error de conexión con el servidor de autenticación local.' });
    }
});

// Proxy de refresco de tokens para evitar bloqueos de CORS (BFF pattern)
app.post('/api/refresh', async (req: Request, res: Response): Promise<void> => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        res.status(400).json({ error: 'Refresh token es requerido.' });
        return;
    }

    try {
        // Al usar auth custom simplificado para pruebas, si el refresh token es válido
        // podemos simplemente responder con el mismo token simulado o un ok.
        // En este caso, devolveremos el token del body simulando éxito
        res.json({
            access_token: refresh_token,
            token_type: 'Bearer',
            expires_in: 3600
        });
    } catch (error: any) {
        logger.error('Error al refrescar token:', error);
        res.status(500).json({ error: 'Error al refrescar el token de sesión.' });
    }
});

// Ruta protegida que ahora llama a Go con autenticación JWT activa y protección de roles
/**
 * @swagger
 * /api/reservas:
 *   post:
 *     summary: Crear una reserva (requiere rol user)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reserva exitosa
 *       403:
 *         description: No autorizado
 */
app.post('/api/reservas', authenticateJWT, requireRole('user'), (req: Request, res: Response) => {
    const decoded = (req as any).user;
    
    // Extrae el ID de usuario desde el token decodificado de Keycloak (email, username o sub)
    const userId = decoded?.email || decoded?.preferred_username || decoded?.sub || "est-12345";

    const grpcRequest = {
        user_id: userId,
        resource_type: req.body.resource_type || "Laboratorio",
        resource_id: req.body.resource_id || "LAB-Cisco-01",
        date: req.body.date || new Date().toISOString()
    };

    bookingClient.CreateBooking(grpcRequest, (err: any, response: any) => {
        if (err) {
            logger.error("Error gRPC al crear reserva:", err);
            res.status(500).json({ error: 'Fallo al comunicarse con el motor de reservas' });
            return;
        }

        logger.info(`Reserva procesada exitosamente para el usuario ${userId}`);

        res.json({
            gateway_message: "Petición autenticada y procesada exitosamente en el motor de reservas",
            ms_06_response: response
        });
    });
});



// ─── Enrollment Service (MS-03) Proxy ────────────────────────────────────────
const ENROLLMENT_SERVICE_URL = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3001';

app.use('/api/academic', async (req: Request, res: Response): Promise<void> => {
    try {
        const targetUrl = `${ENROLLMENT_SERVICE_URL}${req.originalUrl.replace('/api/academic', '/api')}`;
        
        const headers: Record<string, string> = {};
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }

        const fetchOptions: RequestInit = {
            method: req.method,
            headers,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.status(response.status).json(data);
        } else {
            const data = await response.text();
            res.status(response.status).send(data);
        }
    } catch (error: any) {
        logger.error(`Error proxying to enrollment service (${req.method} ${req.originalUrl}):`, error);
        res.status(503).json({ error: 'El servicio de matrícula/academia no está disponible.' });
    }
});

// ─── AI Agent Proxy (MS-08) ──────────────────────────────────────────────────
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8001';

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Chat público con el agente IA (JWT opcional — amplía capacidades si se provee)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *               conversation_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Respuesta del agente IA
 */
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        // Pass JWT through if provided (agent decides capabilities based on role)
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }
        // Forward real client IP for rate limiting
        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        if (clientIp) headers['X-Forwarded-For'] = clientIp;

        const response = await fetch(`${AI_AGENT_URL}/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body),
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        logger.error('Error proxying to AI agent (public):', error);
        res.status(503).json({ error: 'El agente IA no está disponible en este momento.' });
    }
});

/**
 * @swagger
 * /api/chat/secure:
 *   post:
 *     summary: Chat del agente IA para usuarios autenticados (JWT requerido)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Respuesta del agente IA con capacidades completas
 *       401:
 *         description: Token no proporcionado
 */
app.post('/api/chat/secure', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
    try {
        const response = await fetch(`${AI_AGENT_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || '',
            },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        logger.error('Error proxying to AI agent (secure):', error);
        res.status(503).json({ error: 'El agente IA no está disponible en este momento.' });
    }
});

// ─── GeoCampus Service (MS-09) Proxy ─────────────────────────────────────────
const GEOCAMPUS_SERVICE_URL = process.env.GEOCAMPUS_SERVICE_URL || 'http://localhost:8009';

const geocampusProxy = createProxyMiddleware({
    target: GEOCAMPUS_SERVICE_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/api/geocampus': '/api',
        '^/ws/geocampus': '/ws',
    },
    onError: (err: any, req: any, res: any) => {
        logger.error(`Error proxying to geocampus service: ${err.message}`);
    }
});

app.use('/api/geocampus', geocampusProxy);
app.use('/ws/geocampus', geocampusProxy);

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        logger.info(`🚀 UCE-Nexus API Gateway corriendo en http://localhost:${PORT}`);
        logger.info(`🛡️  Seguridad JWT y cliente gRPC habilitados.`);
        logger.info(`📖 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
        logger.info(`🤖 AI Agent proxy habilitado → ${AI_AGENT_URL}`);
    });

    server.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/ws/geocampus')) {
            if (typeof (geocampusProxy as any).upgrade === 'function') {
                (geocampusProxy as any).upgrade(req, socket, head);
            }
        }
    });
}

export { app };