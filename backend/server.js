// ════════════════════════════════════════════════════════════════════════════
// MedOS Hospital Management System — Backend API v2.0
// Node.js + Express + Knex + SQLite (swap to PostgreSQL: change knex config)
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'medos-jwt-secret-2024-CHANGE-IN-PRODUCTION';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// ─── Knex DB (swap client:'sqlite3' → 'pg' and connection string for Postgres)
const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: path.join(__dirname, 'medos.db') },
  useNullAsDefault: true,
});

// ─── Schema Setup ─────────────────────────────────────────────────────────────
async function setupSchema() {
  const has = (t) => knex.schema.hasTable(t);

  if (!await has('users')) await knex.schema.createTable('users', t => {
    t.string('id').primary();
    t.string('username').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('role').notNullable();
    t.string('name').notNullable();
    t.string('department').defaultTo('');
    t.string('phone').defaultTo('');
    t.string('email').defaultTo('');
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
    t.string('address').defaultTo('');
    t.string('city').defaultTo('');
    t.string('blood_group').defaultTo('');
    t.string('allergies').defaultTo('');
    t.string('abha_id').defaultTo('');
    t.integer('dpdp_consent').defaultTo(0);
    t.string('dpdp_consent_date').defaultTo('');
    t.string('dpdp_purpose').defaultTo('');
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  if (!await has('queue')) await knex.schema.createTable('queue', t => {
    t.string('id').primary();
    t.string('patient_id').notNullable();
    t.string('token_no').notNullable();
    t.string('department').defaultTo('OPD');
    t.string('doctor_id');
    t.string('status').defaultTo('waiting');
    t.string('priority').defaultTo('normal');
    t.datetime('wait_start').defaultTo(knex.fn.now());
    t.datetime('called_at');
    t.datetime('completed_at');
    t.string('notes').defaultTo('');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('encounters')) await knex.schema.createTable('encounters', t => {
    t.string('id').primary();
    t.string('encounter_no').unique().notNullable();
    t.string('patient_id').notNullable();
    t.string('doctor_id').notNullable();
    t.string('encounter_type').defaultTo('OPD');
    t.string('chief_complaint').defaultTo('');
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

  if (!await has('prescriptions')) await knex.schema.createTable('prescriptions', t => {
    t.string('id').primary();
    t.string('encounter_id').notNullable();
    t.string('medicine').notNullable();
    t.string('strength').defaultTo('');
    t.string('dosage').defaultTo('');
    t.string('frequency').defaultTo('');
    t.string('duration').defaultTo('');
    t.string('route').defaultTo('Oral');
    t.string('instructions').defaultTo('');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('lab_orders')) await knex.schema.createTable('lab_orders', t => {
    t.string('id').primary();
    t.string('encounter_id').notNullable();
    t.string('patient_id').notNullable();
    t.string('test_name').notNullable();
    t.string('category').defaultTo('Lab');
    t.string('priority').defaultTo('routine');
    t.string('status').defaultTo('pending');
    t.string('ordered_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('charges')) await knex.schema.createTable('charges', t => {
    t.string('id').primary();
    t.string('patient_id').notNullable();
    t.string('encounter_id');
    t.string('description').notNullable();
    t.string('category').defaultTo('Consultation');
    t.string('hsn_sac').defaultTo('');
    t.float('amount').notNullable();
    t.float('gst_rate').defaultTo(0);
    t.float('gst_amount').defaultTo(0);
    t.float('total_amount').notNullable();
    t.string('status').defaultTo('pending');
    t.string('invoice_id');
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  if (!await has('invoices')) await knex.schema.createTable('invoices', t => {
    t.string('id').primary();
    t.string('invoice_no').unique().notNullable();
    t.string('patient_id').notNullable();
    t.text('line_items').notNullable();
    t.float('subtotal').notNullable();
    t.float('discount').defaultTo(0);
    t.text('gst_breakup').defaultTo('{}');
    t.float('gst_total').defaultTo(0);
    t.float('total_amount').notNullable();
    t.string('payment_mode').defaultTo('Cash');
    t.string('payment_status').defaultTo('paid');
    t.string('notes').defaultTo('');
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
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  console.log('✅ Schema ready');
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  const count = await knex('users').count('id as c').first();
  if (count.c > 0) return;

  const users = [
    { username:'admin',      password:'admin123',   role:'admin',     name:'System Admin',       dept:'Administration' },
    { username:'drpriya',    password:'doctor123',  role:'doctor',    name:'Dr. Priya Sharma',   dept:'General Medicine' },
    { username:'drrahul',    password:'doctor123',  role:'doctor',    name:'Dr. Rahul Gupta',    dept:'Cardiology' },
    { username:'nurse1',     password:'nurse123',   role:'nurse',     name:'Anita Singh',        dept:'OPD' },
    { username:'reception1', password:'recep123',   role:'reception', name:'Rekha Devi',         dept:'Front Office' },
    { username:'billing1',   password:'billing123', role:'billing',   name:'Amit Kumar',         dept:'Billing' },
  ];
  for (const u of users) {
    await knex('users').insert({ id:uuidv4(), username:u.username, password_hash:bcrypt.hashSync(u.password,10), role:u.role, name:u.name, department:u.dept });
  }

  const adminId = (await knex('users').where({ username:'admin' }).first()).id;
  const drId    = (await knex('users').where({ username:'drpriya' }).first()).id;

  const patients = [
    { name:'Ramesh Kumar',  age:45, gender:'Male',   phone:'9876543210', bg:'B+',  city:'Delhi',     consent:1, daysAgo:10 },
    { name:'Sunita Devi',   age:32, gender:'Female', phone:'9876543211', bg:'O+',  city:'Noida',     consent:1, daysAgo:8  },
    { name:'Mohan Lal',     age:67, gender:'Male',   phone:'9876543212', bg:'A+',  city:'Gurgaon',   consent:0, daysAgo:6  },
    { name:'Priti Singh',   age:28, gender:'Female', phone:'9876543213', bg:'AB+', city:'Delhi',     consent:1, daysAgo:4  },
    { name:'Arjun Patel',   age:52, gender:'Male',   phone:'9876543214', bg:'O-',  city:'Faridabad', consent:1, daysAgo:2  },
    { name:'Meena Kumari',  age:39, gender:'Female', phone:'9876543215', bg:'B-',  city:'Delhi',     consent:1, daysAgo:1  },
  ];

  const patIds = [];
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    const id = uuidv4();
    patIds.push(id);
    const dt = new Date(Date.now() - p.daysAgo*86400000).toISOString();
    await knex('patients').insert({ id, uhid:`UHID-${String(1001+i).padStart(4,'0')}`, name:p.name, age:p.age, gender:p.gender, phone:p.phone, blood_group:p.bg, city:p.city, dpdp_consent:p.consent, created_by:adminId, created_at:dt, updated_at:dt });
  }

  const encounterData = [
    { pid:patIds[0], cc:'Hypertension follow-up', vitals:'{"bp":"140/90","pulse":"78","temp":"98.4","spo2":"97","weight":"72"}', status:'signed', daysAgo:5 },
    { pid:patIds[1], cc:'Fever and cough',         vitals:'{"bp":"120/80","pulse":"92","temp":"101.2","spo2":"98","weight":"58"}', status:'signed', daysAgo:3 },
    { pid:patIds[2], cc:'Chest pain evaluation',   vitals:'{"bp":"150/95","pulse":"85","temp":"98.6","spo2":"96","weight":"80"}', status:'open',   daysAgo:1 },
  ];

  for (let i = 0; i < encounterData.length; i++) {
    const e = encounterData[i];
    const eid = uuidv4();
    const dt = new Date(Date.now() - e.daysAgo*86400000).toISOString();
    await knex('encounters').insert({ id:eid, encounter_no:`ENC-2024-${String(i+1).padStart(5,'0')}`, patient_id:e.pid, doctor_id:drId, chief_complaint:e.cc, vitals_json:e.vitals, status:e.status, signed_by:e.status==='signed'?drId:null, signed_at:e.status==='signed'?dt:null, created_at:dt, updated_at:dt });
    await knex('charges').insert({ id:uuidv4(), patient_id:e.pid, encounter_id:eid, description:'OPD Consultation', category:'Consultation', hsn_sac:'999312', amount:500, gst_rate:0, gst_amount:0, total_amount:500, created_by:adminId });
  }

  console.log('✅ Database seeded');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));

async function logAction(userId, username, role, action, entityType, entityId, details) {
  try { await knex('audit_log').insert({ id:uuidv4(), user_id:userId||'', username, user_role:role||'', action, entity_type:entityType||'', entity_id:entityId||'', details:JSON.stringify(details||{}) }); } catch {}
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function can(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: `Access denied. Requires: ${roles.join(', ')}` });
    next();
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = await knex('users').where({ username, is_active: 1 }).first();
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  await knex('users').where({ id: user.id }).update({ last_login: new Date().toISOString() });
  const token = jwt.sign({ id:user.id, username:user.username, role:user.role, name:user.name, department:user.department }, JWT_SECRET, { expiresIn:'10h' });
  await logAction(user.id, user.username, user.role, 'LOGIN', 'user', user.id, {});
  res.json({ token, user: { id:user.id, username:user.username, role:user.role, name:user.name, department:user.department } });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const u = await knex('users').select('id','username','role','name','department','email','phone').where({ id: req.user.id }).first();
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  const [pToday, pTotal, eToday, eOpen, qWait, pendChg, revToday, revMonth, totalInv, dpdpPend] = await Promise.all([
    knex('patients').whereRaw("substr(created_at,1,10)=?", [today]).count('id as c').first(),
    knex('patients').count('id as c').first(),
    knex('encounters').whereRaw("substr(created_at,1,10)=?", [today]).count('id as c').first(),
    knex('encounters').where({ status:'open' }).count('id as c').first(),
    knex('queue').where({ status:'waiting' }).whereRaw("substr(created_at,1,10)=?", [today]).count('id as c').first(),
    knex('charges').where({ status:'pending' }).sum('total_amount as c').first(),
    knex('invoices').whereRaw("substr(created_at,1,10)=?", [today]).where({ payment_status:'paid' }).sum('total_amount as c').first(),
    knex('invoices').whereRaw("substr(created_at,1,7)=?", [month]).where({ payment_status:'paid' }).sum('total_amount as c').first(),
    knex('invoices').count('id as c').first(),
    knex('patients').where({ dpdp_consent: 0 }).count('id as c').first(),
  ]);

  const stats = {
    patients_today:   pToday.c, total_patients:  pTotal.c,
    encounters_today: eToday.c, open_encounters: eOpen.c,
    queue_waiting: qWait.c,
    pending_charges: pendChg.c || 0,
    revenue_today:  revToday.c || 0, revenue_month: revMonth.c || 0,
    total_invoices: totalInv.c, dpdp_pending: dpdpPend.c,
  };

  const recent_patients = await knex('patients').select('id','uhid','name','age','gender','phone','blood_group','city','dpdp_consent','created_at').orderBy('created_at','desc').limit(6);
  const recent_activity = await knex('audit_log').select('action','entity_type','username','user_role','details','created_at').orderBy('created_at','desc').limit(12);
  const doctors = await knex('users').select('id','name','department').where({ role:'doctor', is_active:1 });

  res.json({ stats, recent_patients, recent_activity, doctors });
});

// ─── Patients ─────────────────────────────────────────────────────────────────
app.get('/api/patients', auth, async (req, res) => {
  const { search='', page=1, limit=50 } = req.query;
  let q = knex('patients').orderBy('created_at','desc');
  if (search) q = q.where(b => b.whereILike('name',`%${search}%`).orWhereLike('phone',`%${search}%`).orWhereLike('uhid',`%${search}%`));
  const [{ c: total }] = await q.clone().count('id as c');
  const patients = await q.limit(Number(limit)).offset((Number(page)-1)*Number(limit));
  res.json({ patients, total, page: Number(page) });
});

app.get('/api/patients/:id', auth, async (req, res) => {
  const p = await knex('patients').where({ id: req.params.id }).first();
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  const encounters = await knex('encounters as e').join('users as u','e.doctor_id','u.id').select('e.*','u.name as doctor_name').where({ 'e.patient_id': req.params.id }).orderBy('e.created_at','desc');
  const charges = await knex('charges').where({ patient_id: req.params.id }).orderBy('created_at','desc');
  res.json({ ...p, encounters, charges });
});

app.post('/api/patients', auth, can('reception','admin','doctor','nurse'), async (req, res) => {
  const { name, age, gender, dob, phone, email, address, city, blood_group, allergies, abha_id, dpdp_consent, dpdp_purpose } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const last = await knex('patients').orderBy('created_at','desc').first();
  let num = 1001;
  if (last) { const m = last.uhid.match(/\d+$/); if (m) num = parseInt(m[0])+1; }
  const id = uuidv4();
  const uhid = `UHID-${String(num).padStart(4,'0')}`;
  await knex('patients').insert({ id, uhid, name, age:age||null, gender:gender||null, dob:dob||'', phone, email:email||'', address:address||'', city:city||'', blood_group:blood_group||'', allergies:allergies||'', abha_id:abha_id||'', dpdp_consent:dpdp_consent?1:0, dpdp_consent_date:dpdp_consent?new Date().toISOString():'', dpdp_purpose:dpdp_purpose||'', created_by:req.user.id });
  await logAction(req.user.id, req.user.username, req.user.role, 'REGISTER_PATIENT', 'patient', id, { name, uhid });
  res.status(201).json(await knex('patients').where({ id }).first());
});

app.put('/api/patients/:id', auth, can('reception','admin','doctor','nurse'), async (req, res) => {
  const fields = ['name','age','gender','dob','phone','email','address','city','blood_group','allergies','abha_id','dpdp_consent','dpdp_purpose'];
  const upd = {};
  fields.forEach(f => { if (req.body[f] !== undefined) upd[f] = req.body[f]; });
  if (!Object.keys(upd).length) return res.status(400).json({ error: 'Nothing to update' });
  upd.updated_at = new Date().toISOString();
  await knex('patients').where({ id: req.params.id }).update(upd);
  await logAction(req.user.id, req.user.username, req.user.role, 'UPDATE_PATIENT', 'patient', req.params.id, upd);
  res.json(await knex('patients').where({ id: req.params.id }).first());
});

app.patch('/api/patients/:id/consent', auth, can('reception','admin','nurse'), async (req, res) => {
  const { dpdp_consent, dpdp_purpose } = req.body;
  await knex('patients').where({ id: req.params.id }).update({ dpdp_consent:dpdp_consent?1:0, dpdp_consent_date:dpdp_consent?new Date().toISOString():'', dpdp_purpose:dpdp_purpose||'', updated_at:new Date().toISOString() });
  await logAction(req.user.id, req.user.username, req.user.role, 'UPDATE_DPDP_CONSENT', 'patient', req.params.id, { dpdp_consent });
  res.json({ success: true });
});

// ─── Queue ────────────────────────────────────────────────────────────────────
app.get('/api/queue', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  let q = knex('queue as qu').join('patients as p','qu.patient_id','p.id').leftJoin('users as u','qu.doctor_id','u.id')
    .select('qu.*','p.name as patient_name','p.age','p.gender','p.uhid','p.blood_group','u.name as doctor_name')
    .whereRaw("substr(qu.created_at,1,10)=?", [today]);
  if (req.query.status) q = q.where('qu.status', req.query.status);
  const rows = await q.orderByRaw("CASE qu.priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END, qu.created_at ASC");
  res.json(rows);
});

app.post('/api/queue', auth, can('reception','admin','nurse'), async (req, res) => {
  const { patient_id, department, doctor_id, priority, notes } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });
  const today = new Date().toISOString().slice(0,10);
  const [{ c }] = await knex('queue').whereRaw("substr(created_at,1,10)=?", [today]).count('id as c');
  const token = `T${String(Number(c)+1).padStart(3,'0')}`;
  const id = uuidv4();
  await knex('queue').insert({ id, patient_id, token_no:token, department:department||'OPD', doctor_id:doctor_id||null, priority:priority||'normal', notes:notes||'' });
  await logAction(req.user.id, req.user.username, req.user.role, 'ADD_TO_QUEUE', 'queue', id, { patient_id, token });
  const row = await knex('queue as qu').join('patients as p','qu.patient_id','p.id').select('qu.*','p.name as patient_name','p.uhid').where('qu.id', id).first();
  res.status(201).json(row);
});

app.put('/api/queue/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!['waiting','in-progress','completed','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const upd = { status };
  if (status==='in-progress') upd.called_at = new Date().toISOString();
  if (status==='completed')   upd.completed_at = new Date().toISOString();
  await knex('queue').where({ id: req.params.id }).update(upd);
  res.json({ success: true });
});

// ─── Encounters ───────────────────────────────────────────────────────────────
app.get('/api/encounters', auth, async (req, res) => {
  const { patient_id, status, date } = req.query;
  let q = knex('encounters as e').join('patients as p','e.patient_id','p.id').join('users as u','e.doctor_id','u.id')
    .select('e.*','p.name as patient_name','p.uhid','p.age','p.gender','u.name as doctor_name');
  if (patient_id) q = q.where('e.patient_id', patient_id);
  if (status)     q = q.where('e.status', status);
  if (date)       q = q.whereRaw("substr(e.created_at,1,10)=?", [date]);
  if (req.user.role==='doctor') q = q.where('e.doctor_id', req.user.id);
  const rows = await q.orderBy('e.created_at','desc').limit(100);
  res.json(rows);
});

app.get('/api/encounters/:id', auth, async (req, res) => {
  const e = await knex('encounters as e').join('patients as p','e.patient_id','p.id').join('users as u','e.doctor_id','u.id')
    .select('e.*','p.name as patient_name','p.uhid','p.age','p.gender','p.blood_group','p.allergies','p.phone','u.name as doctor_name')
    .where('e.id', req.params.id).first();
  if (!e) return res.status(404).json({ error: 'Not found' });
  const prescriptions = await knex('prescriptions').where({ encounter_id: req.params.id }).orderBy('created_at','asc');
  const orders = await knex('lab_orders').where({ encounter_id: req.params.id }).orderBy('created_at','asc');
  res.json({ ...e, prescriptions, orders });
});

app.post('/api/encounters', auth, can('doctor','nurse','admin'), async (req, res) => {
  const { patient_id, chief_complaint, doctor_id, encounter_type } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });
  const [{ c }] = await knex('encounters').count('id as c');
  const enc_no = `ENC-${new Date().getFullYear()}-${String(Number(c)+1).padStart(5,'0')}`;
  const did = req.user.role==='doctor' ? req.user.id : (doctor_id || req.user.id);
  const id = uuidv4();
  await knex('encounters').insert({ id, encounter_no:enc_no, patient_id, doctor_id:did, encounter_type:encounter_type||'OPD', chief_complaint:chief_complaint||'' });
  await logAction(req.user.id, req.user.username, req.user.role, 'CREATE_ENCOUNTER', 'encounter', id, { patient_id, enc_no });
  const row = await knex('encounters as e').join('patients as p','e.patient_id','p.id').join('users as u','e.doctor_id','u.id')
    .select('e.*','p.name as patient_name','p.uhid','u.name as doctor_name').where('e.id', id).first();
  res.status(201).json(row);
});

app.put('/api/encounters/:id', auth, can('doctor','nurse','admin'), async (req, res) => {
  const enc = await knex('encounters').where({ id: req.params.id }).first();
  if (!enc) return res.status(404).json({ error: 'Not found' });
  if (enc.status==='signed') return res.status(400).json({ error: 'Cannot edit a signed encounter' });
  const fields = ['chief_complaint','vitals_json','history','examination','ai_note','icd10_codes','follow_up_date'];
  const upd = {};
  fields.forEach(f => { if (req.body[f] !== undefined) upd[f] = req.body[f]; });
  if (!Object.keys(upd).length) return res.status(400).json({ error: 'Nothing to update' });
  upd.updated_at = new Date().toISOString();
  await knex('encounters').where({ id: req.params.id }).update(upd);
  await logAction(req.user.id, req.user.username, req.user.role, 'UPDATE_ENCOUNTER', 'encounter', req.params.id, { fields: Object.keys(upd) });
  res.json(await knex('encounters').where({ id: req.params.id }).first());
});

app.post('/api/encounters/:id/sign', auth, can('doctor','admin'), async (req, res) => {
  const enc = await knex('encounters').where({ id: req.params.id }).first();
  if (!enc) return res.status(404).json({ error: 'Not found' });
  if (enc.status==='signed') return res.status(400).json({ error: 'Already signed' });
  const now = new Date().toISOString();
  await knex('encounters').where({ id: req.params.id }).update({ status:'signed', signed_by:req.user.id, signed_at:now });
  await knex('charges').insert({ id:uuidv4(), patient_id:enc.patient_id, encounter_id:enc.id, description:'OPD Consultation Fee', category:'Consultation', hsn_sac:'999312', amount:500, gst_rate:0, gst_amount:0, total_amount:500, created_by:req.user.id });
  await logAction(req.user.id, req.user.username, req.user.role, 'SIGN_ENCOUNTER', 'encounter', req.params.id, { enc_no: enc.encounter_no });
  res.json({ success:true, signed_at: now });
});

// AI Note Generation
app.post('/api/encounters/:id/ai-note', auth, can('doctor','admin'), async (req, res) => {
  const { transcript, chief_complaint, vitals } = req.body;
  const enc = await knex('encounters').where({ id: req.params.id }).first();
  if (!enc) return res.status(404).json({ error: 'Not found' });

  if (!ANTHROPIC_API_KEY) {
    const note = `**SUBJECTIVE:**\nChief Complaint: ${chief_complaint || enc.chief_complaint || 'As per consultation'}\nHistory of Present Illness: Patient presents with the stated complaint. ${transcript || 'History taken during consultation.'}\n\n**OBJECTIVE:**\nVitals: BP ${vitals?.bp||'N/A'} mmHg | Temp ${vitals?.temp||'N/A'}°F | Pulse ${vitals?.pulse||'N/A'}/min | SpO2 ${vitals?.spo2||'N/A'}% | Weight ${vitals?.weight||'N/A'} kg\nGeneral: Patient is conscious, oriented and cooperative. No acute distress noted.\nSystemic Examination: Findings as documented during clinical assessment.\n\n**ASSESSMENT:**\nClinical impression consistent with presenting complaints. Differential diagnoses considered and evaluated.\n\n**PLAN:**\n1. Appropriate investigations ordered as clinically indicated\n2. Medications prescribed per attached prescription sheet\n3. Patient educated regarding diagnosis, treatment plan and warning signs\n4. Follow-up scheduled as appropriate\n\n*Set ANTHROPIC_API_KEY environment variable for real AI-generated notes.*`;
    await knex('encounters').where({ id: req.params.id }).update({ ai_note: note });
    return res.json({ note, ai_generated: false });
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:1500, messages:[{ role:'user', content:`Generate a professional clinical SOAP note.\n\nChief Complaint: ${chief_complaint||enc.chief_complaint||'Not specified'}\nVitals: BP ${vitals?.bp||'N/A'} | Temp ${vitals?.temp||'N/A'}°F | Pulse ${vitals?.pulse||'N/A'}/min | SpO2 ${vitals?.spo2||'N/A'}% | Weight ${vitals?.weight||'N/A'}kg\nClinical Notes: ${transcript||'No additional notes'}\n\nWrite a structured SOAP note using **bold** markdown headings. Be clinical and concise.` }] })
    });
    const data = await resp.json();
    const note = data.content[0].text;
    await knex('encounters').where({ id: req.params.id }).update({ ai_note: note });
    await logAction(req.user.id, req.user.username, req.user.role, 'GENERATE_AI_NOTE', 'encounter', req.params.id, {});
    res.json({ note, ai_generated: true });
  } catch(err) { res.status(500).json({ error: 'AI generation failed: '+err.message }); }
});

