// src/index.ts
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. SEGURIDAD: Configuración de Keycloak
const client = jwksClient({
    jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/UCE-Nexus/protocol/openid-connect/certs'
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    if (!header.kid) {
        callback(new Error("No Key ID found"), undefined);
        return;
    }
    client.getSigningKey(header.kid, function (err, key) {
        if (err || !key) {
            callback(err, undefined);
            return;
        }
        callback(null, key.getPublicKey());
    });
}

const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Token mal formado.' });
            return;
        }
        jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
            if (err) {
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

// 2. CONEXIÓN gRPC: Cargar el contrato y crear el cliente
const PROTO_PATH = path.join(__dirname, 'booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking as any;
const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'localhost:50051';
const bookingClient = new bookingProto.BookingService(bookingServiceUrl, grpc.credentials.createInsecure());

// 3. RUTAS
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
        // Obtenemos la URL base de Keycloak a partir del JWKS URI configurado
        const jwksUri = process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/UCE-Nexus/protocol/openid-connect/certs';
        const keycloakBaseUrl = jwksUri.split('/realms/')[0];
        const tokenUrl = `${keycloakBaseUrl}/realms/UCE-Nexus/protocol/openid-connect/token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: 'uce-client',
                username: username,
                password: password,
                grant_type: 'password'
            })
        });

        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error: any) {
        console.error('Error al redirigir autenticación a Keycloak:', error);
        res.status(500).json({ error: 'Error de conexión con el servidor de autenticación Keycloak.' });
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
        const jwksUri = process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/UCE-Nexus/protocol/openid-connect/certs';
        const keycloakBaseUrl = jwksUri.split('/realms/')[0];
        const tokenUrl = `${keycloakBaseUrl}/realms/UCE-Nexus/protocol/openid-connect/token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: 'uce-client',
                refresh_token: refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error: any) {
        console.error('Error al refrescar token en Keycloak:', error);
        res.status(500).json({ error: 'Error de conexión con el servidor de autenticación Keycloak.' });
    }
});

// Ruta protegida que ahora llama a Go con autenticación JWT activa
app.post('/api/reservas', authenticateJWT, (req: Request, res: Response) => {
    const decoded = (req as any).user;
    
    // Extrae el ID de usuario desde el token decodificado de Keycloak (sub o username)
    const userId = decoded?.sub || decoded?.preferred_username || "est-12345";

    const grpcRequest = {
        user_id: userId,
        resource_type: req.body.resource_type || "Laboratorio",
        resource_id: req.body.resource_id || "LAB-Cisco-01",
        date: req.body.date || new Date().toISOString()
    };

    bookingClient.CreateBooking(grpcRequest, (err: any, response: any) => {
        if (err) {
            console.error("Error gRPC:", err);
            res.status(500).json({ error: 'Fallo al comunicarse con el motor de reservas' });
            return;
        }

        res.json({
            gateway_message: "Petición autenticada y procesada exitosamente en el motor de reservas",
            ms_06_response: response
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 UCE-Nexus API Gateway corriendo en http://localhost:${PORT}`);
    console.log(`🛡️  Seguridad JWT y cliente gRPC habilitados.`);
});