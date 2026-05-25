const request = require('supertest');

const { app, ready } = require('../../src/index');

let adminToken;
let receptionistToken;

beforeAll(async () => {
  await ready;
  const adminRes = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.token;

  const recepRes = await request(app).post('/api/auth/login').send({ username: 'reception1', password: 'recep123' });
  receptionistToken = recepRes.body.token;
});

describe('Appointments API', () => {
  describe('GET /api/appointments', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/appointments');
      expect(res.status).toBe(401);
    });

    it('should return appointments list with auth', async () => {
      const res = await request(app).get('/api/appointments').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by date', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app).get(`/api/appointments?date=${today}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/appointments', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app).post('/api/appointments').set('Authorization', `Bearer ${adminToken}`).send({
        patient_id: 'some-id',
      });
      expect(res.status).toBe(400);
    });

    it('should create appointment with valid data', async () => {
      const patientsRes = await request(app).get('/api/patients').set('Authorization', `Bearer ${adminToken}`);
      const patientId = patientsRes.body.patients[0]?.id;

      const doctorLogin = await request(app).post('/api/auth/login').send({ username: 'drpriya', password: 'doctor123' });
      const doctorRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${doctorLogin.body.token}`);
      const doctorId = doctorRes.body.id;

      if (patientId && doctorId) {
        const res = await request(app).post('/api/appointments').set('Authorization', `Bearer ${adminToken}`).send({
          patient_id: patientId,
          doctor_id: doctorId,
          scheduled_date: '2025-12-31',
          scheduled_time: '10:00',
          chief_complaint: 'Test complaint',
        });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.appointment_no).toMatch(/^APT-/);
      }
    });
  });
});

describe('Dashboard API', () => {
  describe('GET /api/dashboard/stats', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(401);
    });

    it('should return dashboard stats with auth', async () => {
      const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('patients_today');
      expect(res.body.stats).toHaveProperty('total_patients');
    });
  });
});

describe('Departments API', () => {
  describe('GET /api/departments', () => {
    it('should return departments list with auth', async () => {
      const res = await request(app).get('/api/departments').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

describe('Health Check', () => {
  describe('GET /api/health', () => {
    it('should return health status without auth', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('database', 'connected');
    });
  });
});