// Prescriptions
app.post('/api/encounters/:id/prescriptions', auth, can('doctor','admin'), async (req, res) => {
  const { medicine, strength, dosage, frequency, duration, route, instructions } = req.body;
  if (!medicine) return res.status(400).json({ error: 'medicine required' });
  const enc = await knex('encounters').where({ id: req.params.id }).first();
  if (!enc) return res.status(404).json({ error: 'Not found' });
  if (enc.status==='signed') return res.status(400).json({ error: 'Encounter is signed' });
  const id = uuidv4();
  await knex('prescriptions').insert({ id, encounter_id:req.params.id, medicine, strength:strength||'', dosage:dosage||'', frequency:frequency||'', duration:duration||'', route:route||'Oral', instructions:instructions||'' });
  res.status(201).json(await knex('prescriptions').where({ id }).first());
});

app.delete('/api/encounters/:eid/prescriptions/:rxid', auth, can('doctor','admin'), async (req, res) => {
  await knex('prescriptions').where({ id: req.params.rxid, encounter_id: req.params.eid }).delete();
  res.json({ success: true });
});

// Lab Orders
app.post('/api/encounters/:id/orders', auth, can('doctor','nurse','admin'), async (req, res) => {
  const { test_name, category, priority } = req.body;
  if (!test_name) return res.status(400).json({ error: 'test_name required' });
  const enc = await knex('encounters').where({ id: req.params.id }).first();
  if (!enc) return res.status(404).json({ error: 'Not found' });
  const id = uuidv4();
  await knex('lab_orders').insert({ id, encounter_id:req.params.id, patient_id:enc.patient_id, test_name, category:category||'Lab', priority:priority||'routine', ordered_by:req.user.id });
  const rates = { Lab:350, Radiology:900, Procedure:1500 };
  const base = rates[category]||350;
  const gst = base*0.18;
  await knex('charges').insert({ id:uuidv4(), patient_id:enc.patient_id, encounter_id:req.params.id, description:test_name, category:category||'Lab', hsn_sac:'999315', amount:base, gst_rate:18, gst_amount:gst, total_amount:base+gst, created_by:req.user.id });
  await logAction(req.user.id, req.user.username, req.user.role, 'CREATE_ORDER', 'order', id, { test_name, category });
  res.status(201).json(await knex('lab_orders').where({ id }).first());
});

