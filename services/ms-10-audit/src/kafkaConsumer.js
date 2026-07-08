"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initKafkaConsumer = void 0;
const kafkajs_1 = require("kafkajs");
const db_1 = require("./db");
const kafka = new kafkajs_1.Kafka({
    clientId: 'ms-10-audit',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
});
const consumer = kafka.consumer({ groupId: 'audit-group' });
const initKafkaConsumer = async () => {
    try {
        await consumer.connect();
        console.log('✅ Connected to Kafka Consumer (Audit Service)');
        await consumer.subscribe({ topic: 'audit_events', fromBeginning: true });
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value)
                    return;
                try {
                    const payload = JSON.parse(message.value.toString());
                    const newLog = new db_1.AuditLog({
                        service: payload.service,
                        action: payload.action,
                        details: payload.details,
                        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
                    });
                    await newLog.save();
                    console.log(`📥 Logged event: [${payload.action}] from ${payload.service}`);
                }
                catch (err) {
                    console.error('❌ Error parsing/saving audit message', err);
                }
            },
        });
    }
    catch (error) {
        console.error('❌ Failed to connect to Kafka:', error);
    }
};
exports.initKafkaConsumer = initKafkaConsumer;
//# sourceMappingURL=kafkaConsumer.js.map