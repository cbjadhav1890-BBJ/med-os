const request = require('supertest');

const { app, ready } = require('../../src/index');

beforeAll(async () => { await ready; });

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 if username is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ password: 'admin123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username and password required');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'wrong', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual(expect.objectContaining({ username: 'admin', role: 'admin' }));
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user data with valid token', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
      const token = loginRes.body.token;

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'admin');
    });
  });
});