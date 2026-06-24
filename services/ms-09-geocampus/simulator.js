const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

const ap_ids = [
    'FICA-AP-1',
    'FICA-AP-2',
    'FICA-CAFETERIA',
    'FICA-BIBLIOTECA',
    'FICA-LAB-FISICA',
    'FICA-LAB-QUIMICA'
];

client.on('connect', () => {
    console.log('Connected to Mosquitto Broker at localhost:1883');
    
    setInterval(() => {
        // Randomly pick an AP and change its client count
        const ap_id = ap_ids[Math.floor(Math.random() * ap_ids.length)];
        const clients = Math.floor(Math.random() * 200); // 0 to 200 clients
        
        const payload = JSON.stringify({ ap_id, clients });
        
        client.publish('campus/heatmap', payload, (err) => {
            if (err) console.error('Publish error:', err);
            else console.log('Published:', payload);
        });
    }, 2000); // Publish every 2 seconds
});
