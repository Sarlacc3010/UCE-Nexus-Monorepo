const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Cargar el contrato de reservas desde src/booking.proto
const PROTO_PATH = path.join(__dirname, 'src/booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

// Crear el cliente gRPC para conectar al MS-06 Booking
const client = new bookingProto.BookingService('localhost:50051', grpc.credentials.createInsecure());

console.log('📡 Enviando solicitud de reserva al MS-06 (Go gRPC)...');
client.CreateBooking({
    user_id: 'estudiante_prueba_123',
    resource_type: 'Laboratorio',
    resource_id: 'LAB-Cisco-01',
    date: '2026-06-06'
}, (err, response) => {
    if (err) {
        console.error('❌ Error al crear reserva:', err);
    } else {
        console.log('✅ Reserva creada con éxito:', JSON.stringify(response, null, 2));
        console.log('\n🎉 ¡Evento enviado a RabbitMQ!');
        console.log('👉 Ahora revisa la terminal de MS-07 (Notifications) o sus logs de Docker.');
        console.log('Deberías ver cómo se consume el evento y se "envía" la alerta de confirmación.');
    }
});
