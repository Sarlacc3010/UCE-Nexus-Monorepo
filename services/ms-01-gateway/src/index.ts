// src/index.ts
import express from 'express';
import type { Request, Response, NextFunction } from 'express'; // <-- Solución al error TS1295 y TS1484
import cors from 'cors';
import jwt from 'jsonwebtoken';
import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración del cliente JWKS para obtener las llaves públicas de Keycloak
const client = jwksClient({
    jwksUri: 'http://localhost:8080/realms/uce-nexus/protocol/openid-connect/certs'
});

// Función para obtener la llave pública y validar la firma del Token
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    if (!header.kid) {
        callback(new Error("No Key ID found in token header"), undefined);
        return;
    }
    client.getSigningKey(header.kid, function (err, key) {
        if (err || !key) {
            callback(err, undefined);
            return;
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

// Middleware de Seguridad (Interceptor)
const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        // Solución al error TS2769: Aseguramos a TypeScript que el token es un string
        if (!token) {
            res.status(401).json({ error: 'Token mal formado.' });
            return;
        }

        // Solución al error TS7006: Tipamos explícitamente err y decoded
        jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
            if (err) {
                res.status(403).json({ error: 'Token inválido o expirado. Acceso denegado.' });
                return;
            }

            // Si es válido, guardamos los datos del estudiante en la request y continuamos
            (req as any).user = decoded;
            next();
        });
    } else {
        res.status(401).json({ error: 'No se proporcionó un token de autorización.' });
    }
};

// ==========================================
// RUTAS DE PRUEBA Y ENRUTAMIENTO FUTURO
// ==========================================

// Ruta pública (Healthcheck)
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'API Gateway Operativo', gateway: 'MS-01' });
});

// Ruta protegida
app.post('/api/reservas', authenticateJWT, (req: Request, res: Response) => {
    const estudiante = (req as any).user;

    res.json({
        message: `Petición autorizada para el estudiante. Enrutando a MS-06 Booking Engine...`,
        simulated_action: "Llamada gRPC pendiente",
        userData: estudiante
    });
});

app.listen(PORT, () => {
    console.log(`🚀 UCE-Nexus API Gateway corriendo en http://localhost:${PORT}`);
    console.log(`🛡️  Seguridad JWT respaldada por Keycloak habilitada.`);
});