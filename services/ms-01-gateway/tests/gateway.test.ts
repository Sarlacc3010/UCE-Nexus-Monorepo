import request from 'supertest';
import { app } from '../src/index';

describe('API Gateway', () => {
  it('should return 200 OK for /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'API Gateway Operativo');
  });

  it('should return 401 for /api/reservas without token', async () => {
    const response = await request(app).post('/api/reservas').send({});
    expect(response.status).toBe(401);
  });
});
