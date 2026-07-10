import { Document } from 'mongoose';
export interface IAuditLog extends Document {
    service: string;
    action: string;
    details: any;
    timestamp: Date;
}
export declare const AuditLog: any;
export declare const connectDB: () => Promise<void>;
//# sourceMappingURL=db.d.ts.map