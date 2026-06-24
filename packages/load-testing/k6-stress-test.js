import http from 'k6/http';
import { sleep, check } from 'k6';

// Simular 50 usuarios concurrentes (VUs) durante 30 segundos
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp-up to 50 users
    { duration: '15s', target: 50 },  // Stay at 50 users
    { duration: '5s', target: 0 },    // Ramp-down to 0 users
  ],
  thresholds: {
    // El 95% de las peticiones deben ser atendidas en menos de 500ms
    http_req_duration: ['p(95)<500'],
    // Las peticiones fallidas no deben superar el 1%
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Apuntamos al MS-01: API Gateway (asumiremos que corre en el puerto 3000 local o en ALB)
  // Reemplazar la URL según el endpoint del gateway
  const res = http.get('http://localhost:3000/health');
  
  check(res, {
    'status was 200': (r) => r.status == 200,
  });

  sleep(1); // Espera 1 segundo entre peticiones del mismo VU
}
