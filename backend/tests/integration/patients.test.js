const request = require('supertest');

const app = require('../../src/index').app;

let adminToken;
let doctorToken;

beforeAll(async () => {
  const adminRes = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.token;

  const doctorRes = await request(app).post('/api/auth/login').send({ username: 'drpriya', password: 'doctor123' });
  doctorToken = doctorRes.body.token;
});

describe('Patients API', () => {
  describe('GET /api/patients', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
    });

    it('should return patients list with auth', async () => {
      const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('patients');
      expect(res.body).toHaveProperty('total');
    });

    it('should filter patients by search term', async () => {
      const res = await request(app).get('/api/patients?search=test').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/patients', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/patients').send({ name: 'Test Patient', phone: '9876543210' });
      expect(res.status).toBe(401);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ phone: '9876543210' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name and phone required');
    });

    it('should return 400 if phone is missing', async () => {
      const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Test Patient' });
      expect(res.status).toBe(400);
    });

    it('should create patient with valid data', async () => {
      const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Test Patient',
        phone: '9876543210',
        age: 30,
        gender: 'Male',
        city: 'Delhi',
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Patient');
      expect(res.body.uhid).toMatch(/^UHID-/);
    });

    it('should reject non-authorized roles', async () => {
      const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${doctorToken}`).send({
        name: 'Unauthorized Patient',
        phone: '9876543211',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should return patient by id', async () => {
      const listRes = await request(app).get('/api/patients').set('Authorization', `Bearer ${adminToken}`);
      const patientId = listRes.body.patients[0]?.id;

      if (patientId) {
        const res = await request(app).get(`/api/patients/${patientId}`).set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
      }
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app).get('/api/patients/non-existent-id').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});