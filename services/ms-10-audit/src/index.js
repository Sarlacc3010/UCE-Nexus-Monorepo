"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const kafkaConsumer_1 = require("./kafkaConsumer");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4010;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Connections
(0, db_1.connectDB)();
(0, kafkaConsumer_1.initKafkaConsumer)();
// Middleware to extract roles (simple decoding for API Gateway forwarding)
const requireSuperAdminOrAutoridad = (req, res, next) => {
    const rolesHeader = req.headers['x-user-roles'];
    if (!rolesHeader) {
        return res.status(403).json({ error: 'Acceso denegado. No se encontraron roles.' });
    }
    const roles = rolesHeader.split(',');
    if (roles.includes('superAdmin') || roles.includes('autoridad')) {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol superAdmin o autoridad.' });
};
// Endpoint to query audit logs
app.get('/logs', requireSuperAdminOrAutoridad, async (req, res) => {
    try {
        const { service, action, limit = 50, page = 1 } = req.query;
        const query = {};
        if (service)
            query.service = service;
        if (action)
            query.action = action;
        const skip = (Number(page) - 1) * Number(limit);
        const logs = await db_1.AuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await db_1.AuditLog.countDocuments(query);
        res.json({
            total,
            page: Number(page),
            limit: Number(limit),
            data: logs,
        });
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Error fetching audit logs' });
    }
});
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'ms-10-audit' });
});
app.listen(PORT, () => {
    console.log(`🚀 Audit Service running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map