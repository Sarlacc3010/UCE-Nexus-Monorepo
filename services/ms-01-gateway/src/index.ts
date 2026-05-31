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
    jwksUri: 'http://localhost:8080/realms/UCE-Nexus/protocol/openid-connect/certs'
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
const PROTO_PATH = path.resolve(__dirname, '../../../packages/proto-contracts/booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking as any;
const bookingClient = new bookingProto.BookingService('localhost:50051', grpc.credentials.createInsecure());

// 3. RUTAS
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'API Gateway Operativo', gateway: 'MS-01' });
});

// Ruta protegida que ahora llama a Go
app.post('/api/reservas', authenticateJWT, (req: Request, res: Response) => {
    const estudiante = (req as any).user;

    // Armamos el mensaje según lo que definimos en el .proto
    const grpcRequest = {
        user_id: estudiante.preferred_username || "estudiante_desconocido",
        resource_type: "Laboratorio",
        resource_id: "LAB-Cisco-01",
        date: new Date().toISOString()
    };

    // Disparamos la llamada gRPC hacia el MS-06 en Go
    bookingClient.CreateBooking(grpcRequest, (err: any, response: any) => {
        if (err) {
            console.error("Error gRPC:", err);
            res.status(500).json({ error: 'Fallo al comunicarse con el motor de reservas (MS-06)' });
            return;
        }

        // Si Go responde correctamente, le devolvemos esa respuesta al Frontend
        res.json({
            gateway_message: `Petición autorizada para ${estudiante.preferred_username}.`,
            ms_06_response: response
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 UCE-Nexus API Gateway corriendo en http://localhost:${PORT}`);
    console.log(`🛡️  Seguridad JWT y cliente gRPC habilitados.`);
});