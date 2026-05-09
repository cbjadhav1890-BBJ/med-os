-- MedOS HMS PostgreSQL Schema
-- Run this script to create all tables in PostgreSQL

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE,
    type VARCHAR(50) DEFAULT 'OPD',
    location VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    head_doctor_id VARCHAR(36),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(36),
    department VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    qualification VARCHAR(255) DEFAULT '',
    registration_no VARCHAR(100) DEFAULT '',
    is_active INTEGER DEFAULT 1,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    uhid VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    dob VARCHAR(20) DEFAULT '',
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    city VARCHAR(100) DEFAULT '',
    state VARCHAR(100) DEFAULT '',
    pincode VARCHAR(20) DEFAULT '',
    blood_group VARCHAR(10) DEFAULT '',
    allergies TEXT DEFAULT '',
    abha_id VARCHAR(50) DEFAULT '',
    emergency_contact_name VARCHAR(255) DEFAULT '',
    emergency_contact_phone VARCHAR(50) DEFAULT '',
    insurance_provider VARCHAR(255) DEFAULT '',
    insurance_policy_no VARCHAR(100) DEFAULT '',
    dpdp_consent INTEGER DEFAULT 0,
    dpdp_consent_date VARCHAR(20) DEFAULT '',
    dpdp_purpose TEXT DEFAULT '',
    total_billed DECIMAL(12,2) DEFAULT 0,
    total_paid DECIMAL(12,2) DEFAULT 0,
    outstanding DECIMAL(12,2) DEFAULT 0,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    appointment_no VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    department_id VARCHAR(36) REFERENCES departments(id),
    scheduled_date VARCHAR(20) NOT NULL,
    scheduled_time VARCHAR(20) NOT NULL,
    appointment_type VARCHAR(20) DEFAULT 'New',
    status VARCHAR(20) DEFAULT 'scheduled',
    chief_complaint TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    encounter_id VARCHAR(36),
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. QUEUE
CREATE TABLE IF NOT EXISTS queue (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    appointment_id VARCHAR(36) REFERENCES appointments(id),
    token_no VARCHAR(20) NOT NULL,
    department VARCHAR(50) DEFAULT 'OPD',
    doctor_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'waiting',
    priority VARCHAR(20) DEFAULT 'normal',
    called_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ENCOUNTERS
CREATE TABLE IF NOT EXISTS encounters (
    id VARCHAR(36) PRIMARY KEY,
    encounter_no VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    department_id VARCHAR(36) REFERENCES departments(id),
    appointment_id VARCHAR(36) REFERENCES appointments(id),
    encounter_type VARCHAR(20) DEFAULT 'OPD',
    chief_complaint TEXT DEFAULT '',
    vitals_json TEXT DEFAULT '{}',
    history TEXT DEFAULT '',
    examination TEXT DEFAULT '',
    ai_note TEXT DEFAULT '',
    icd10_codes TEXT DEFAULT '[]',
    follow_up_date VARCHAR(20) DEFAULT '',
    status VARCHAR(20) DEFAULT 'open',
    signed_by VARCHAR(36) REFERENCES users(id),
    signed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(36) PRIMARY KEY,
    encounter_id VARCHAR(36) NOT NULL REFERENCES encounters(id),
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    medicine_id VARCHAR(36) REFERENCES medicine_catalog(id),
    medicine VARCHAR(255) NOT NULL,
    strength VARCHAR(100) DEFAULT '',
    dosage VARCHAR(100) DEFAULT '',
    frequency VARCHAR(100) DEFAULT '',
    duration VARCHAR(100) DEFAULT '',
    route VARCHAR(50) DEFAULT 'Oral',
    instructions TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. LAB ORDERS
CREATE TABLE IF NOT EXISTS lab_orders (
    id VARCHAR(36) PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE,
    encounter_id VARCHAR(36) NOT NULL REFERENCES encounters(id),
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'Lab',
    priority VARCHAR(20) DEFAULT 'routine',
    status VARCHAR(20) DEFAULT 'pending',
    result TEXT DEFAULT '',
    result_date VARCHAR(20) DEFAULT '',
    ordered_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. MEDICINE CATALOG
CREATE TABLE IF NOT EXISTS medicine_catalog (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) DEFAULT '',
    category VARCHAR(50) DEFAULT 'Tablet',
    strength VARCHAR(100) DEFAULT '',
    unit VARCHAR(50) DEFAULT 'Tablet',
    manufacturer VARCHAR(255) DEFAULT '',
    hsn_sac VARCHAR(20) DEFAULT '3004',
    mrp DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 12,
    reorder_level INTEGER DEFAULT 50,
    current_stock INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. STOCK BATCHES
CREATE TABLE IF NOT EXISTS stock_batches (
    id VARCHAR(36) PRIMARY KEY,
    medicine_id VARCHAR(36) NOT NULL REFERENCES medicine_catalog(id),
    batch_no VARCHAR(50) NOT NULL,
    expiry_date VARCHAR(20) NOT NULL,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    supplier VARCHAR(255) DEFAULT '',
    invoice_no VARCHAR(100) DEFAULT '',
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. STOCK TRANSACTIONS
CREATE TABLE IF NOT EXISTS stock_transactions (
    id VARCHAR(36) PRIMARY KEY,
    medicine_id VARCHAR(36) NOT NULL REFERENCES medicine_catalog(id),
    batch_id VARCHAR(36) REFERENCES stock_batches(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    reference_id VARCHAR(100) DEFAULT '',
    reference_type VARCHAR(50) DEFAULT '',
    notes TEXT DEFAULT '',
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. DISPENSING RECORDS
CREATE TABLE IF NOT EXISTS dispensing_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    encounter_id VARCHAR(36) REFERENCES encounters(id),
    prescription_id VARCHAR(36) REFERENCES prescriptions(id),
    medicine_id VARCHAR(36) NOT NULL REFERENCES medicine_catalog(id),
    batch_id VARCHAR(36) REFERENCES stock_batches(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 12,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    dispensed_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(36) PRIMARY KEY,
    room_no VARCHAR(20) UNIQUE NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    department_id VARCHAR(36) REFERENCES departments(id),
    beds_total INTEGER DEFAULT 1,
    beds_occupied INTEGER DEFAULT 0,
    daily_rate DECIMAL(10,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    floor VARCHAR(20) DEFAULT '',
    facilities TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. ADMISSIONS (IPD)
CREATE TABLE IF NOT EXISTS admissions (
    id VARCHAR(36) PRIMARY KEY,
    admission_no VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    department_id VARCHAR(36) REFERENCES departments(id),
    room_id VARCHAR(36) REFERENCES rooms(id),
    bed_no VARCHAR(20) DEFAULT '',
    admission_date VARCHAR(20) NOT NULL,
    discharge_date VARCHAR(20) DEFAULT '',
    days_admitted INTEGER DEFAULT 0,
    room_charges DECIMAL(10,2) DEFAULT 0,
    admission_diagnosis TEXT DEFAULT '',
    discharge_diagnosis TEXT DEFAULT '',
    discharge_summary TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'admitted',
    notes TEXT DEFAULT '',
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. CHARGES
CREATE TABLE IF NOT EXISTS charges (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    encounter_id VARCHAR(36) REFERENCES encounters(id),
    admission_id VARCHAR(36) REFERENCES admissions(id),
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'Consultation',
    hsn_sac VARCHAR(20) DEFAULT '',
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    invoice_id VARCHAR(36) REFERENCES invoices(id),
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    encounter_id VARCHAR(36) REFERENCES encounters(id),
    admission_id VARCHAR(36) REFERENCES admissions(id),
    line_items TEXT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    gst_breakup TEXT DEFAULT '{}',
    gst_total DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_mode VARCHAR(20) DEFAULT 'Cash',
    notes TEXT DEFAULT '',
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    payment_no VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    invoice_id VARCHAR(36) REFERENCES invoices(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'Cash',
    reference_no VARCHAR(100) DEFAULT '',
    bank_name VARCHAR(100) DEFAULT '',
    status VARCHAR(20) DEFAULT 'success',
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_reason TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. EXPENSE RECORDS
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    expense_no VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    vendor VARCHAR(255) DEFAULT '',
    amount DECIMAL(12,2) NOT NULL,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'Cash',
    reference_no VARCHAR(100) DEFAULT '',
    expense_date VARCHAR(20) NOT NULL,
    approved_by VARCHAR(36) REFERENCES users(id),
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) DEFAULT '',
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) DEFAULT '',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT '',
    entity_id VARCHAR(36) DEFAULT '',
    details TEXT DEFAULT '{}',
    ip_address VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT DEFAULT '',
    updated_by VARCHAR(36) REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for appointments.encounter_id
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(36) REFERENCES encounters(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor ON encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_stock_medicine ON stock_transactions(medicine_id);