// ─── Billing ──────────────────────────────────────────────────────────────────
app.get('/api/charges', auth, can('billing','admin','doctor'), async (req, res) => {
  const { patient_id, status } = req.query;
  let q = knex('charges as c').join('patients as p','c.patient_id','p.id').select('c.*','p.name as patient_name','p.uhid');
  if (patient_id) q = q.where('c.patient_id', patient_id);
  if (status)     q = q.where('c.status', status);
  res.json(await q.orderBy('c.created_at','desc').limit(200));
});

app.post('/api/charges', auth, can('billing','admin'), async (req, res) => {
  const { patient_id, encounter_id, description, category, hsn_sac, amount, gst_rate } = req.body;
  if (!patient_id||!description||amount==null) return res.status(400).json({ error: 'patient_id, description, amount required' });
  if (!hsn_sac) return res.status(400).json({ error: 'HSN/SAC code required per CBIC Rule 46' });
  const amt = parseFloat(amount), gstR = parseFloat(gst_rate||0), gstAmt = amt*gstR/100;
  const id = uuidv4();
  await knex('charges').insert({ id, patient_id, encounter_id:encounter_id||null, description, category:category||'Other', hsn_sac, amount:amt, gst_rate:gstR, gst_amount:gstAmt, total_amount:amt+gstAmt, created_by:req.user.id });
  await logAction(req.user.id, req.user.username, req.user.role, 'CREATE_CHARGE', 'charge', id, { description, total:amt+gstAmt });
  res.status(201).json(await knex('charges').where({ id }).first());
});

