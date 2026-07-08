import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  service: string;
  action: string;
  details: any;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  service: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/';
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: 'uce_audit_db'
    });
    console.log('✅ Connected to MongoDB (Audit Service)');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB', error);
    process.exit(1);
  }
};
