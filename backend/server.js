// ═══════════════════════════════════════════════════════════════════════════════
// MedOS HMS — GOD MODE Backend v3.0
// ALL TABLES · ALL RELATIONSHIPS · FULL ADD/SUBTRACT · EVERY FUNCTION WORKS
// ═══════════════════════════════════════════════════════════════════════════════
const express  = require('express');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path     = require('path');

const app        = express();
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'medos-god-mode-secret-2024';
const ANTHROPIC  = process.env.ANTHROPIC_API_KEY || '';

const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: path.join(__dirname, 'medos.db') },
  useNullAsDefault: true,
});

// ─── Enable SQLite foreign keys ───────────────────────────────────────────────
knex.raw('PRAGMA foreign_keys = ON').then(() => {});

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA — ALL TABLES WITH RELATIONSHIPS
// ══════════════════════════════════════════════════════════════════════════════
async function setupSchema() {
  const has = t => knex.schema.hasTable(t);

  // 1. DEPARTMENTS
  if (!await has('departments')) await knex.schema.createTable('departments', t => {
    t.string('id').primary();
    t.string('name').notNullable();
    t.string('code').unique();
    t.string('type').defaultTo('OPD'); // OPD/IPD/Emergency/Lab/Radiology/Pharmacy
    t.string('location').defaultTo('');
    t.string('phone').defaultTo('');
    t.string('head_doctor_id');        // FK → users
    t.integer('is_active').defaultTo(1);
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 2. USERS
  if (!await has('users')) await knex.schema.createTable('users', t => {
    t.string('id').primary();
    t.string('username').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('role').notNullable();   // admin/doctor/nurse/reception/billing/pharmacist
    t.string('name').notNullable();
    t.string('department_id');        // FK → departments
    t.string('department').defaultTo('');
    t.string('phone').defaultTo('');
    t.string('email').defaultTo('');
    t.string('qualification').defaultTo('');
    t.string('registration_no').defaultTo('');
    t.integer('is_active').defaultTo(1);
    t.datetime('last_login');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 3. PATIENTS
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
    t.string('dpdp_purpose').defaultTo('');
    t.float('total_billed').defaultTo(0);    // running total — updated on invoice
    t.float('total_paid').defaultTo(0);      // running total — updated on payment
    t.float('outstanding').defaultTo(0);     // total_billed - total_paid
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  // 4. APPOINTMENTS
  if (!await has('appointments')) await knex.schema.createTable('appointments', t => {
    t.string('id').primary();
    t.string('appointment_no').unique().notNullable();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('doctor_id').notNullable().references('id').inTable('users');
    t.string('department_id').references('id').inTable('departments');
    t.string('scheduled_date').notNullable();
    t.string('scheduled_time').notNullable();
    t.string('appointment_type').defaultTo('New');  // New/Follow-up/Emergency
    t.string('status').defaultTo('scheduled');      // scheduled/confirmed/waiting/in-progress/completed/cancelled/no-show
    t.string('chief_complaint').defaultTo('');
    t.string('notes').defaultTo('');
    t.string('encounter_id').references('id').inTable('encounters'); // linked after visit
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  // 5. QUEUE
  if (!await has('queue')) await knex.schema.createTable('queue', t => {
    t.string('id').primary();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('appointment_id').references('id').inTable('appointments');
    t.string('token_no').notNullable();
    t.string('department').defaultTo('OPD');
    t.string('doctor_id').references('id').inTable('users');
    t.string('status').defaultTo('waiting'); // waiting/in-progress/completed/cancelled
    t.string('priority').defaultTo('normal'); // normal/urgent/emergency
    t.datetime('called_at');
    t.datetime('completed_at');
    t.string('notes').defaultTo('');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 6. ENCOUNTERS
  if (!await has('encounters')) await knex.schema.createTable('encounters', t => {
    t.string('id').primary();
    t.string('encounter_no').unique().notNullable();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('doctor_id').notNullable().references('id').inTable('users');
    t.string('department_id').references('id').inTable('departments');
    t.string('appointment_id').references('id').inTable('appointments');
    t.string('encounter_type').defaultTo('OPD'); // OPD/IPD/Emergency/Teleconsult
    t.string('chief_complaint').defaultTo('');
    t.text('vitals_json').defaultTo('{}');
    t.text('history').defaultTo('');
    t.text('examination').defaultTo('');
    t.text('ai_note').defaultTo('');
    t.text('icd10_codes').defaultTo('[]');
    t.string('follow_up_date').defaultTo('');
    t.string('status').defaultTo('open'); // open/signed/cancelled
    t.string('signed_by').references('id').inTable('users');
    t.datetime('signed_at');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  // Fix forward reference — appointments.encounter_id added after encounters table
  const hasEncCol = await knex.schema.hasColumn('appointments', 'encounter_id');
  if (!hasEncCol) await knex.schema.table('appointments', t => t.string('encounter_id'));

  // 7. PRESCRIPTIONS
  if (!await has('prescriptions')) await knex.schema.createTable('prescriptions', t => {
    t.string('id').primary();
    t.string('encounter_id').notNullable().references('id').inTable('encounters');
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('medicine_id').references('id').inTable('medicine_catalog'); // linked after catalog added
    t.string('medicine').notNullable();
    t.string('strength').defaultTo('');
    t.string('dosage').defaultTo('');
    t.string('frequency').defaultTo('');
    t.string('duration').defaultTo('');
    t.string('route').defaultTo('Oral');
    t.string('instructions').defaultTo('');
    t.string('status').defaultTo('active'); // active/dispensed/cancelled
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 8. LAB ORDERS
  if (!await has('lab_orders')) await knex.schema.createTable('lab_orders', t => {
    t.string('id').primary();
    t.string('order_no').unique();
    t.string('encounter_id').notNullable().references('id').inTable('encounters');
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('test_name').notNullable();
    t.string('category').defaultTo('Lab'); // Lab/Radiology/Procedure
    t.string('priority').defaultTo('routine'); // routine/urgent/stat
    t.string('status').defaultTo('pending'); // pending/collected/processing/reported/cancelled
    t.text('result').defaultTo('');
    t.string('result_date').defaultTo('');
    t.string('ordered_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 9. MEDICINE CATALOG
  if (!await has('medicine_catalog')) await knex.schema.createTable('medicine_catalog', t => {
    t.string('id').primary();
    t.string('name').notNullable();
    t.string('generic_name').defaultTo('');
    t.string('category').defaultTo('Tablet'); // Tablet/Capsule/Syrup/Injection/Drops/Ointment/Inhaler
    t.string('strength').defaultTo('');
    t.string('unit').defaultTo('Tablet'); // Tablet/ml/mg/gm
    t.string('manufacturer').defaultTo('');
    t.string('hsn_sac').defaultTo('3004');
    t.float('mrp').defaultTo(0);
    t.float('selling_price').defaultTo(0);
    t.float('gst_rate').defaultTo(12);
    t.integer('reorder_level').defaultTo(50);
    t.integer('current_stock').defaultTo(0); // denormalized for fast reads — updated by triggers
    t.integer('is_active').defaultTo(1);
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 10. STOCK BATCHES
  if (!await has('stock_batches')) await knex.schema.createTable('stock_batches', t => {
    t.string('id').primary();
    t.string('medicine_id').notNullable().references('id').inTable('medicine_catalog');
    t.string('batch_no').notNullable();
    t.string('expiry_date').notNullable();
    t.integer('quantity_received').notNullable();
    t.integer('quantity_remaining').notNullable();
    t.float('purchase_price').defaultTo(0);
    t.float('selling_price').defaultTo(0);
    t.string('supplier').defaultTo('');
    t.string('invoice_no').defaultTo('');
    t.string('created_by');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 11. STOCK TRANSACTIONS (ADD / SUBTRACT audit trail)
  if (!await has('stock_transactions')) await knex.schema.createTable('stock_transactions', t => {
    t.string('id').primary();
    t.string('medicine_id').notNullable().references('id').inTable('medicine_catalog');
    t.string('batch_id').references('id').inTable('stock_batches');
    t.string('transaction_type').notNullable(); // purchase/dispense/return_patient/return_supplier/adjustment/expired/opening
    t.integer('quantity').notNullable();        // +ve = ADD stock, -ve = SUBTRACT stock
    t.float('unit_price').defaultTo(0);
    t.float('total_value').defaultTo(0);
    t.string('reference_id').defaultTo('');    // encounter_id / invoice_id / etc
    t.string('reference_type').defaultTo(''); // encounter/invoice/manual
    t.string('notes').defaultTo('');
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 12. DISPENSING RECORDS
  if (!await has('dispensing_records')) await knex.schema.createTable('dispensing_records', t => {
    t.string('id').primary();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('encounter_id').references('id').inTable('encounters');
    t.string('prescription_id').references('id').inTable('prescriptions');
    t.string('medicine_id').notNullable().references('id').inTable('medicine_catalog');
    t.string('batch_id').references('id').inTable('stock_batches');
    t.integer('quantity').notNullable();
    t.float('unit_price').notNullable();
    t.float('gst_rate').defaultTo(12);
    t.float('gst_amount').defaultTo(0);
    t.float('total_amount').notNullable();
    t.string('dispensed_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 13. ROOMS
  if (!await has('rooms')) await knex.schema.createTable('rooms', t => {
    t.string('id').primary();
    t.string('room_no').unique().notNullable();
    t.string('room_type').notNullable(); // General/Semi-Private/Private/ICU/HDU/NICU
    t.string('department_id').references('id').inTable('departments');
    t.integer('beds_total').defaultTo(1);
    t.integer('beds_occupied').defaultTo(0);
    t.float('daily_rate').defaultTo(0);
    t.float('gst_rate').defaultTo(0);
    t.string('floor').defaultTo('');
    t.string('facilities').defaultTo('');
    t.integer('is_active').defaultTo(1);
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 14. ADMISSIONS (IPD)
  if (!await has('admissions')) await knex.schema.createTable('admissions', t => {
    t.string('id').primary();
    t.string('admission_no').unique().notNullable();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('doctor_id').notNullable().references('id').inTable('users');
    t.string('department_id').references('id').inTable('departments');
    t.string('room_id').references('id').inTable('rooms');
    t.string('bed_no').defaultTo('');
    t.string('admission_date').notNullable();
    t.string('discharge_date').defaultTo('');
    t.integer('days_admitted').defaultTo(0);
    t.float('room_charges').defaultTo(0);
    t.string('admission_diagnosis').defaultTo('');
    t.string('discharge_diagnosis').defaultTo('');
    t.text('discharge_summary').defaultTo('');
    t.string('status').defaultTo('admitted'); // admitted/discharged/transferred/ama/expired
    t.string('notes').defaultTo('');
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });

  // 15. CHARGES
  if (!await has('charges')) await knex.schema.createTable('charges', t => {
    t.string('id').primary();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('encounter_id').references('id').inTable('encounters');
    t.string('admission_id').references('id').inTable('admissions');
    t.string('description').notNullable();
    t.string('category').defaultTo('Consultation'); // Consultation/Lab/Radiology/Procedure/Medicine/Room/Nursing/Other
    t.string('hsn_sac').defaultTo('');
    t.float('quantity').defaultTo(1);
    t.float('unit_price').defaultTo(0);
    t.float('amount').notNullable();   // quantity × unit_price
    t.float('discount').defaultTo(0);
    t.float('gst_rate').defaultTo(0);
    t.float('gst_amount').defaultTo(0);
    t.float('total_amount').notNullable(); // amount - discount + gst_amount
    t.string('status').defaultTo('pending'); // pending/invoiced/waived/cancelled
    t.string('invoice_id').references('id').inTable('invoices');
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 16. INVOICES
  if (!await has('invoices')) await knex.schema.createTable('invoices', t => {
    t.string('id').primary();
    t.string('invoice_no').unique().notNullable();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('encounter_id').references('id').inTable('encounters');
    t.string('admission_id').references('id').inTable('admissions');
    t.text('line_items').notNullable();   // JSON array of charges
    t.float('subtotal').notNullable();
    t.float('discount').defaultTo(0);
    t.text('gst_breakup').defaultTo('{}');
    t.float('gst_total').defaultTo(0);
    t.float('total_amount').notNullable();
    t.float('amount_paid').defaultTo(0);     // ADD as payments come in
    t.float('amount_due').notNullable();     // total_amount - amount_paid (SUBTRACT on payment)
    t.string('payment_status').defaultTo('pending'); // pending/partial/paid/cancelled
    t.string('notes').defaultTo('');
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 17. PAYMENTS — ADD/SUBTRACT from patient balance and invoice outstanding
  if (!await has('payments')) await knex.schema.createTable('payments', t => {
    t.string('id').primary();
    t.string('payment_no').unique().notNullable();
    t.string('patient_id').notNullable().references('id').inTable('patients');
    t.string('invoice_id').references('id').inTable('invoices');
    t.float('amount').notNullable();
    t.string('payment_mode').defaultTo('Cash'); // Cash/Card/UPI/Insurance/Cheque/NEFT
    t.string('reference_no').defaultTo('');     // UPI txn ID / card last4 / cheque no
    t.string('bank_name').defaultTo('');
    t.string('status').defaultTo('success');    // success/failed/refunded
    t.float('refund_amount').defaultTo(0);
    t.string('refund_reason').defaultTo('');
    t.string('notes').defaultTo('');
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 18. EXPENSE RECORDS (hospital operational expenses)
  if (!await has('expenses')) await knex.schema.createTable('expenses', t => {
    t.string('id').primary();
    t.string('expense_no').unique().notNullable();
    t.string('category').notNullable(); // Salary/Medicine Purchase/Equipment/Utilities/Maintenance/Other
    t.string('description').notNullable();
    t.string('vendor').defaultTo('');
    t.float('amount').notNullable();
    t.float('gst_amount').defaultTo(0);
    t.float('total_amount').notNullable();
    t.string('payment_mode').defaultTo('Cash');
    t.string('reference_no').defaultTo('');
    t.string('expense_date').notNullable();
    t.string('approved_by').references('id').inTable('users');
    t.string('created_by').references('id').inTable('users');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 19. AUDIT LOG — immutable
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

  console.log('✅ All 19 tables created with relationships');
}

// ══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════════════════════════════════════
async function seed() {
  const cnt = await knex('users').count('id as c').first();
  if (cnt.c > 0) return;

  // Departments
  const depts = [
    { id:uuidv4(), name:'General Medicine',   code:'GM',    type:'OPD' },
    { id:uuidv4(), name:'Cardiology',         code:'CARD',  type:'OPD' },
    { id:uuidv4(), name:'Orthopaedics',       code:'ORTHO', type:'OPD' },
    { id:uuidv4(), name:'Gynaecology',        code:'GYN',   type:'OPD' },
    { id:uuidv4(), name:'Paediatrics',        code:'PAED',  type:'OPD' },
    { id:uuidv4(), name:'Emergency',          code:'EMRG',  type:'Emergency' },
    { id:uuidv4(), name:'Laboratory',         code:'LAB',   type:'Lab' },
    { id:uuidv4(), name:'Radiology',          code:'RAD',   type:'Radiology' },
    { id:uuidv4(), name:'Pharmacy',           code:'PHARM', type:'Pharmacy' },
    { id:uuidv4(), name:'General Ward',       code:'GW',    type:'IPD' },
    { id:uuidv4(), name:'ICU',                code:'ICU',   type:'IPD' },
    { id:uuidv4(), name:'Administration',     code:'ADMIN', type:'Admin' },
  ];
  await knex('departments').insert(depts);
  const deptMap = Object.fromEntries(depts.map(d => [d.code, d.id]));

  // Users
  const users = [
    { u:'admin',      p:'admin123',   r:'admin',      n:'System Admin',         dept:'ADMIN', q:'',          reg:'' },
    { u:'drpriya',    p:'doctor123',  r:'doctor',     n:'Dr. Priya Sharma',     dept:'GM',    q:'MBBS, MD',  reg:'MCI-12345' },
    { u:'drrahul',    p:'doctor123',  r:'doctor',     n:'Dr. Rahul Gupta',      dept:'CARD',  q:'MBBS, DM',  reg:'MCI-23456' },
    { u:'drarjun',    p:'doctor123',  r:'doctor',     n:'Dr. Arjun Mehta',      dept:'ORTHO', q:'MBBS, MS',  reg:'MCI-34567' },
    { u:'nurse1',     p:'nurse123',   r:'nurse',      n:'Anita Singh',          dept:'GM',    q:'B.Sc Nursing', reg:'' },
    { u:'nurse2',     p:'nurse123',   r:'nurse',      n:'Kavita Rao',           dept:'ICU',   q:'B.Sc Nursing', reg:'' },
    { u:'reception1', p:'recep123',   r:'reception',  n:'Rekha Devi',           dept:'ADMIN', q:'',          reg:'' },
    { u:'billing1',   p:'billing123', r:'billing',    n:'Amit Kumar',           dept:'ADMIN', q:'B.Com',     reg:'' },
    { u:'pharma1',    p:'pharma123',  r:'pharmacist', n:'Ravi Sharma',          dept:'PHARM', q:'B.Pharm',   reg:'PCI-56789' },
  ];
  const userIds = {};
  for (const u of users) {
    const id = uuidv4();
    userIds[u.u] = id;
    await knex('users').insert({ id, username:u.u, password_hash:bcrypt.hashSync(u.p,10), role:u.r, name:u.n, department_id:deptMap[u.dept], department:depts.find(d=>d.code===u.dept)?.name||'', qualification:u.q, registration_no:u.reg });
  }

  // Rooms
  const rooms = [
    { id:uuidv4(), room_no:'GW-01', room_type:'General',      dept:'GW',    beds_total:6, daily_rate:800  },
    { id:uuidv4(), room_no:'GW-02', room_type:'General',      dept:'GW',    beds_total:6, daily_rate:800  },
    { id:uuidv4(), room_no:'SP-01', room_type:'Semi-Private', dept:'GW',    beds_total:2, daily_rate:2000 },
    { id:uuidv4(), room_no:'PV-01', room_type:'Private',      dept:'GW',    beds_total:1, daily_rate:4000 },
    { id:uuidv4(), room_no:'PV-02', room_type:'Private',      dept:'GW',    beds_total:1, daily_rate:4000 },
    { id:uuidv4(), room_no:'ICU-01',room_type:'ICU',          dept:'ICU',   beds_total:4, daily_rate:8000 },
  ];
  await knex('rooms').insert(rooms.map(r => ({ id:r.id, room_no:r.room_no, room_type:r.room_type, department_id:deptMap[r.dept], beds_total:r.beds_total, daily_rate:r.daily_rate })));

  // Medicine Catalog
  const meds = [
    { n:'Paracetamol 500mg',  g:'Paracetamol',        cat:'Tablet',  str:'500mg', mrp:2.5,  sp:2.0,  gst:5,  rl:200 },
    { n:'Amoxicillin 500mg',  g:'Amoxicillin',        cat:'Capsule', str:'500mg', mrp:8.0,  sp:6.5,  gst:12, rl:100 },
    { n:'Metformin 500mg',    g:'Metformin',          cat:'Tablet',  str:'500mg', mrp:3.5,  sp:2.8,  gst:12, rl:150 },
    { n:'Amlodipine 5mg',     g:'Amlodipine',         cat:'Tablet',  str:'5mg',   mrp:4.0,  sp:3.2,  gst:12, rl:100 },
    { n:'Pantoprazole 40mg',  g:'Pantoprazole',       cat:'Tablet',  str:'40mg',  mrp:5.5,  sp:4.5,  gst:12, rl:120 },
    { n:'Azithromycin 500mg', g:'Azithromycin',       cat:'Tablet',  str:'500mg', mrp:12.0, sp:10.0, gst:12, rl:80  },
    { n:'Atorvastatin 10mg',  g:'Atorvastatin',       cat:'Tablet',  str:'10mg',  mrp:6.0,  sp:5.0,  gst:12, rl:100 },
    { n:'Ciprofloxacin 500mg',g:'Ciprofloxacin',      cat:'Tablet',  str:'500mg', mrp:9.0,  sp:7.5,  gst:12, rl:90  },
    { n:'ORS Sachet',         g:'Oral Rehydration',   cat:'Sachet',  str:'21.8g', mrp:5.0,  sp:4.0,  gst:5,  rl:200 },
    { n:'Insulin Glargine',   g:'Insulin Glargine',   cat:'Injection',str:'100U/ml',mrp:450,sp:400,  gst:12, rl:30  },
    { n:'NS 500ml IV',        g:'Normal Saline',      cat:'Infusion', str:'0.9%', mrp:55.0, sp:45.0, gst:12, rl:50  },
    { n:'Dolo 650mg',         g:'Paracetamol',        cat:'Tablet',  str:'650mg', mrp:3.0,  sp:2.5,  gst:5,  rl:200 },
  ];
  const medIds = {};
  for (const m of meds) {
    const id = uuidv4();
    medIds[m.n] = id;
    await knex('medicine_catalog').insert({ id, name:m.n, generic_name:m.g, category:m.cat, strength:m.str, mrp:m.mrp, selling_price:m.sp, gst_rate:m.gst, reorder_level:m.rl, current_stock:0, hsn_sac:'3004', created_by:userIds['admin'] });
  }

  // Add opening stock for each medicine
  for (const [name, medId] of Object.entries(medIds)) {
    const med = meds.find(m => m.n === name);
    const qty = med.rl * 3; // 3x reorder level as opening stock
    const batchId = uuidv4();
    await knex('stock_batches').insert({ id:batchId, medicine_id:medId, batch_no:`BATCH-${Math.random().toString(36).slice(2,8).toUpperCase()}`, expiry_date:'2027-12-31', quantity_received:qty, quantity_remaining:qty, purchase_price:med.mrp*0.6, selling_price:med.sp, created_by:userIds['admin'] });
    await knex('stock_transactions').insert({ id:uuidv4(), medicine_id:medId, batch_id:batchId, transaction_type:'opening', quantity:qty, unit_price:med.mrp*0.6, total_value:qty*med.mrp*0.6, notes:'Opening stock', created_by:userIds['admin'] });
    await knex('medicine_catalog').where({ id:medId }).update({ current_stock: qty });
  }

  // Patients
  const patientData = [
    { nm:'Ramesh Kumar',  ag:45, gn:'Male',   ph:'9876543210', bg:'B+',  ct:'Delhi',     consent:1, days:10 },
    { nm:'Sunita Devi',   ag:32, gn:'Female', ph:'9876543211', bg:'O+',  ct:'Noida',     consent:1, days:8  },
    { nm:'Mohan Lal',     ag:67, gn:'Male',   ph:'9876543212', bg:'A+',  ct:'Gurgaon',   consent:0, days:6  },
    { nm:'Priti Singh',   ag:28, gn:'Female', ph:'9876543213', bg:'AB+', ct:'Delhi',     consent:1, days:4  },
    { nm:'Arjun Patel',   ag:52, gn:'Male',   ph:'9876543214', bg:'O-',  ct:'Faridabad', consent:1, days:2  },
    { nm:'Meena Kumari',  ag:39, gn:'Female', ph:'9876543215', bg:'B-',  ct:'Delhi',     consent:1, days:1  },
    { nm:'Vijay Sharma',  ag:58, gn:'Male',   ph:'9876543216', bg:'A+',  ct:'Delhi',     consent:1, days:0  },
    { nm:'Lata Gupta',    ag:44, gn:'Female', ph:'9876543217', bg:'O+',  ct:'Noida',     consent:1, days:0  },
  ];
  const patIds = [];
  for (let i=0;i<patientData.length;i++) {
    const p = patientData[i];
    const id = uuidv4();
    patIds.push(id);
    const dt = new Date(Date.now()-p.days*86400000).toISOString();
    await knex('patients').insert({ id, uhid:`UHID-${String(1001+i).padStart(4,'0')}`, name:p.nm, age:p.ag, gender:p.gn, phone:p.ph, blood_group:p.bg, city:p.ct, dpdp_consent:p.consent, created_by:userIds['admin'], created_at:dt, updated_at:dt });
  }

  // Encounters
  const encData = [
    { pid:patIds[0], cc:'Hypertension follow-up', vitals:'{"bp":"140/90","pulse":"78","temp":"98.4","spo2":"97","weight":"72"}', st:'signed', days:5 },
    { pid:patIds[1], cc:'Fever and cough',         vitals:'{"bp":"120/80","pulse":"92","temp":"101.2","spo2":"98","weight":"58"}', st:'signed', days:3 },
    { pid:patIds[2], cc:'Chest pain evaluation',   vitals:'{"bp":"150/95","pulse":"85","temp":"98.6","spo2":"96","weight":"80"}', st:'open',   days:1 },
    { pid:patIds[3], cc:'Diabetes management',     vitals:'{"bp":"118/76","pulse":"82","temp":"98.2","spo2":"99","weight":"65"}', st:'signed', days:2 },
    { pid:patIds[4], cc:'Back pain',               vitals:'{"bp":"130/85","pulse":"75","temp":"98.4","spo2":"98","weight":"88"}', st:'open',   days:0 },
  ];
  for (let i=0;i<encData.length;i++) {
    const e = encData[i];
    const eid = uuidv4();
    const dt = new Date(Date.now()-e.days*86400000).toISOString();
    const eno = `ENC-${new Date().getFullYear()}-${String(i+1).padStart(5,'0')}`;
    await knex('encounters').insert({ id:eid, encounter_no:eno, patient_id:e.pid, doctor_id:userIds['drpriya'], department_id:deptMap['GM'], chief_complaint:e.cc, vitals_json:e.vitals, status:e.st, signed_by:e.st==='signed'?userIds['drpriya']:null, signed_at:e.st==='signed'?dt:null, created_at:dt, updated_at:dt });
    // Consultation charge
    await knex('charges').insert({ id:uuidv4(), patient_id:e.pid, encounter_id:eid, description:'OPD Consultation', category:'Consultation', hsn_sac:'999312', quantity:1, unit_price:500, amount:500, gst_rate:0, gst_amount:0, total_amount:500, created_by:userIds['admin'] });
  }

  // Sample lab order
  const oId = uuidv4();
  await knex('lab_orders').insert({ id:oId, order_no:'LAB-2024-00001', encounter_id:(await knex('encounters').first()).id, patient_id:patIds[0], test_name:'CBC with ESR', category:'Lab', priority:'routine', ordered_by:userIds['drpriya'] });
  await knex('charges').insert({ id:uuidv4(), patient_id:patIds[0], description:'CBC with ESR', category:'Lab', hsn_sac:'999315', quantity:1, unit_price:350, amount:350, gst_rate:18, gst_amount:63, total_amount:413, created_by:userIds['admin'] });

  // Sample IPD admission
  const admId = uuidv4();
  const roomRow = await knex('rooms').where({ room_no:'PV-01' }).first();
  await knex('admissions').insert({ id:admId, admission_no:'IPD-2024-00001', patient_id:patIds[2], doctor_id:userIds['drrahul'], department_id:deptMap['ICU'], room_id:roomRow.id, bed_no:'B1', admission_date:new Date(Date.now()-3*86400000).toISOString().slice(0,10), admission_diagnosis:'Chest pain — rule out ACS', status:'admitted', created_by:userIds['admin'] });
  await knex('rooms').where({ id:roomRow.id }).update({ beds_occupied: 1 });

  // Sample invoice + payment
  const charges = await knex('charges').where({ patient_id:patIds[0], status:'pending' });
  const sub = charges.reduce((s,c)=>s+c.amount,0);
  const gstT = charges.reduce((s,c)=>s+c.gst_amount,0);
  const tot = sub+gstT;
  const invId = uuidv4();
  await knex('invoices').insert({ id:invId, invoice_no:'INV-2024-00001', patient_id:patIds[0], line_items:JSON.stringify(charges), subtotal:sub, gst_total:gstT, total_amount:tot, amount_paid:0, amount_due:tot, payment_status:'pending', gst_breakup:'{}', created_by:userIds['admin'] });
  await knex('charges').where({ patient_id:patIds[0], status:'pending' }).update({ status:'invoiced', invoice_id:invId });
  await knex('patients').where({ id:patIds[0] }).update({ total_billed:tot, outstanding:tot });

  // Sample payment (partial)
  const pymtAmt = 500;
  await knex('payments').insert({ id:uuidv4(), payment_no:'PMT-2024-00001', patient_id:patIds[0], invoice_id:invId, amount:pymtAmt, payment_mode:'Cash', created_by:userIds['admin'] });
  await knex('invoices').where({ id:invId }).update({ amount_paid:pymtAmt, amount_due:tot-pymtAmt, payment_status:'partial' });
  await knex('patients').where({ id:patIds[0] }).update({ total_paid:pymtAmt, outstanding:tot-pymtAmt });

  // Sample expense
  await knex('expenses').insert({ id:uuidv4(), expense_no:'EXP-2024-00001', category:'Medicine Purchase', description:'Monthly medicine procurement', vendor:'Apollo Pharma', amount:45000, gst_amount:5400, total_amount:50400, payment_mode:'NEFT', expense_date:new Date().toISOString().slice(0,10), created_by:userIds['admin'] });

  console.log('✅ Database seeded with full relational data');
}

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE + HELPERS
// ══════════════════════════════════════════════════════════════════════════════
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials:true }));
app.use(express.json({ limit:'10mb' }));

async function auditLog(userId, username, role, action, entityType, entityId, details) {
  try { await knex('audit_log').insert({ id:uuidv4(), user_id:userId||'', username, user_role:role||'', action, entity_type:entityType||'', entity_id:entityId||'', details:JSON.stringify(details||{}) }); } catch {}
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error:'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error:'Invalid or expired token' }); }
}
function can(...roles) {
  return (req,res,next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error:`Requires role: ${roles.join(' / ')}` });
}

// Recompute patient balance from scratch (call after any financial change)
async function syncPatientBalance(patientId) {
  const [billed] = await knex('invoices').where({ patient_id:patientId }).whereNot({ payment_status:'cancelled' }).sum('total_amount as t');
  const [paid]   = await knex('payments').where({ patient_id:patientId, status:'success' }).sum('amount as t');
  const [refund] = await knex('payments').where({ patient_id:patientId, status:'refunded' }).sum('refund_amount as t');
  const totalBilled = billed.t||0;
  const totalPaid   = (paid.t||0) - (refund.t||0);
  await knex('patients').where({ id:patientId }).update({ total_billed:totalBilled, total_paid:totalPaid, outstanding:totalBilled-totalPaid, updated_at:new Date().toISOString() });
}

// Recompute current stock for a medicine (sum of all transactions)
async function syncMedicineStock(medicineId) {
  const [r] = await knex('stock_transactions').where({ medicine_id:medicineId }).sum('quantity as t');
  const stock = r.t||0;
  await knex('medicine_catalog').where({ id:medicineId }).update({ current_stock: stock });
  return stock;
}

// Generate sequential number
async function nextNo(table, field, prefix) {
  const [r] = await knex(table).count('id as c');
  return `${prefix}${String(Number(r.c)+1).padStart(5,'0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req,res) => {
  const { username, password } = req.body;
  if (!username||!password) return res.status(400).json({ error:'Username and password required' });
  const user = await knex('users').where({ username, is_active:1 }).first();
  if (!user||!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error:'Invalid credentials' });
  await knex('users').where({ id:user.id }).update({ last_login:new Date().toISOString() });
  const token = jwt.sign({ id:user.id, username:user.username, role:user.role, name:user.name, department:user.department }, JWT_SECRET, { expiresIn:'10h' });
  await auditLog(user.id, user.username, user.role, 'LOGIN', 'user', user.id, {});
  res.json({ token, user:{ id:user.id, username:user.username, role:user.role, name:user.name, department:user.department } });
});

app.get('/api/auth/me', auth, async (req,res) => {
  const u = await knex('users').select('id','username','role','name','department','email','phone','qualification','registration_no').where({ id:req.user.id }).first();
  res.json(u||{});
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/dashboard/stats', auth, async (req,res) => {
  const today = new Date().toISOString().slice(0,10);
  const month = new Date().toISOString().slice(0,7);

  const [pToday,pTotal,eToday,eOpen,qWait,pendChg,revToday,revMonth,totalInv,dpdpPend,stockLow,admitted,totalExp,netRev] = await Promise.all([
    knex('patients').whereRaw("substr(created_at,1,10)=?",[today]).count('id as c').first(),
    knex('patients').count('id as c').first(),
    knex('encounters').whereRaw("substr(created_at,1,10)=?",[today]).count('id as c').first(),
    knex('encounters').where({status:'open'}).count('id as c').first(),
    knex('queue').where({status:'waiting'}).whereRaw("substr(created_at,1,10)=?",[today]).count('id as c').first(),
    knex('charges').where({status:'pending'}).sum('total_amount as c').first(),
    knex('invoices').whereRaw("substr(created_at,1,10)=?",[today]).whereIn('payment_status',['paid','partial']).sum('amount_paid as c').first(),
    knex('invoices').whereRaw("substr(created_at,1,7)=?",[month]).whereIn('payment_status',['paid','partial']).sum('amount_paid as c').first(),
    knex('invoices').count('id as c').first(),
    knex('patients').where({dpdp_consent:0}).count('id as c').first(),
    knex('medicine_catalog').whereRaw('current_stock <= reorder_level AND is_active=1').count('id as c').first(),
    knex('admissions').where({status:'admitted'}).count('id as c').first(),
    knex('expenses').whereRaw("substr(created_at,1,7)=?",[month]).sum('total_amount as c').first(),
    knex('invoices').whereRaw("substr(created_at,1,7)=?",[month]).sum('amount_paid as c').first(),
  ]);

  const stats = {
    patients_today:  pToday.c,   total_patients:  pTotal.c,
    encounters_today:eToday.c,   open_encounters: eOpen.c,
    queue_waiting:   qWait.c,    pending_charges: pendChg.c||0,
    revenue_today:   revToday.c||0, revenue_month: revMonth.c||0,
    total_invoices:  totalInv.c,  dpdp_pending:   dpdpPend.c,
    low_stock_items: stockLow.c,  admitted_patients: admitted.c,
    expenses_month:  totalExp.c||0,
    net_revenue_month: (netRev.c||0) - (totalExp.c||0),
  };

  const recent_patients = await knex('patients').select('id','uhid','name','age','gender','phone','blood_group','city','dpdp_consent','outstanding','created_at').orderBy('created_at','desc').limit(6);
  const recent_activity = await knex('audit_log').select('action','entity_type','username','user_role','details','created_at').orderBy('created_at','desc').limit(12);
  const doctors = await knex('users').select('id','name','department','qualification').where({role:'doctor',is_active:1});
  const low_stock = await knex('medicine_catalog').whereRaw('current_stock <= reorder_level AND is_active=1').select('id','name','current_stock','reorder_level','category').limit(8);

  res.json({ stats, recent_patients, recent_activity, doctors, low_stock });
});

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/departments', auth, async (req,res) => {
  res.json(await knex('departments').where({is_active:1}).orderBy('name'));
});
app.post('/api/departments', auth, can('admin'), async (req,res) => {
  const { name,code,type,location,phone } = req.body;
  if (!name) return res.status(400).json({ error:'Name required' });
  const id = uuidv4();
  await knex('departments').insert({ id, name, code:code||name.slice(0,4).toUpperCase(), type:type||'OPD', location:location||'', phone:phone||'' });
  res.status(201).json(await knex('departments').where({id}).first());
});

// ══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/patients', auth, async (req,res) => {
  const { search='', page=1, limit=50 } = req.query;
  let q = knex('patients').orderBy('created_at','desc');
  if (search) q = q.where(b => b.whereILike('name',`%${search}%`).orWhereLike('phone',`%${search}%`).orWhereLike('uhid',`%${search}%`));
  const [{ c:total }] = await q.clone().count('id as c');
  const patients = await q.limit(Number(limit)).offset((Number(page)-1)*Number(limit));
  res.json({ patients, total, page:Number(page) });
});

app.get('/api/patients/:id', auth, async (req,res) => {
  const p = await knex('patients').where({id:req.params.id}).first();
  if (!p) return res.status(404).json({ error:'Patient not found' });
  const [encounters, charges, invoices, payments, admissions, prescriptions] = await Promise.all([
    knex('encounters as e').join('users as u','e.doctor_id','u.id').select('e.*','u.name as doctor_name').where({'e.patient_id':req.params.id}).orderBy('e.created_at','desc').limit(20),
    knex('charges').where({patient_id:req.params.id}).orderBy('created_at','desc').limit(50),
    knex('invoices').where({patient_id:req.params.id}).orderBy('created_at','desc').limit(20),
    knex('payments').where({patient_id:req.params.id}).orderBy('created_at','desc').limit(20),
    knex('admissions as a').join('users as u','a.doctor_id','u.id').leftJoin('rooms as r','a.room_id','r.id').select('a.*','u.name as doctor_name','r.room_no','r.room_type').where({'a.patient_id':req.params.id}).orderBy('a.created_at','desc'),
    knex('prescriptions').where({patient_id:req.params.id}).orderBy('created_at','desc').limit(20),
  ]);
  res.json({ ...p, encounters, charges, invoices, payments, admissions, prescriptions });
});

app.post('/api/patients', auth, can('reception','admin','doctor','nurse'), async (req,res) => {
  const { name,age,gender,dob,phone,email,address,city,state,pincode,blood_group,allergies,abha_id,emergency_contact_name,emergency_contact_phone,insurance_provider,insurance_policy_no,dpdp_consent,dpdp_purpose } = req.body;
  if (!name||!phone) return res.status(400).json({ error:'Name and phone required' });
  const last = await knex('patients').orderBy('created_at','desc').first();
  let num=1001; if (last) { const m=last.uhid.match(/\d+$/); if(m) num=parseInt(m[0])+1; }
  const id=uuidv4(), uhid=`UHID-${String(num).padStart(4,'0')}`;
  await knex('patients').insert({ id,uhid,name,age:age||null,gender:gender||null,dob:dob||'',phone,email:email||'',address:address||'',city:city||'',state:state||'',pincode:pincode||'',blood_group:blood_group||'',allergies:allergies||'',abha_id:abha_id||'',emergency_contact_name:emergency_contact_name||'',emergency_contact_phone:emergency_contact_phone||'',insurance_provider:insurance_provider||'',insurance_policy_no:insurance_policy_no||'',dpdp_consent:dpdp_consent?1:0,dpdp_consent_date:dpdp_consent?new Date().toISOString():'',dpdp_purpose:dpdp_purpose||'',created_by:req.user.id });
  await auditLog(req.user.id,req.user.username,req.user.role,'REGISTER_PATIENT','patient',id,{name,uhid});
  res.status(201).json(await knex('patients').where({id}).first());
});

app.put('/api/patients/:id', auth, can('reception','admin','doctor','nurse'), async (req,res) => {
  const fields=['name','age','gender','dob','phone','email','address','city','state','pincode','blood_group','allergies','abha_id','emergency_contact_name','emergency_contact_phone','insurance_provider','insurance_policy_no','dpdp_consent','dpdp_purpose'];
  const upd={}; fields.forEach(f=>{if(req.body[f]!==undefined)upd[f]=req.body[f];}); if(!Object.keys(upd).length) return res.status(400).json({error:'Nothing to update'});
  upd.updated_at=new Date().toISOString();
  await knex('patients').where({id:req.params.id}).update(upd);
  await auditLog(req.user.id,req.user.username,req.user.role,'UPDATE_PATIENT','patient',req.params.id,upd);
  res.json(await knex('patients').where({id:req.params.id}).first());
});

app.patch('/api/patients/:id/consent', auth, can('reception','admin','nurse'), async (req,res) => {
  const { dpdp_consent, dpdp_purpose } = req.body;
  await knex('patients').where({id:req.params.id}).update({ dpdp_consent:dpdp_consent?1:0, dpdp_consent_date:dpdp_consent?new Date().toISOString():'', dpdp_purpose:dpdp_purpose||'', updated_at:new Date().toISOString() });
  await auditLog(req.user.id,req.user.username,req.user.role,'UPDATE_DPDP_CONSENT','patient',req.params.id,{dpdp_consent});
  res.json({ success:true });
});

app.get('/api/patients/:id/balance', auth, async (req,res) => {
  await syncPatientBalance(req.params.id);
  const p = await knex('patients').select('id','uhid','name','total_billed','total_paid','outstanding').where({id:req.params.id}).first();
  const invoices = await knex('invoices').where({patient_id:req.params.id}).whereNot({payment_status:'cancelled'}).select('id','invoice_no','total_amount','amount_paid','amount_due','payment_status','created_at');
  const payments = await knex('payments').where({patient_id:req.params.id,status:'success'}).select('id','payment_no','amount','payment_mode','reference_no','created_at');
  res.json({ ...p, invoices, payments });
});

// ══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/appointments', auth, async (req,res) => {
  const { date, doctor_id, status, patient_id } = req.query;
  let q = knex('appointments as a').join('patients as p','a.patient_id','p.id').join('users as u','a.doctor_id','u.id').leftJoin('departments as d','a.department_id','d.id').select('a.*','p.name as patient_name','p.uhid','p.phone','u.name as doctor_name','d.name as department_name');
  if (date)       q = q.where('a.scheduled_date', date);
  if (doctor_id)  q = q.where('a.doctor_id', doctor_id);
  if (status)     q = q.where('a.status', status);
  if (patient_id) q = q.where('a.patient_id', patient_id);
  if (req.user.role==='doctor') q = q.where('a.doctor_id', req.user.id);
  res.json(await q.orderBy('a.scheduled_date','asc').orderBy('a.scheduled_time','asc').limit(200));
});

app.post('/api/appointments', auth, can('reception','admin','doctor','nurse'), async (req,res) => {
  const { patient_id,doctor_id,department_id,scheduled_date,scheduled_time,appointment_type,chief_complaint,notes } = req.body;
  if (!patient_id||!doctor_id||!scheduled_date||!scheduled_time) return res.status(400).json({ error:'patient_id, doctor_id, scheduled_date, scheduled_time required' });
  const no = await nextNo('appointments','appointment_no','APT-');
  const id = uuidv4();
  await knex('appointments').insert({ id, appointment_no:no, patient_id, doctor_id, department_id:department_id||null, scheduled_date, scheduled_time, appointment_type:appointment_type||'New', chief_complaint:chief_complaint||'', notes:notes||'', created_by:req.user.id });
  await auditLog(req.user.id,req.user.username,req.user.role,'BOOK_APPOINTMENT','appointment',id,{ patient_id, scheduled_date });
  const row = await knex('appointments as a').join('patients as p','a.patient_id','p.id').join('users as u','a.doctor_id','u.id').select('a.*','p.name as patient_name','p.uhid','u.name as doctor_name').where('a.id',id).first();
  res.status(201).json(row);
});

app.put('/api/appointments/:id', auth, async (req,res) => {
  const { status, notes, scheduled_date, scheduled_time } = req.body;
  const upd = {};
  if (status)         upd.status = status;
  if (notes)          upd.notes  = notes;
  if (scheduled_date) upd.scheduled_date = scheduled_date;
  if (scheduled_time) upd.scheduled_time = scheduled_time;
  upd.updated_at = new Date().toISOString();
  await knex('appointments').where({id:req.params.id}).update(upd);
  res.json(await knex('appointments').where({id:req.params.id}).first());
});

// ══════════════════════════════════════════════════════════════════════════════
// QUEUE
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/queue', auth, async (req,res) => {
  const today = new Date().toISOString().slice(0,10);
  let q = knex('queue as qu').join('patients as p','qu.patient_id','p.id').leftJoin('users as u','qu.doctor_id','u.id').select('qu.*','p.name as patient_name','p.age','p.gender','p.uhid','p.blood_group','u.name as doctor_name').whereRaw("substr(qu.created_at,1,10)=?",[today]);
  if (req.query.status) q = q.where('qu.status', req.query.status);
  res.json(await q.orderByRaw("CASE qu.priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END, qu.created_at ASC"));
});

app.post('/api/queue', auth, can('reception','admin','nurse'), async (req,res) => {
  const { patient_id,department,doctor_id,priority,notes,appointment_id } = req.body;
  if (!patient_id) return res.status(400).json({ error:'patient_id required' });
  const today = new Date().toISOString().slice(0,10);
  const [{ c }] = await knex('queue').whereRaw("substr(created_at,1,10)=?",[today]).count('id as c');
  const token = `T${String(Number(c)+1).padStart(3,'0')}`;
  const id = uuidv4();
  await knex('queue').insert({ id, patient_id, token_no:token, department:department||'OPD', doctor_id:doctor_id||null, priority:priority||'normal', notes:notes||'', appointment_id:appointment_id||null });
  if (appointment_id) await knex('appointments').where({id:appointment_id}).update({ status:'waiting' });
  await auditLog(req.user.id,req.user.username,req.user.role,'ADD_TO_QUEUE','queue',id,{patient_id,token});
  const row = await knex('queue as qu').join('patients as p','qu.patient_id','p.id').select('qu.*','p.name as patient_name','p.uhid').where('qu.id',id).first();
  res.status(201).json(row);
});

app.put('/api/queue/:id', auth, async (req,res) => {
  const { status } = req.body;
  const valid=['waiting','in-progress','completed','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error:'Invalid status' });
  const upd = { status };
  if (status==='in-progress') upd.called_at = new Date().toISOString();
  if (status==='completed')   upd.completed_at = new Date().toISOString();
  await knex('queue').where({id:req.params.id}).update(upd);
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════════════════════
// ENCOUNTERS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/encounters', auth, async (req,res) => {
  const { patient_id, status, date } = req.query;
  let q = knex('encounters as e').join('patients as p','e.patient_id','p.id').join('users as u','e.doctor_id','u.id').leftJoin('departments as d','e.department_id','d.id').select('e.*','p.name as patient_name','p.uhid','p.age','p.gender','u.name as doctor_name','d.name as department_name');
  if (patient_id) q = q.where('e.patient_id',patient_id);
  if (status)     q = q.where('e.status',status);
  if (date)       q = q.whereRaw("substr(e.created_at,1,10)=?",[date]);
  if (req.user.role==='doctor') q = q.where('e.doctor_id',req.user.id);
  res.json(await q.orderBy('e.created_at','desc').limit(100));
});

app.get('/api/encounters/:id', auth, async (req,res) => {
  const e = await knex('encounters as e').join('patients as p','e.patient_id','p.id').join('users as u','e.doctor_id','u.id').leftJoin('departments as d','e.department_id','d.id').select('e.*','p.name as patient_name','p.uhid','p.age','p.gender','p.blood_group','p.allergies','p.phone','u.name as doctor_name','d.name as department_name').where('e.id',req.params.id).first();
  if (!e) return res.status(404).json({ error:'Not found' });
  const [prescriptions, orders] = await Promise.all([
    knex('prescriptions').where({encounter_id:req.params.id}).orderBy('created_at','asc'),
    knex('lab_orders').where({encounter_id:req.params.id}).orderBy('created_at','asc'),
  ]);
  res.json({ ...e, prescriptions, orders });
});

app.post('/api/encounters', auth, can('doctor','nurse','admin'), async (req,res) => {
  const { patient_id, chief_complaint, doctor_id, encounter_type, department_id, appointment_id } = req.body;
  if (!patient_id) return res.status(400).json({ error:'patient_id required' });
  const [{ c }] = await knex('encounters').count('id as c');
  const enc_no = `ENC-${new Date().getFullYear()}-${String(Number(c)+1).padStart(5,'0')}`;
  const did = req.user.role==='doctor' ? req.user.id : (doctor_id||req.user.id);
  const id = uuidv4();
  await knex('encounters').insert({ id, encounter_no:enc_no, patient_id, doctor_id:did, department_id:department_id||null, encounter_type:encounter_type||'OPD', chief_complaint:chief_complaint||'', appointment_id:appointment_id||null });
  if (appointment_id) await knex('appointments').where({id:appointment_id}).update({ status:'in-progress', encounter_id:id });
  await auditLog(req.user.id,req.user.username,req.user.role,'CREATE_ENCOUNTER','encounter',id,{patient_id,enc_no});
  const row = await knex('encounters as e').join('patients as p','e.patient_id','p.id').join('users as u','e.doctor_id','u.id').select('e.*','p.name as patient_name','p.uhid','u.name as doctor_name').where('e.id',id).first();
  res.status(201).json(row);
});

app.put('/api/encounters/:id', auth, can('doctor','nurse','admin'), async (req,res) => {
  const enc = await knex('encounters').where({id:req.params.id}).first();
  if (!enc) return res.status(404).json({ error:'Not found' });
  if (enc.status==='signed') return res.status(400).json({ error:'Cannot edit a signed encounter' });
  const fields=['chief_complaint','vitals_json','history','examination','ai_note','icd10_codes','follow_up_date'];
  const upd={}; fields.forEach(f=>{if(req.body[f]!==undefined)upd[f]=req.body[f];}); if(!Object.keys(upd).length) return res.status(400).json({error:'Nothing to update'});
  upd.updated_at=new Date().toISOString();
  await knex('encounters').where({id:req.params.id}).update(upd);
  await auditLog(req.user.id,req.user.username,req.user.role,'UPDATE_ENCOUNTER','encounter',req.params.id,{fields:Object.keys(upd)});
  res.json(await knex('encounters').where({id:req.params.id}).first());
});

app.post('/api/encounters/:id/sign', auth, can('doctor','admin'), async (req,res) => {
  const enc = await knex('encounters').where({id:req.params.id}).first();
  if (!enc) return res.status(404).json({ error:'Not found' });
  if (enc.status==='signed') return res.status(400).json({ error:'Already signed' });
  const now = new Date().toISOString();
  await knex('encounters').where({id:req.params.id}).update({ status:'signed', signed_by:req.user.id, signed_at:now });
  // Auto-post consultation charge
  await knex('charges').insert({ id:uuidv4(), patient_id:enc.patient_id, encounter_id:enc.id, description:'OPD Consultation Fee', category:'Consultation', hsn_sac:'999312', quantity:1, unit_price:500, amount:500, gst_rate:0, gst_amount:0, total_amount:500, created_by:req.user.id });
  if (enc.appointment_id) await knex('appointments').where({id:enc.appointment_id}).update({status:'completed'});
  await auditLog(req.user.id,req.user.username,req.user.role,'SIGN_ENCOUNTER','encounter',req.params.id,{enc_no:enc.encounter_no});
  res.json({ success:true, signed_at:now });
});

// AI Note
app.post('/api/encounters/:id/ai-note', auth, can('doctor','admin'), async (req,res) => {
  const { transcript, chief_complaint, vitals } = req.body;
  const enc = await knex('encounters').where({id:req.params.id}).first();
  if (!enc) return res.status(404).json({ error:'Not found' });

  if (!ANTHROPIC) {
    const note = `**SUBJECTIVE:**\nChief Complaint: ${chief_complaint||enc.chief_complaint||'As documented'}\nHistory: ${transcript||'History taken during consultation.'}\n\n**OBJECTIVE:**\nVitals: BP ${vitals?.bp||'N/A'} mmHg | Temp ${vitals?.temp||'N/A'}°F | Pulse ${vitals?.pulse||'N/A'}/min | SpO2 ${vitals?.spo2||'N/A'}% | Wt ${vitals?.weight||'N/A'} kg\nGeneral: Conscious, oriented, cooperative. No acute distress.\n\n**ASSESSMENT:**\nClinical impression consistent with presenting complaints.\n\n**PLAN:**\n1. Investigations as ordered\n2. Medications per prescription\n3. Patient counselled — diagnosis, treatment, warning signs\n4. Follow-up as scheduled\n\n*Set ANTHROPIC_API_KEY for AI-generated notes.*`;
    await knex('encounters').where({id:req.params.id}).update({ ai_note:note });
    return res.json({ note, ai_generated:false });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{ method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC,'anthropic-version':'2023-06-01'}, body:JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:1500, messages:[{role:'user',content:`Generate SOAP note.\nCC: ${chief_complaint||enc.chief_complaint}\nVitals: BP ${vitals?.bp||'N/A'} | T ${vitals?.temp||'N/A'}°F | P ${vitals?.pulse||'N/A'} | SpO2 ${vitals?.spo2||'N/A'}% | Wt ${vitals?.weight||'N/A'}kg\nNotes: ${transcript||'None'}\nWrite structured SOAP with **bold** headings. Clinical and concise.`}] }) });
    const d = await r.json();
    const note = d.content[0].text;
    await knex('encounters').where({id:req.params.id}).update({ai_note:note});
    await auditLog(req.user.id,req.user.username,req.user.role,'GENERATE_AI_NOTE','encounter',req.params.id,{});
    res.json({ note, ai_generated:true });
  } catch(err) { res.status(500).json({ error:'AI failed: '+err.message }); }
});

// Prescriptions
app.post('/api/encounters/:id/prescriptions', auth, can('doctor','admin'), async (req,res) => {
  const { medicine, strength, dosage, frequency, duration, route, instructions, medicine_id } = req.body;
  if (!medicine) return res.status(400).json({ error:'medicine required' });
  const enc = await knex('encounters').where({id:req.params.id}).first();
  if (!enc) return res.status(404).json({ error:'Not found' });
  if (enc.status==='signed') return res.status(400).json({ error:'Encounter is signed' });
  const id = uuidv4();
  await knex('prescriptions').insert({ id, encounter_id:req.params.id, patient_id:enc.patient_id, medicine_id:medicine_id||null, medicine, strength:strength||'', dosage:dosage||'', frequency:frequency||'', duration:duration||'', route:route||'Oral', instructions:instructions||'' });
  res.status(201).json(await knex('prescriptions').where({id}).first());
});

app.delete('/api/encounters/:eid/prescriptions/:rxid', auth, can('doctor','admin'), async (req,res) => {
  await knex('prescriptions').where({id:req.params.rxid,encounter_id:req.params.eid}).delete();
  res.json({ success:true });
});

// Lab Orders
app.post('/api/encounters/:id/orders', auth, can('doctor','nurse','admin'), async (req,res) => {
  const { test_name, category, priority } = req.body;
  if (!test_name) return res.status(400).json({ error:'test_name required' });
  const enc = await knex('encounters').where({id:req.params.id}).first();
  if (!enc) return res.status(404).json({ error:'Not found' });
  const [{ c }] = await knex('lab_orders').count('id as c');
  const order_no = `LAB-${new Date().getFullYear()}-${String(Number(c)+1).padStart(5,'0')}`;
  const id = uuidv4();
  await knex('lab_orders').insert({ id, order_no, encounter_id:req.params.id, patient_id:enc.patient_id, test_name, category:category||'Lab', priority:priority||'routine', ordered_by:req.user.id });
  // Auto-post charge with correct HSN and GST
  const rates = { Lab:350, Radiology:900, Procedure:1500 };
  const base = rates[category]||350;
  const gst  = base*0.18;
  await knex('charges').insert({ id:uuidv4(), patient_id:enc.patient_id, encounter_id:req.params.id, description:test_name, category:category||'Lab', hsn_sac:'999315', quantity:1, unit_price:base, amount:base, gst_rate:18, gst_amount:gst, total_amount:base+gst, created_by:req.user.id });
  await auditLog(req.user.id,req.user.username,req.user.role,'CREATE_ORDER','order',id,{test_name,category});
  res.status(201).json(await knex('lab_orders').where({id}).first());
});

app.put('/api/orders/:id/result', auth, can('doctor','nurse','admin'), async (req,res) => {
  const { result, result_date, status } = req.body;
  await knex('lab_orders').where({id:req.params.id}).update({ result:result||'', result_date:result_date||'', status:status||'reported' });
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHARMACY — CATALOG
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/pharmacy/catalog', auth, async (req,res) => {
  const { search='', low_stock } = req.query;
  let q = knex('medicine_catalog').where({is_active:1});
  if (search) q = q.where(b => b.whereILike('name',`%${search}%`).orWhereILike('generic_name',`%${search}%`));
  if (low_stock==='1') q = q.whereRaw('current_stock <= reorder_level');
  res.json(await q.orderBy('name'));
});

app.post('/api/pharmacy/catalog', auth, can('pharmacist','admin'), async (req,res) => {
  const { name,generic_name,category,strength,unit,manufacturer,hsn_sac,mrp,selling_price,gst_rate,reorder_level } = req.body;
  if (!name) return res.status(400).json({ error:'Name required' });
  const id = uuidv4();
  await knex('medicine_catalog').insert({ id, name, generic_name:generic_name||'', category:category||'Tablet', strength:strength||'', unit:unit||'Tablet', manufacturer:manufacturer||'', hsn_sac:hsn_sac||'3004', mrp:mrp||0, selling_price:selling_price||0, gst_rate:gst_rate||12, reorder_level:reorder_level||50, current_stock:0, created_by:req.user.id });
  await auditLog(req.user.id,req.user.username,req.user.role,'ADD_MEDICINE','medicine',id,{name});
  res.status(201).json(await knex('medicine_catalog').where({id}).first());
});

app.put('/api/pharmacy/catalog/:id', auth, can('pharmacist','admin'), async (req,res) => {
  const fields=['name','generic_name','category','strength','unit','manufacturer','hsn_sac','mrp','selling_price','gst_rate','reorder_level','is_active'];
  const upd={}; fields.forEach(f=>{if(req.body[f]!==undefined)upd[f]=req.body[f];});
  if (!Object.keys(upd).length) return res.status(400).json({error:'Nothing to update'});
  await knex('medicine_catalog').where({id:req.params.id}).update(upd);
  res.json(await knex('medicine_catalog').where({id:req.params.id}).first());
});

// ── STOCK — ADD (Purchase / Receive) ─────────────────────────────────────────
app.post('/api/pharmacy/stock/add', auth, can('pharmacist','admin'), async (req,res) => {
  const { medicine_id, batch_no, expiry_date, quantity, purchase_price, selling_price, supplier, invoice_no } = req.body;
  if (!medicine_id||!batch_no||!expiry_date||!quantity) return res.status(400).json({ error:'medicine_id, batch_no, expiry_date, quantity required' });
  if (quantity<=0) return res.status(400).json({ error:'Quantity must be positive' });

  const batchId = uuidv4();
  const sp = selling_price || (await knex('medicine_catalog').where({id:medicine_id}).first())?.selling_price || 0;
  await knex('stock_batches').insert({ id:batchId, medicine_id, batch_no, expiry_date, quantity_received:quantity, quantity_remaining:quantity, purchase_price:purchase_price||0, selling_price:sp, supplier:supplier||'', invoice_no:invoice_no||'', created_by:req.user.id });

  // ADD stock transaction (+ve = ADD)
  await knex('stock_transactions').insert({ id:uuidv4(), medicine_id, batch_id:batchId, transaction_type:'purchase', quantity:+quantity, unit_price:purchase_price||0, total_value:quantity*(purchase_price||0), notes:`Received from ${supplier||'supplier'}`, created_by:req.user.id });

  const newStock = await syncMedicineStock(medicine_id);
  await auditLog(req.user.id,req.user.username,req.user.role,'STOCK_ADD','medicine',medicine_id,{quantity,batch_no,new_stock:newStock});
  const med = await knex('medicine_catalog').where({id:medicine_id}).first();
  res.status(201).json({ success:true, medicine:med, batch_id:batchId, quantity_added:quantity, current_stock:newStock });
});

// ── STOCK — SUBTRACT (Dispense to patient) ───────────────────────────────────
app.post('/api/pharmacy/dispense', auth, can('pharmacist','admin','nurse'), async (req,res) => {
  const { patient_id, encounter_id, prescription_id, medicine_id, quantity } = req.body;
  if (!patient_id||!medicine_id||!quantity) return res.status(400).json({ error:'patient_id, medicine_id, quantity required' });
  if (quantity<=0) return res.status(400).json({ error:'Quantity must be positive' });

  const med = await knex('medicine_catalog').where({id:medicine_id}).first();
  if (!med) return res.status(404).json({ error:'Medicine not found' });
  if (med.current_stock < quantity) return res.status(400).json({ error:`Insufficient stock. Available: ${med.current_stock}` });

  // Get best batch (FEFO — first expiry first out)
  const batch = await knex('stock_batches').where({medicine_id}).where('quantity_remaining','>=',quantity).orderBy('expiry_date','asc').first();
  if (!batch) return res.status(400).json({ error:'No valid batch available' });

  const gstAmt  = quantity * med.selling_price * (med.gst_rate/100);
  const totalAmt = quantity * med.selling_price + gstAmt;

  const id = uuidv4();
  await knex('dispensing_records').insert({ id, patient_id, encounter_id:encounter_id||null, prescription_id:prescription_id||null, medicine_id, batch_id:batch.id, quantity, unit_price:med.selling_price, gst_rate:med.gst_rate, gst_amount:gstAmt, total_amount:totalAmt, dispensed_by:req.user.id });

  // SUBTRACT stock transaction (-ve = SUBTRACT)
  await knex('stock_transactions').insert({ id:uuidv4(), medicine_id, batch_id:batch.id, transaction_type:'dispense', quantity:-quantity, unit_price:med.selling_price, total_value:totalAmt, reference_id:encounter_id||patient_id, reference_type:encounter_id?'encounter':'patient', created_by:req.user.id });
  await knex('stock_batches').where({id:batch.id}).update({ quantity_remaining: batch.quantity_remaining - quantity });

  const newStock = await syncMedicineStock(medicine_id);

  // Auto-post charge for dispensed medicine
  await knex('charges').insert({ id:uuidv4(), patient_id, encounter_id:encounter_id||null, description:`${med.name} x${quantity}`, category:'Medicine', hsn_sac:med.hsn_sac||'3004', quantity, unit_price:med.selling_price, amount:quantity*med.selling_price, gst_rate:med.gst_rate, gst_amount:gstAmt, total_amount:totalAmt, created_by:req.user.id });
  if (prescription_id) await knex('prescriptions').where({id:prescription_id}).update({status:'dispensed'});

  await auditLog(req.user.id,req.user.username,req.user.role,'DISPENSE_MEDICINE','dispense',id,{medicine_id,quantity,patient_id,new_stock:newStock});
  res.status(201).json({ success:true, dispense_id:id, medicine:med.name, quantity_dispensed:quantity, total_charged:totalAmt, current_stock:newStock });
});

// ── STOCK — ADJUSTMENT ────────────────────────────────────────────────────────
app.post('/api/pharmacy/stock/adjust', auth, can('pharmacist','admin'), async (req,res) => {
  const { medicine_id, quantity, reason } = req.body; // quantity: +ve or -ve
  if (!medicine_id||quantity===undefined) return res.status(400).json({ error:'medicine_id and quantity required' });
  const med = await knex('medicine_catalog').where({id:medicine_id}).first();
  if (!med) return res.status(404).json({ error:'Medicine not found' });
  const newStockAfter = med.current_stock + Number(quantity);
  if (newStockAfter < 0) return res.status(400).json({ error:`Adjustment would result in negative stock (${newStockAfter})` });

  await knex('stock_transactions').insert({ id:uuidv4(), medicine_id, transaction_type:'adjustment', quantity:Number(quantity), unit_price:med.selling_price, total_value:Math.abs(quantity)*med.selling_price, notes:reason||'Manual adjustment', created_by:req.user.id });
  const newStock = await syncMedicineStock(medicine_id);
  await auditLog(req.user.id,req.user.username,req.user.role,'STOCK_ADJUST','medicine',medicine_id,{quantity,new_stock:newStock,reason});
  res.json({ success:true, quantity_adjusted:quantity, current_stock:newStock });
});

app.get('/api/pharmacy/stock/:medicine_id', auth, async (req,res) => {
  const med = await knex('medicine_catalog').where({id:req.params.medicine_id}).first();
  if (!med) return res.status(404).json({ error:'Not found' });
  const batches = await knex('stock_batches').where({medicine_id:req.params.medicine_id}).where('quantity_remaining','>',0).orderBy('expiry_date','asc');
  const transactions = await knex('stock_transactions').where({medicine_id:req.params.medicine_id}).orderBy('created_at','desc').limit(30);
  res.json({ ...med, batches, transactions });
});

app.get('/api/pharmacy/dispensing', auth, async (req,res) => {
  const { patient_id, date } = req.query;
  let q = knex('dispensing_records as d').join('medicine_catalog as m','d.medicine_id','m.id').join('patients as p','d.patient_id','p.id').select('d.*','m.name as medicine_name','m.category','p.name as patient_name','p.uhid');
  if (patient_id) q = q.where('d.patient_id',patient_id);
  if (date) q = q.whereRaw("substr(d.created_at,1,10)=?",[date]);
  res.json(await q.orderBy('d.created_at','desc').limit(100));
});

// ══════════════════════════════════════════════════════════════════════════════
// BILLING — CHARGES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/charges', auth, can('billing','admin','doctor'), async (req,res) => {
  const { patient_id, status } = req.query;
  let q = knex('charges as c').join('patients as p','c.patient_id','p.id').select('c.*','p.name as patient_name','p.uhid');
  if (patient_id) q = q.where('c.patient_id',patient_id);
  if (status)     q = q.where('c.status',status);
  res.json(await q.orderBy('c.created_at','desc').limit(200));
});

app.post('/api/charges', auth, can('billing','admin'), async (req,res) => {
  const { patient_id,encounter_id,description,category,hsn_sac,quantity,unit_price,amount,discount,gst_rate } = req.body;
  if (!patient_id||!description||amount==null) return res.status(400).json({ error:'patient_id, description, amount required' });
  if (!hsn_sac) return res.status(400).json({ error:'HSN/SAC required per CBIC Rule 46' });
  const qty  = parseFloat(quantity||1);
  const up   = parseFloat(unit_price||amount);
  const amt  = parseFloat(amount);
  const disc = parseFloat(discount||0);
  const gstR = parseFloat(gst_rate||0);
  const gstA = (amt-disc)*gstR/100;
  const total = amt - disc + gstA;
  const id = uuidv4();
  await knex('charges').insert({ id, patient_id, encounter_id:encounter_id||null, description, category:category||'Other', hsn_sac, quantity:qty, unit_price:up, amount:amt, discount:disc, gst_rate:gstR, gst_amount:gstA, total_amount:total, created_by:req.user.id });
  await auditLog(req.user.id,req.user.username,req.user.role,'CREATE_CHARGE','charge',id,{description,total});
  res.status(201).json(await knex('charges').where({id}).first());
});

app.patch('/api/charges/:id/waive', auth, can('billing','admin'), async (req,res) => {
  await knex('charges').where({id:req.params.id}).update({ status:'waived' });
  await auditLog(req.user.id,req.user.username,req.user.role,'WAIVE_CHARGE','charge',req.params.id,{});
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════════════════════
// BILLING — INVOICES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/invoices', auth, can('billing','admin'), async (req,res) => {
  const { patient_id } = req.query;
  let q = knex('invoices as i').join('patients as p','i.patient_id','p.id').select('i.*','p.name as patient_name','p.uhid');
  if (patient_id) q = q.where('i.patient_id',patient_id);
  res.json(await q.orderBy('i.created_at','desc').limit(100));
});

app.post('/api/invoices', auth, can('billing','admin'), async (req,res) => {
  const { patient_id, charge_ids, discount, payment_mode, notes, encounter_id, admission_id } = req.body;
  if (!patient_id||!charge_ids?.length) return res.status(400).json({ error:'patient_id and charge_ids required' });

  const charges = await knex('charges').whereIn('id',charge_ids).where({patient_id,status:'pending'});
  if (charges.length!==charge_ids.length) return res.status(400).json({ error:'Some charges not found or already invoiced' });
  const noHSN = charges.filter(c=>!c.hsn_sac);
  if (noHSN.length) return res.status(400).json({ error:`Invoice blocked — HSN/SAC missing on: ${noHSN.map(c=>c.description).join(', ')}` });

  const subtotal = charges.reduce((s,c)=>s+c.amount,0);
  const gstTotal = charges.reduce((s,c)=>s+c.gst_amount,0);
  const disc     = parseFloat(discount||0);
  const total    = subtotal + gstTotal - disc;

  const gstBreakup = {};
  charges.forEach(c => {
    const k=`${c.gst_rate}%`;
    if (!gstBreakup[k]) gstBreakup[k]={taxable:0,cgst:0,sgst:0};
    gstBreakup[k].taxable+=c.amount; gstBreakup[k].cgst+=c.gst_amount/2; gstBreakup[k].sgst+=c.gst_amount/2;
  });

  const [{ c:cnt }] = await knex('invoices').count('id as c');
  const inv_no = `INV-${new Date().getFullYear()}-${String(Number(cnt)+1).padStart(5,'0')}`;
  const id = uuidv4();

  await knex('invoices').insert({ id, invoice_no:inv_no, patient_id, encounter_id:encounter_id||null, admission_id:admission_id||null, line_items:JSON.stringify(charges), subtotal, discount:disc, gst_breakup:JSON.stringify(gstBreakup), gst_total:gstTotal, total_amount:total, amount_paid:0, amount_due:total, payment_status:'pending', notes:notes||'', created_by:req.user.id });
  await knex('charges').whereIn('id',charge_ids).update({ status:'invoiced', invoice_id:id });
  await syncPatientBalance(patient_id);

  await auditLog(req.user.id,req.user.username,req.user.role,'CREATE_INVOICE','invoice',id,{inv_no,total,patient_id});
  const inv = await knex('invoices as i').join('patients as p','i.patient_id','p.id').select('i.*','p.name as patient_name','p.uhid','p.phone','p.address').where('i.id',id).first();
  res.status(201).json(inv);
});

app.get('/api/invoices/:id', auth, async (req,res) => {
  const inv = await knex('invoices as i').join('patients as p','i.patient_id','p.id').select('i.*','p.name as patient_name','p.uhid','p.phone','p.address','p.city').where('i.id',req.params.id).first();
  if (!inv) return res.status(404).json({ error:'Not found' });
  const payments = await knex('payments').where({invoice_id:req.params.id}).orderBy('created_at','desc');
  res.json({ ...inv, payments });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS — ADD payment, SUBTRACT from invoice outstanding & patient balance
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/payments', auth, can('billing','admin'), async (req,res) => {
  const { patient_id, date } = req.query;
  let q = knex('payments as py').join('patients as p','py.patient_id','p.id').leftJoin('invoices as i','py.invoice_id','i.id').select('py.*','p.name as patient_name','p.uhid','i.invoice_no');
  if (patient_id) q = q.where('py.patient_id',patient_id);
  if (date) q = q.whereRaw("substr(py.created_at,1,10)=?",[date]);
  res.json(await q.orderBy('py.created_at','desc').limit(200));
});

app.post('/api/payments', auth, can('billing','admin','reception'), async (req,res) => {
  const { patient_id, invoice_id, amount, payment_mode, reference_no, bank_name, notes } = req.body;
  if (!patient_id||!amount||amount<=0) return res.status(400).json({ error:'patient_id and positive amount required' });

  const pat = await knex('patients').where({id:patient_id}).first();
  if (!pat) return res.status(404).json({ error:'Patient not found' });

  let inv = null;
  if (invoice_id) {
    inv = await knex('invoices').where({id:invoice_id}).first();
    if (!inv) return res.status(404).json({ error:'Invoice not found' });
    if (inv.payment_status==='paid') return res.status(400).json({ error:'Invoice already fully paid' });
    if (amount > inv.amount_due) return res.status(400).json({ error:`Payment ₹${amount} exceeds outstanding ₹${inv.amount_due.toFixed(2)}` });
  }

  const [{ c:cnt }] = await knex('payments').count('id as c');
  const pmt_no = `PMT-${new Date().getFullYear()}-${String(Number(cnt)+1).padStart(5,'0')}`;
  const id = uuidv4();

  await knex('payments').insert({ id, payment_no:pmt_no, patient_id, invoice_id:invoice_id||null, amount:parseFloat(amount), payment_mode:payment_mode||'Cash', reference_no:reference_no||'', bank_name:bank_name||'', notes:notes||'', created_by:req.user.id });

  // SUBTRACT from invoice outstanding
  if (inv) {
    const newPaid = inv.amount_paid + parseFloat(amount);
    const newDue  = inv.total_amount - newPaid;
    const newStat = newDue<=0 ? 'paid' : 'partial';
    await knex('invoices').where({id:invoice_id}).update({ amount_paid:newPaid, amount_due:Math.max(0,newDue), payment_status:newStat });
  }

  // Recompute patient balance
  await syncPatientBalance(patient_id);
  const updatedPat = await knex('patients').select('total_billed','total_paid','outstanding').where({id:patient_id}).first();

  await auditLog(req.user.id,req.user.username,req.user.role,'RECORD_PAYMENT','payment',id,{amount,payment_mode,patient_id,pmt_no});
  res.status(201).json({ success:true, payment_no:pmt_no, amount_paid:parseFloat(amount), patient_balance:updatedPat });
});

// REFUND — adds back to outstanding
app.post('/api/payments/:id/refund', auth, can('billing','admin'), async (req,res) => {
  const { refund_amount, reason } = req.body;
  const pmt = await knex('payments').where({id:req.params.id}).first();
  if (!pmt) return res.status(404).json({ error:'Payment not found' });
  if (pmt.status==='refunded') return res.status(400).json({ error:'Already refunded' });
  const amt = parseFloat(refund_amount||pmt.amount);
  if (amt > pmt.amount) return res.status(400).json({ error:'Refund exceeds payment amount' });

  await knex('payments').where({id:req.params.id}).update({ status:'refunded', refund_amount:amt, refund_reason:reason||'' });

  // ADD back to invoice outstanding
  if (pmt.invoice_id) {
    const inv = await knex('invoices').where({id:pmt.invoice_id}).first();
    const newPaid = Math.max(0, inv.amount_paid - amt);
    const newDue  = inv.total_amount - newPaid;
    await knex('invoices').where({id:pmt.invoice_id}).update({ amount_paid:newPaid, amount_due:newDue, payment_status:newDue<=0?'paid':newPaid>0?'partial':'pending' });
  }
  await syncPatientBalance(pmt.patient_id);
  await auditLog(req.user.id,req.user.username,req.user.role,'REFUND_PAYMENT','payment',req.params.id,{refund_amount:amt,reason});
  res.json({ success:true, refund_amount:amt });
});

// ══════════════════════════════════════════════════════════════════════════════
// IPD — ROOMS & ADMISSIONS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/rooms', auth, async (req,res) => {
  const rooms = await knex('rooms as r').leftJoin('departments as d','r.department_id','d.id').select('r.*','d.name as department_name').where({'r.is_active':1}).orderBy('r.room_no');
  res.json(rooms);
});

app.get('/api/admissions', auth, async (req,res) => {
  const { status, patient_id } = req.query;
  let q = knex('admissions as a').join('patients as p','a.patient_id','p.id').join('users as u','a.doctor_id','u.id').leftJoin('rooms as r','a.room_id','r.id').leftJoin('departments as d','a.department_id','d.id').select('a.*','p.name as patient_name','p.uhid','p.phone','p.blood_group','u.name as doctor_name','r.room_no','r.room_type','r.daily_rate','d.name as department_name');
  if (status)     q = q.where('a.status',status);
  if (patient_id) q = q.where('a.patient_id',patient_id);
  res.json(await q.orderBy('a.created_at','desc').limit(100));
});

app.post('/api/admissions', auth, can('doctor','admin','reception'), async (req,res) => {
  const { patient_id, doctor_id, department_id, room_id, bed_no, admission_diagnosis, notes } = req.body;
  if (!patient_id||!doctor_id) return res.status(400).json({ error:'patient_id and doctor_id required' });

  if (room_id) {
    const room = await knex('rooms').where({id:room_id}).first();
    if (room.beds_occupied >= room.beds_total) return res.status(400).json({ error:`Room ${room.room_no} is full (${room.beds_total}/${room.beds_total} beds occupied)` });
    await knex('rooms').where({id:room_id}).increment('beds_occupied',1);
  }

  const [{ c:cnt }] = await knex('admissions').count('id as c');
  const adm_no = `IPD-${new Date().getFullYear()}-${String(Number(cnt)+1).padStart(5,'0')}`;
  const id = uuidv4();
  const today = new Date().toISOString().slice(0,10);
  await knex('admissions').insert({ id, admission_no:adm_no, patient_id, doctor_id, department_id:department_id||null, room_id:room_id||null, bed_no:bed_no||'', admission_date:today, admission_diagnosis:admission_diagnosis||'', notes:notes||'', status:'admitted', created_by:req.user.id });

  // Post daily room charge if room has rate
  if (room_id) {
    const room = await knex('rooms').where({id:room_id}).first();
    if (room.daily_rate>0) {
      await knex('charges').insert({ id:uuidv4(), patient_id, admission_id:id, description:`${room.room_type} Room — Day 1 (${room.room_no})`, category:'Room', hsn_sac:'999272', quantity:1, unit_price:room.daily_rate, amount:room.daily_rate, gst_rate:0, gst_amount:0, total_amount:room.daily_rate, created_by:req.user.id });
    }
  }

  await auditLog(req.user.id,req.user.username,req.user.role,'ADMIT_PATIENT','admission',id,{patient_id,adm_no});
  const row = await knex('admissions as a').join('patients as p','a.patient_id','p.id').join('users as u','a.doctor_id','u.id').leftJoin('rooms as r','a.room_id','r.id').select('a.*','p.name as patient_name','p.uhid','u.name as doctor_name','r.room_no','r.room_type').where('a.id',id).first();
  res.status(201).json(row);
});

app.put('/api/admissions/:id/discharge', auth, can('doctor','admin'), async (req,res) => {
  const { discharge_diagnosis, discharge_summary, notes } = req.body;
  const adm = await knex('admissions').where({id:req.params.id}).first();
  if (!adm) return res.status(404).json({ error:'Not found' });
  if (adm.status==='discharged') return res.status(400).json({ error:'Already discharged' });

  const admDate = new Date(adm.admission_date);
  const now = new Date();
  const days = Math.max(1, Math.ceil((now - admDate) / 86400000));

  // Calculate room charges for remaining days
  if (adm.room_id) {
    const room = await knex('rooms').where({id:adm.room_id}).first();
    if (room&&room.daily_rate>0&&days>1) {
      await knex('charges').insert({ id:uuidv4(), patient_id:adm.patient_id, admission_id:adm.id, description:`${room.room_type} Room — Days 2–${days} (${room.room_no})`, category:'Room', hsn_sac:'999272', quantity:days-1, unit_price:room.daily_rate, amount:(days-1)*room.daily_rate, gst_rate:0, gst_amount:0, total_amount:(days-1)*room.daily_rate, created_by:req.user.id });
    }
    await knex('rooms').where({id:adm.room_id}).decrement('beds_occupied',1);
  }

  await knex('admissions').where({id:req.params.id}).update({ status:'discharged', discharge_date:now.toISOString().slice(0,10), days_admitted:days, discharge_diagnosis:discharge_diagnosis||'', discharge_summary:discharge_summary||'', notes:notes||adm.notes, room_charges:days*(await knex('rooms').where({id:adm.room_id}).first())?.daily_rate||0, updated_at:now.toISOString() });

  await auditLog(req.user.id,req.user.username,req.user.role,'DISCHARGE_PATIENT','admission',req.params.id,{days_admitted:days});
  res.json({ success:true, days_admitted:days });
});

// ══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/expenses', auth, can('admin','billing'), async (req,res) => {
  const { month } = req.query;
  let q = knex('expenses');
  if (month) q = q.whereRaw("substr(expense_date,1,7)=?",[month]);
  res.json(await q.orderBy('created_at','desc').limit(100));
});

app.post('/api/expenses', auth, can('admin','billing'), async (req,res) => {
  const { category, description, vendor, amount, gst_amount, payment_mode, reference_no, expense_date } = req.body;
  if (!category||!description||!amount) return res.status(400).json({ error:'category, description, amount required' });
  const [{ c:cnt }] = await knex('expenses').count('id as c');
  const exp_no = `EXP-${new Date().getFullYear()}-${String(Number(cnt)+1).padStart(5,'0')}`;
  const id = uuidv4();
  const gstA = parseFloat(gst_amount||0);
  await knex('expenses').insert({ id, expense_no:exp_no, category, description, vendor:vendor||'', amount:parseFloat(amount), gst_amount:gstA, total_amount:parseFloat(amount)+gstA, payment_mode:payment_mode||'Cash', reference_no:reference_no||'', expense_date:expense_date||new Date().toISOString().slice(0,10), created_by:req.user.id });
  await auditLog(req.user.id,req.user.username,req.user.role,'ADD_EXPENSE','expense',id,{category,amount});
  res.status(201).json(await knex('expenses').where({id}).first());
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/reports/financial', auth, can('admin','billing'), async (req,res) => {
  const { from, to } = req.query;
  const f = from||new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const t = to||new Date().toISOString().slice(0,10);

  const [revenue, collected, outstanding, expenses, invoiceCount, patientCount, topServices] = await Promise.all([
    knex('invoices').whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).sum('total_amount as t').first(),
    knex('payments').where({status:'success'}).whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).sum('amount as t').first(),
    knex('invoices').whereIn('payment_status',['pending','partial']).sum('amount_due as t').first(),
    knex('expenses').whereRaw("substr(expense_date,1,10)>=? AND substr(expense_date,1,10)<=?",[f,t]).sum('total_amount as t').first(),
    knex('invoices').whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).count('id as c').first(),
    knex('patients').whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).count('id as c').first(),
    knex('charges').whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).groupBy('category').select('category').sum('total_amount as total').orderBy('total','desc').limit(6),
  ]);

  // Daily revenue trend
  const dailyRev = await knex('payments').where({status:'success'}).whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).groupByRaw("substr(created_at,1,10)").select(knex.raw("substr(created_at,1,10) as date")).sum('amount as amount').orderBy('date','asc');

  // Payment mode split
  const payModeSplit = await knex('payments').where({status:'success'}).whereRaw("substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?",[f,t]).groupBy('payment_mode').select('payment_mode').sum('amount as total');

  const grossRevenue   = revenue.t||0;
  const totalCollected = collected.t||0;
  const totalExpenses  = expenses.t||0;
  const netProfit      = totalCollected - totalExpenses;

  res.json({ from:f, to:t, summary:{ gross_revenue:grossRevenue, total_collected:totalCollected, outstanding_dues:outstanding.t||0, total_expenses:totalExpenses, net_profit:netProfit, profit_margin:totalCollected>0?((netProfit/totalCollected)*100).toFixed(1):0, invoice_count:invoiceCount.c, new_patients:patientCount.c }, top_services:topServices, daily_revenue:dailyRev, payment_modes:payModeSplit });
});

app.get('/api/reports/stock', auth, can('admin','pharmacist'), async (req,res) => {
  const [total, lowStock, expiringSoon, outOfStock, totalValue] = await Promise.all([
    knex('medicine_catalog').where({is_active:1}).count('id as c').first(),
    knex('medicine_catalog').whereRaw('current_stock <= reorder_level AND current_stock > 0 AND is_active=1').select('id','name','category','current_stock','reorder_level'),
    knex('stock_batches').where('quantity_remaining','>',0).whereRaw("expiry_date <= date('now','+90 days')").join('medicine_catalog as m','stock_batches.medicine_id','m.id').select('stock_batches.*','m.name as medicine_name','m.category').orderBy('expiry_date','asc'),
    knex('medicine_catalog').where({current_stock:0,is_active:1}).select('id','name','category'),
    knex('stock_batches').where('quantity_remaining','>',0).join('medicine_catalog as m','stock_batches.medicine_id','m.id').sum(knex.raw('stock_batches.quantity_remaining * m.selling_price as t')).first(),
  ]);
  res.json({ total_medicines:total.c, low_stock:lowStock, expiring_soon:expiringSoon, out_of_stock:outOfStock, inventory_value:totalValue.t||0 });
});

// ══════════════════════════════════════════════════════════════════════════════
// ICD-10 SEARCH
// ══════════════════════════════════════════════════════════════════════════════
const ICD10=[
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
  {code:'Z00.0',desc:'General adult medical examination'},
  {code:'Z23',desc:'Encounter for immunization'},
];
app.get('/api/icd10/search', auth, (req,res) => {
  const { q } = req.query;
  if (!q||q.length<2) return res.json([]);
  const s=q.toLowerCase();
  res.json(ICD10.filter(x=>x.code.toLowerCase().includes(s)||x.desc.toLowerCase().includes(s)).slice(0,10));
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — USERS & AUDIT
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/users', auth, can('admin'), async (req,res) => {
  res.json(await knex('users').select('id','username','role','name','department','qualification','registration_no','email','phone','is_active','last_login','created_at').orderBy('created_at','asc'));
});

app.post('/api/users', auth, can('admin'), async (req,res) => {
  const { username,password,role,name,department,department_id,email,phone,qualification,registration_no } = req.body;
  if (!username||!password||!role||!name) return res.status(400).json({ error:'username, password, role, name required' });
  if (await knex('users').where({username}).first()) return res.status(400).json({ error:'Username already taken' });
  const id=uuidv4();
  await knex('users').insert({ id, username, password_hash:bcrypt.hashSync(password,10), role, name, department:department||'', department_id:department_id||null, email:email||'', phone:phone||'', qualification:qualification||'', registration_no:registration_no||'' });
  await auditLog(req.user.id,req.user.username,req.user.role,'CREATE_USER','user',id,{username,role});
  res.status(201).json({ id, username, role, name, department });
});

app.put('/api/users/:id', auth, can('admin'), async (req,res) => {
  const { name,department,department_id,email,phone,qualification,registration_no,is_active } = req.body;
  await knex('users').where({id:req.params.id}).update({ name,department:department||'',department_id:department_id||null,email:email||'',phone:phone||'',qualification:qualification||'',registration_no:registration_no||'',is_active:is_active!==false?1:0 });
  await auditLog(req.user.id,req.user.username,req.user.role,'UPDATE_USER','user',req.params.id,{name});
  res.json({ success:true });
});

app.put('/api/users/:id/password', auth, can('admin'), async (req,res) => {
  const { new_password } = req.body;
  if (!new_password||new_password.length<6) return res.status(400).json({ error:'Password must be at least 6 characters' });
  await knex('users').where({id:req.params.id}).update({ password_hash:bcrypt.hashSync(new_password,10) });
  await auditLog(req.user.id,req.user.username,req.user.role,'CHANGE_PASSWORD','user',req.params.id,{});
  res.json({ success:true });
});

app.get('/api/audit-log', auth, can('admin'), async (req,res) => {
  const { limit=60, offset=0 } = req.query;
  const [{ c:total }] = await knex('audit_log').count('id as c');
  const logs = await knex('audit_log').orderBy('created_at','desc').limit(Number(limit)).offset(Number(offset));
  res.json({ logs, total });
});

app.get('/api/health', async (_,res) => {
  const tables = ['users','patients','encounters','appointments','charges','invoices','payments','medicine_catalog','stock_transactions','admissions','expenses','audit_log'];
  const counts = {};
  for (const t of tables) { const [r] = await knex(t).count('id as c'); counts[t]=r.c; }
  res.json({ status:'ok', version:'3.0-god-mode', db:'medos.db', tables:counts, time:new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════════════════════
setupSchema().then(seed).then(() => {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   🏥  MedOS HMS — GOD MODE Backend v3.0  ║  Port ${PORT}  ║
╠══════════════════════════════════════════════════════════╣
║  19 Tables · All Relationships · Add/Subtract Stock      ║
║  Payments subtract from outstanding · Refunds add back   ║
║  Auto patient balance sync on every transaction          ║
╠══════════════════════════════════════════════════════════╣
║  admin/admin123      drpriya/doctor123   drrahul/doctor123║
║  reception1/recep123 nurse1/nurse123     billing1/billing123║
║  pharma1/pharma123                                       ║
╚══════════════════════════════════════════════════════════╝
`);
  });
}).catch(err => { console.error('❌ Startup failed:', err); process.exit(1); });
