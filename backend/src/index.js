const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'medos-god-mode-secret-2024';

const knexConfig = process.env.DATABASE_URL
  ? {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      searchPath: ['public'],
      pool: { min: 2, max: 10 },
    }
  : {
      client: 'sqlite3',
      connection: { filename: path.join(__dirname, '..', 'medos.db') },
      useNullAsDefault: true,
    };

const knex = require('knex')(knexConfig);

if (!process.env.DATABASE_URL) {
  knex.raw('PRAGMA foreign_keys = ON').then(() => {});
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
  hsts: process.env.NODE_ENV === 'production',
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await knex.raw('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

let schemaSetup = false;
let seeded = false;

async function setupSchema() {
  if (schemaSetup) return;
  schemaSetup = true;

  const has = t => knex.schema.hasTable(t);

  if (!await has('departments')) await knex.schema.createTable('departments', t => {
    t.string('id').primary();
    t.string('name').notNullable();
    t.string('code').unique();
    t.string('type').defaultTo('OPD');
    t.string('location').defaultTo('');
    t.string('phone').defaultTo('');
    t.string('head_doctor_id');
    t.integer('is_active').defaultTo(1);
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('users')) await knex.schema.createTable('users', t => {
    t.string('id').primary();
    t.string('username').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('role').notNullable();
    t.string('name').notNullable();
    t.string('department_id');
    t.string('department').defaultTo('');
    t.string('phone').defaultTo('');
    t.string('email').defaultTo('');
    t.string('qualification').defaultTo('');
    t.string('registration_no').defaultTo('');
    t.integer('is_active').defaultTo(1);
    t.datetime('last_login');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('patients')) await knex.schema.createTable('patients', t => {
    t.string('id').primary();
    t.string('uhid').unique().notNullable();
    t.string('name').notNullable();
    t.integer('age');
    t.string('gender');
    t.string('dob').defaultTo('');
    t.string('phone').notNullable();
    t.string('email').defaultTo('');
    t.text('address').defaultTo('');
    t.string('city').defaultTo('');
    t.string('state').defaultTo('');
    t.string('pincode').defaultTo('');
    t.string('blood_group').defaultTo('');
    t.text('allergies').defaultTo('');
    t.string('abha_id').defaultTo('');
    t.string('emergency_contact_name').defaultTo('');
    t.string('emergency_contact_phone').defaultTo('');
    t.string('insurance_provider').defaultTo('');
    t.string('insurance_policy_no').defaultTo('');
    t.integer('dpdp_consent').defaultTo(0);
    t.string('dpdp_consent_date').defaultTo('');
    t.text('dpdp_purpose').defaultTo('');
    t.float('total_billed').defaultTo(0);
    t.float('total_paid').defaultTo(0);
    t.float('outstanding').defaultTo(0);
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  if (!await has('appointments')) await knex.schema.createTable('appointments', t => {
    t.string('id').primary();
    t.string('appointment_no').unique().notNullable();
    t.string('patient_id').notNullable();
    t.string('doctor_id').notNullable();
    t.string('department_id');
    t.string('scheduled_date').notNullable();
    t.string('scheduled_time').notNullable();
    t.string('appointment_type').defaultTo('New');
    t.string('status').defaultTo('scheduled');
    t.text('chief_complaint').defaultTo('');
    t.text('notes').defaultTo('');
    t.string('encounter_id');
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  if (!await has('encounters')) await knex.schema.createTable('encounters', t => {
    t.string('id').primary();
    t.string('encounter_no').unique().notNullable();
    t.string('patient_id').notNullable();
    t.string('doctor_id').notNullable();
    t.string('department_id');
    t.string('appointment_id');
    t.string('encounter_type').defaultTo('OPD');
    t.text('chief_complaint').defaultTo('');
    t.text('vitals_json').defaultTo('{}');
    t.text('history').defaultTo('');
    t.text('examination').defaultTo('');
    t.text('ai_note').defaultTo('');
    t.text('icd10_codes').defaultTo('[]');
    t.string('follow_up_date').defaultTo('');
    t.string('status').defaultTo('open');
    t.string('signed_by');
    t.datetime('signed_at');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  if (!await has('invoices')) await knex.schema.createTable('invoices', t => {
    t.string('id').primary();
    t.string('invoice_no').unique().notNullable();
    t.string('patient_id').notNullable();
    t.string('encounter_id');
    t.string('admission_id');
    t.text('line_items').notNullable();
    t.float('subtotal').notNullable();
    t.float('discount').defaultTo(0);
    t.text('gst_breakup').defaultTo('{}');
    t.float('gst_total').defaultTo(0);
    t.float('total_amount').notNullable();
    t.float('amount_paid').defaultTo(0);
    t.float('amount_due').notNullable();
    t.string('payment_status').defaultTo('pending');
    t.string('payment_mode').defaultTo('Cash');
    t.text('notes').defaultTo('');
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('payments')) await knex.schema.createTable('payments', t => {
    t.string('id').primary();
    t.string('payment_no').unique().notNullable();
    t.string('patient_id').notNullable();
    t.string('invoice_id');
    t.float('amount').notNullable();
    t.string('payment_mode').defaultTo('Cash');
    t.string('reference_no').defaultTo('');
    t.string('bank_name').defaultTo('');
    t.string('status').defaultTo('success');
    t.float('refund_amount').defaultTo(0);
    t.text('refund_reason').defaultTo('');
    t.text('notes').defaultTo('');
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('audit_log')) await knex.schema.createTable('audit_log', t => {
    t.string('id').primary();
    t.string('user_id').defaultTo('');
    t.string('username').notNullable();
    t.string('user_role').defaultTo('');
    t.string('action').notNullable();
    t.string('entity_type').defaultTo('');
    t.string('entity_id').defaultTo('');
    t.text('details').defaultTo('{}');
    t.string('ip_address').defaultTo('');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  console.log('✅ Database schema initialized');
}

async function seed() {
  const cnt = await knex('users').count('id as c').first();
  if (cnt.c > 0) return;

  const depts = [
    { id: uuidv4(), name: 'General Medicine', code: 'GM', type: 'OPD' },
    { id: uuidv4(), name: 'Cardiology', code: 'CARD', type: 'OPD' },
    { id: uuidv4(), name: 'Administration', code: 'ADMIN', type: 'Admin' },
  ];
  await knex('departments').insert(depts);
  const deptMap = Object.fromEntries(depts.map(d => [d.code, d.id]));

  const users = [
    { u: 'admin', p: 'admin123', r: 'admin', n: 'System Admin', dept: 'ADMIN' },
    { u: 'drpriya', p: 'doctor123', r: 'doctor', n: 'Dr. Priya Sharma', dept: 'GM' },
    { u: 'reception1', p: 'recep123', r: 'reception', n: 'Rekha Devi', dept: 'ADMIN' },
  ];
  for (const u of users) {
    const id = uuidv4();
    await knex('users').insert({ id, username: u.u, password_hash: bcrypt.hashSync(u.p, 10), role: u.r, name: u.n, department_id: deptMap[u.dept], department: depts.find(d => d.code === u.dept)?.name || '' });
  }

  console.log('✅ Database seeded');
}

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.message || reason);
});

['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
  const orig = app[method].bind(app);
  app[method] = (...args) => {
    const wrapped = args.map(fn =>
      (typeof fn === 'function' && fn.constructor.name === 'AsyncFunction')
        ? (req, res, next) => fn(req, res, next).catch(err => {
            console.error(`[${method.toUpperCase()} ${typeof args[0] === 'string' ? args[0] : '?'}]`, err.message);
            if (!res.headersSent) res.status(500).json({ error: err.message });
          })
        : fn
    );
    return orig(...wrapped);
  };
});

async function auditLog(userId, username, role, action, entityType, entityId, details) {
  try { await knex('audit_log').insert({ id: require('uuid').v4(), user_id: userId || '', username, user_role: role || '', action, entity_type: entityType || '', entity_id: entityId || '', details: JSON.stringify(details || {}) }); } catch {}
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = require('jsonwebtoken').verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function can(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: `Requires role: ${roles.join(' / ')}` });
}

async function nextNo(table, field, prefix) {
  const [r] = await knex(table).count('id as c');
  return `${prefix}${String(Number(r.c) + 1).padStart(5, '0')}`;
}

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = await knex('users').where({ username, is_active: 1 }).first();
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  await knex('users').where({ id: user.id }).update({ last_login: new Date().toISOString() });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name, department: user.department }, JWT_SECRET, { expiresIn: '10h' });
  await auditLog(user.id, user.username, user.role, 'LOGIN', 'user', user.id, {});
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, department: user.department } });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const u = await knex('users').select('id', 'username', 'role', 'name', 'department', 'email', 'phone').where({ id: req.user.id }).first();
  res.json(u || {});
});

app.get('/api/departments', auth, async (req, res) => {
  res.json(await knex('departments').where({ is_active: 1 }).orderBy('name'));
});

app.get('/api/patients', auth, async (req, res) => {
  const { search = '', page = 1, limit = 50 } = req.query;
  let q = knex('patients').orderBy('created_at', 'desc');
  if (search) q = q.where(b => b.whereILike('name', `%${search}%`).orWhereLike('phone', `%${search}%`).orWhereLike('uhid', `%${search}%`));
  const [{ c: total }] = await q.clone().count('id as c');
  const patients = await q.limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  res.json({ patients, total, page: Number(page) });
});

app.get('/api/patients/:id', auth, async (req, res) => {
  const p = await knex('patients').where({ id: req.params.id }).first();
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  const [encounters, invoices, payments] = await Promise.all([
    knex('encounters').where({ patient_id: req.params.id }).orderBy('created_at', 'desc').limit(20),
    knex('invoices').where({ patient_id: req.params.id }).orderBy('created_at', 'desc').limit(20),
    knex('payments').where({ patient_id: req.params.id }).orderBy('created_at', 'desc').limit(20),
  ]);
  res.json({ ...p, encounters, invoices, payments });
});

app.post('/api/patients', auth, can('reception', 'admin', 'doctor', 'nurse'), async (req, res) => {
  const { name, age, gender, dob, phone, email, address, city, state, pincode, blood_group, allergies, abha_id, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_policy_no, dpdp_consent, dpdp_purpose } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const [mx] = await knex('patients').select(require('knex').raw("MAX(CAST(REPLACE(uhid,'UHID-','') AS INTEGER)) as maxNum"));
  const num = (mx?.maxNum || 1000) + 1;
  const id = uuidv4(), uhid = `UHID-${String(num).padStart(4, '0')}`;
  await knex('patients').insert({ id, uhid, name, age: age || null, gender: gender || null, dob: dob || '', phone, email: email || '', address: address || '', city: city || '', state: state || '', pincode: pincode || '', blood_group: blood_group || '', allergies: allergies || '', abha_id: abha_id || '', emergency_contact_name: emergency_contact_name || '', emergency_contact_phone: emergency_contact_phone || '', insurance_provider: insurance_provider || '', insurance_policy_no: insurance_policy_no || '', dpdp_consent: dpdp_consent ? 1 : 0, dpdp_consent_date: dpdp_consent ? new Date().toISOString() : '', dpdp_purpose: dpdp_purpose || '', created_by: req.user.id });
  await auditLog(req.user.id, req.user.username, req.user.role, 'REGISTER_PATIENT', 'patient', id, { name, uhid });
  res.status(201).json(await knex('patients').where({ id }).first());
});

app.get('/api/dashboard/stats', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [patientsToday, totalPatients, encountersToday, openEncounters, admitted] = await Promise.all([
    knex('patients').whereRaw("substr(created_at,1,10)=?", [today]).count('id as c').first(),
    knex('patients').count('id as c').first(),
    knex('encounters').whereRaw("substr(created_at,1,10)=?", [today]).count('id as c').first(),
    knex('encounters').where({ status: 'open' }).count('id as c').first(),
    knex('admissions').where({ status: 'admitted' }).count('id as c').first(),
  ]);

  res.json({
    stats: {
      patients_today: patientsToday.c,
      total_patients: totalPatients.c,
      encounters_today: encountersToday.c,
      open_encounters: openEncounters.c,
      admitted_patients: admitted.c,
    },
  });
});

app.get('/api/appointments', auth, async (req, res) => {
  const { date, doctor_id, status } = req.query;
  let q = knex('appointments as a').join('patients as p', 'a.patient_id', 'p.id').join('users as u', 'a.doctor_id', 'u.id').select('a.*', 'p.name as patient_name', 'p.uhid', 'p.phone', 'u.name as doctor_name');
  if (date) q = q.where('a.scheduled_date', date);
  if (doctor_id) q = q.where('a.doctor_id', doctor_id);
  if (status) q = q.where('a.status', status);
  res.json(await q.orderBy('a.scheduled_date', 'asc').orderBy('a.scheduled_time', 'asc').limit(200));
});

app.post('/api/appointments', auth, can('reception', 'admin', 'doctor', 'nurse'), async (req, res) => {
  const { patient_id, doctor_id, department_id, scheduled_date, scheduled_time, appointment_type, chief_complaint, notes } = req.body;
  if (!patient_id || !doctor_id || !scheduled_date || !scheduled_time) return res.status(400).json({ error: 'patient_id, doctor_id, scheduled_date, scheduled_time required' });
  const no = await nextNo('appointments', 'appointment_no', 'APT-');
  const id = uuidv4();
  await knex('appointments').insert({ id, appointment_no: no, patient_id, doctor_id, department_id: department_id || null, scheduled_date, scheduled_time, appointment_type: appointment_type || 'New', chief_complaint: chief_complaint || '', notes: notes || '', created_by: req.user.id });
  await auditLog(req.user.id, req.user.username, req.user.role, 'BOOK_APPOINTMENT', 'appointment', id, { patient_id, scheduled_date });
  res.status(201).json(await knex('appointments').where({ id }).first());
});

app.get('/api/encounters', auth, async (req, res) => {
  const { patient_id, doctor_id, status } = req.query;
  let q = knex('encounters as e').join('patients as p', 'e.patient_id', 'p.id').join('users as u', 'e.doctor_id', 'u.id').select('e.*', 'p.name as patient_name', 'p.uhid', 'u.name as doctor_name');
  if (patient_id) q = q.where('e.patient_id', patient_id);
  if (doctor_id) q = q.where('e.doctor_id', doctor_id);
  if (status) q = q.where('e.status', status);
  res.json(await q.orderBy('e.created_at', 'desc').limit(100));
});

app.get('/api/invoices', auth, async (req, res) => {
  const { patient_id, payment_status } = req.query;
  let q = knex('invoices as i').join('patients as p', 'i.patient_id', 'p.id').select('i.*', 'p.name as patient_name', 'p.uhid');
  if (patient_id) q = q.where('i.patient_id', patient_id);
  if (payment_status) q = q.where('i.payment_status', payment_status);
  res.json(await q.orderBy('i.created_at', 'desc').limit(50));
});

app.post('/api/invoices', auth, can('billing', 'admin'), async (req, res) => {
  const { patient_id, encounter_id, admission_id, line_items } = req.body;
  if (!patient_id || !line_items || !line_items.length) return res.status(400).json({ error: 'patient_id and line_items required' });
  const subtotal = line_items.reduce((s, i) => s + (i.amount || 0), 0);
  const gstTotal = line_items.reduce((s, i) => s + (i.gst_amount || 0), 0);
  const total = subtotal + gstTotal;
  const no = await nextNo('invoices', 'invoice_no', 'INV-');
  const id = uuidv4();
  await knex('invoices').insert({ id, invoice_no: no, patient_id, encounter_id: encounter_id || null, admission_id: admission_id || null, line_items: JSON.stringify(line_items), subtotal, gst_total: gstTotal, total_amount: total, amount_paid: 0, amount_due: total, payment_status: 'pending', created_by: req.user.id });
  for (const item of line_items) {
    await knex('charges').insert({ id: uuidv4(), patient_id, encounter_id: encounter_id || null, description: item.description, category: item.category || 'Other', hsn_sac: item.hsn_sac || '', quantity: item.quantity || 1, unit_price: item.unit_price || 0, amount: item.amount || 0, gst_rate: item.gst_rate || 0, gst_amount: item.gst_amount || 0, total_amount: item.total_amount || 0, status: 'invoiced', invoice_id: id, created_by: req.user.id });
  }
  const [billed] = await knex('invoices').where({ patient_id }).whereNot({ payment_status: 'cancelled' }).sum('total_amount as t');
  const [paid] = await knex('payments').where({ patient_id, status: 'success' }).sum('amount as t');
  await knex('patients').where({ id: patient_id }).update({ total_billed: billed.t || 0, total_paid: paid.t || 0, outstanding: (billed.t || 0) - (paid.t || 0), updated_at: new Date().toISOString() });
  await auditLog(req.user.id, req.user.username, req.user.role, 'CREATE_INVOICE', 'invoice', id, { patient_id, total });
  res.status(201).json(await knex('invoices').where({ id }).first());
});

app.post('/api/payments', auth, can('billing', 'admin'), async (req, res) => {
  const { patient_id, invoice_id, amount, payment_mode, reference_no, bank_name } = req.body;
  if (!patient_id || !amount) return res.status(400).json({ error: 'patient_id and amount required' });
  const no = await nextNo('payments', 'payment_no', 'PMT-');
  const id = uuidv4();
  await knex('payments').insert({ id, payment_no: no, patient_id, invoice_id: invoice_id || null, amount, payment_mode: payment_mode || 'Cash', reference_no: reference_no || '', bank_name: bank_name || '', created_by: req.user.id });
  if (invoice_id) {
    const inv = await knex('invoices').where({ id: invoice_id }).first();
    if (inv) {
      const newPaid = (inv.amount_paid || 0) + amount;
      const newDue = inv.total_amount - newPaid;
      let status = 'pending';
      if (newDue <= 0) status = 'paid';
      else if (newPaid > 0) status = 'partial';
      await knex('invoices').where({ id: invoice_id }).update({ amount_paid: newPaid, amount_due: Math.max(0, newDue), payment_status: status });
    }
  }
  const [billed] = await knex('invoices').where({ patient_id }).whereNot({ payment_status: 'cancelled' }).sum('total_amount as t');
  const [paid] = await knex('payments').where({ patient_id, status: 'success' }).sum('amount as t');
  await knex('patients').where({ id: patient_id }).update({ total_billed: billed.t || 0, total_paid: paid.t || 0, outstanding: (billed.t || 0) - (paid.t || 0), updated_at: new Date().toISOString() });
  await auditLog(req.user.id, req.user.username, req.user.role, 'RECORD_PAYMENT', 'payment', id, { patient_id, amount });
  res.status(201).json(await knex('payments').where({ id }).first());
});

async function init() {
  await setupSchema();
  await seed();
  app.listen(PORT, () => {
    console.log(`🚀 MedOS HMS running on port ${PORT}`);
    console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
  });
}

init();

module.exports = { app, knex };