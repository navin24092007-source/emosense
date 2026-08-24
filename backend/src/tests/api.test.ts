import request from 'supertest';
import { app } from '../server';

describe('EmoSense Backend API Integration Tests', () => {
  let authToken: string;

  it('GET /health - should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('EmoSense Express Backend');
  });

  it('POST /api/auth/demo - should generate JWT token for demo user', async () => {
    const res = await request(app)
      .post('/api/auth/demo')
      .send({ role: 'student', name: 'Test Student' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('role', 'student');
    authToken = res.body.token;
  });

  it('GET /api/auth/profile - should return user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
  });

  it('POST /api/sessions - should create a new session', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ context: 'education', notes: 'Testing live session' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.context).toBe('education');
  });
});