app.get('/api/invoices', auth, can('billing','admin'), async (req, res) => {
  const { patient_id } = req.query;
  let q = knex('invoices as i').join('patients as p','i.patient_id','p.id').select('i.*','p.name as patient_name','p.uhid');
  if (patient_id) q = q.where('i.patient_id', patient_id);
  res.json(await q.orderBy('i.created_at','desc').limit(100));
});

app.post('/api/invoices', auth, can('billing','admin'), async (req, res) => {
  const { patient_id, charge_ids, discount, payment_mode, notes } = req.body;
  if (!patient_id||!charge_ids?.length) return res.status(400).json({ error: 'patient_id and charge_ids required' });
  const charges = await knex('charges').whereIn('id', charge_ids).where({ patient_id, status:'pending' });
  if (charges.length !== charge_ids.length) return res.status(400).json({ error: 'Some charges not found or already invoiced' });
  const noHSN = charges.filter(c => !c.hsn_sac);
  if (noHSN.length) return res.status(400).json({ error: `Invoice blocked: HSN/SAC missing on: ${noHSN.map(c=>c.description).join(', ')}` });

  const subtotal = charges.reduce((s,c)=>s+c.amount,0);
  const gstTotal = charges.reduce((s,c)=>s+c.gst_amount,0);
  const disc = parseFloat(discount||0);
  const total = subtotal+gstTotal-disc;

  const gstBreakup = {};
  charges.forEach(c => {
    const k = `${c.gst_rate}%`;
    if (!gstBreakup[k]) gstBreakup[k] = { taxable:0, cgst:0, sgst:0 };
    gstBreakup[k].taxable += c.amount;
    gstBreakup[k].cgst += c.gst_amount/2;
    gstBreakup[k].sgst += c.gst_amount/2;
  });

  const [{ c: cnt }] = await knex('invoices').count('id as c');
  const inv_no = `INV-${new Date().getFullYear()}-${String(Number(cnt)+1).padStart(5,'0')}`;
  const id = uuidv4();
  await knex('invoices').insert({ id, invoice_no:inv_no, patient_id, line_items:JSON.stringify(charges), subtotal, discount:disc, gst_breakup:JSON.stringify(gstBreakup), gst_total:gstTotal, total_amount:total, payment_mode:payment_mode||'Cash', notes:notes||'', created_by:req.user.id });
  await knex('charges').whereIn('id', charge_ids).update({ status:'invoiced', invoice_id:id });
  await logAction(req.user.id, req.user.username, req.user.role, 'CREATE_INVOICE', 'invoice', id, { inv_no, total, patient_id });
  const inv = await knex('invoices as i').join('patients as p','i.patient_id','p.id').select('i.*','p.name as patient_name','p.uhid','p.phone','p.address').where('i.id', id).first();
  res.status(201).json(inv);
});

