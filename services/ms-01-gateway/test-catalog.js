const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Cargar el contrato de catálogo desde packages/proto-contracts
const PROTO_PATH = path.join(__dirname, '../../packages/proto-contracts/catalog.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const catalogProto = grpc.loadPackageDefinition(packageDefinition).catalog;

// Crear el cliente gRPC para conectar al MS-11 Catalog
const client = new catalogProto.CatalogService('localhost:50052', grpc.credentials.createInsecure());

console.log('📡 Llamando a GetLaboratory para "LAB-Cisco-01"...');
client.GetLaboratory({ code: 'LAB-Cisco-01' }, (err, response) => {
    if (err) {
        console.error('❌ Error en GetLaboratory:', err);
    } else {
        console.log('✅ Respuesta GetLaboratory:', JSON.stringify(response, null, 2));
    }

    console.log('\n📡 Llamando a CheckAvailability para "LAB-Cisco-01"...');
    client.CheckAvailability({ code: 'LAB-Cisco-01', date: '2026-06-06' }, (err, response) => {
        if (err) {
            console.error('❌ Error en CheckAvailability:', err);
        } else {
            console.log('✅ Respuesta CheckAvailability:', JSON.stringify(response, null, 2));
        }
    });
});