app.get('/api/invoices/:id', auth, async (req, res) => {
  const inv = await knex('invoices as i').join('patients as p','i.patient_id','p.id').select('i.*','p.name as patient_name','p.uhid','p.phone','p.address','p.city').where('i.id', req.params.id).first();
  if (!inv) return res.status(404).json({ error: 'Not found' });
  res.json(inv);
});

// ─── ICD-10 ───────────────────────────────────────────────────────────────────
const ICD10 = [
  {code:'A09',desc:'Diarrhoea and gastroenteritis of presumed infectious origin'},
  {code:'A15.0',desc:'Tuberculosis of lung, confirmed by sputum microscopy'},
  {code:'B34.9',desc:'Viral infection, unspecified'},
  {code:'E11',desc:'Type 2 diabetes mellitus'},
  {code:'E11.9',desc:'Type 2 diabetes mellitus without complications'},
  {code:'E78.5',desc:'Hyperlipidaemia, unspecified'},
  {code:'F32.9',desc:'Major depressive disorder, single episode, unspecified'},
  {code:'G43.9',desc:'Migraine, unspecified'},
  {code:'I10',desc:'Essential (primary) hypertension'},
  {code:'I20.9',desc:'Angina pectoris, unspecified'},
  {code:'I25.1',desc:'Atherosclerotic heart disease of native coronary artery'},
  {code:'I50.9',desc:'Heart failure, unspecified'},
  {code:'J00',desc:'Acute nasopharyngitis (common cold)'},
  {code:'J06.9',desc:'Acute upper respiratory infection, unspecified'},
  {code:'J18.9',desc:'Pneumonia, unspecified organism'},
  {code:'J45.9',desc:'Asthma, unspecified'},
  {code:'K21.0',desc:'Gastro-oesophageal reflux disease with oesophagitis'},
  {code:'K29.7',desc:'Gastritis, unspecified'},
  {code:'K35.9',desc:'Acute appendicitis, unspecified'},
  {code:'L50.9',desc:'Urticaria, unspecified'},
  {code:'M54.5',desc:'Low back pain'},
  {code:'N18.9',desc:'Chronic kidney disease, unspecified stage'},
  {code:'N39.0',desc:'Urinary tract infection, site not specified'},
  {code:'R05',desc:'Cough'},
  {code:'R50.9',desc:'Fever, unspecified'},
  {code:'R51',desc:'Headache'},
  {code:'Z00.0',desc:'General adult medical examination without abnormal findings'},
  {code:'Z23',desc:'Encounter for immunization'},
];
app.get('/api/icd10/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q||q.length<2) return res.json([]);
  const s = q.toLowerCase();
  res.json(ICD10.filter(x=>x.code.toLowerCase().includes(s)||x.desc.toLowerCase().includes(s)).slice(0,10));
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.get('/api/audit-log', auth, can('admin'), async (req, res) => {
  const { limit=60, offset=0 } = req.query;
  const [{ c: total }] = await knex('audit_log').count('id as c');
  const logs = await knex('audit_log').orderBy('created_at','desc').limit(Number(limit)).offset(Number(offset));
  res.json({ logs, total });
});

app.get('/api/users', auth, can('admin'), async (req, res) => {
  res.json(await knex('users').select('id','username','role','name','department','email','phone','is_active','last_login','created_at').orderBy('created_at','asc'));
});

app.post('/api/users', auth, can('admin'), async (req, res) => {
  const { username, password, role, name, department, email, phone } = req.body;
  if (!username||!password||!role||!name) return res.status(400).json({ error: 'username, password, role, name required' });
  if (await knex('users').where({ username }).first()) return res.status(400).json({ error: 'Username taken' });
  const id = uuidv4();
  await knex('users').insert({ id, username, password_hash:bcrypt.hashSync(password,10), role, name, department:department||'', email:email||'', phone:phone||'' });
  await logAction(req.user.id, req.user.username, req.user.role, 'CREATE_USER', 'user', id, { username, role });
  res.status(201).json({ id, username, role, name, department });
});

app.put('/api/users/:id', auth, can('admin'), async (req, res) => {
  const { name, department, email, phone, is_active } = req.body;
  await knex('users').where({ id: req.params.id }).update({ name, department:department||'', email:email||'', phone:phone||'', is_active:is_active!==false?1:0 });
  await logAction(req.user.id, req.user.username, req.user.role, 'UPDATE_USER', 'user', req.params.id, { name });
  res.json({ success: true });
});

app.get('/api/health', (_, res) => res.json({ status:'ok', db:'medos.db (knex+sqlite3)', time:new Date().toISOString() }));

// ─── Start ────────────────────────────────────────────────────────────────────
setupSchema().then(seed).then(() => {
  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   🏥  MedOS HMS Backend  — Port ${PORT}        ║`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  admin/admin123        → Full access          ║`);
    console.log(`║  drpriya/doctor123     → Doctor (OPD)         ║`);
    console.log(`║  reception1/recep123   → Front Office         ║`);
    console.log(`║  nurse1/nurse123       → Nursing              ║`);
    console.log(`║  billing1/billing123   → Billing              ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
  });
}).catch(err => { console.error('Startup failed:', err); process.exit(1); });
