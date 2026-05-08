# MedOS v3.0 - Hospital Management System
## Comprehensive Project Skills Document

---

## 1. PROJECT OVERVIEW

**MedOS** is an enterprise-grade Hospital Management System built with modern full-stack technologies:
- **Full Stack**: Node.js/Express (backend) + React/Vite (frontend)
- **State Management**: Zustand + localStorage
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT-based stateless auth with Bcrypt
- **AI Integration**: Anthropic Claude API for SOAP note generation
- **File Format**: Single-file application with multi-module architecture

### Core Purpose
A comprehensive HMS managing:
- **OPD (Out-Patient Department)**: Patient encounters, consultations
- **IPD (In-Patient Department)**: Hospital admissions, room management
- **Pharmacy**: Medicine inventory, FEFO dispensing algorithm
- **Billing**: Invoice generation, payment tracking, GST calculations
- **Reports**: Analytics, financial reports, inventory tracking

---

## 2. TECHNOLOGY STACK & ARCHITECTURE

### Backend Stack
```
Framework:     Express.js 4.18.2
Database ORM:  Knex.js 3.1.0 (Query builder)
Database:      SQLite3 5.1.7 / PostgreSQL 8.20.0
Auth:          jsonwebtoken 9.0.2, bcryptjs 2.4.3
File Upload:   multer 2.1.1
PDF Parsing:   pdf-parse 1.1.1
API Client:    Anthropic SDK (Claude Haiku)
ID Generation: uuid 9.0.0
Middleware:   Express-rate-limit (implicit via code)
```

### Frontend Stack
```
Framework:     React 18.2.0
Build Tool:    Vite 5.1.3
Router:        React Router DOM 6.22.0
State:         Zustand 4.5.0 + persist middleware
HTTP Client:   Axios 1.6.7
Styling:       Plain CSS with CSS custom properties
```

### Key Architectural Decisions
- **Monolithic Backend**: All logic in single `server.js` (1700+ lines)
- **Stateless Authentication**: JWT tokens valid for 10 hours
- **Real-time Sync**: Auto-sync mechanisms for patient balances & medicine stock
- **Role-Based Access Control (RBAC)**: 6+ role types with granular permissions
- **API-First Design**: Frontend consumes RESTful JSON APIs

---

## 3. DATABASE SCHEMA (19 CORE ENTITIES)

### Entity Relationship Overview

#### Core Patient Management
1. **patients**
   - `id` (UUID, PK) | `uhid` (auto-increment) | `name` | `age` | `gender` | `blood_group`
   - `phone` | `city` | `email` | `dpdp_consent` (GDPR) | `outstanding` (auto-calc)
   - Critical: `outstanding` balance syncs on every financial transaction

2. **encounters** (OPD visits)
   - `id` (UUID, PK) | `patient_id` (FK) | `doctor_id` (FK) | `encounter_no` | `chief_complaint`
   - `vitals_json` (BP, HR, Temp, RR, SpO2) | `ai_note` (generated SOAP notes)
   - `status` ∈ {open, signed, cancelled} | `signed_at` timestamp

3. **admissions** (IPD stays)
   - `id` (UUID, PK) | `patient_id` (FK) | `room_id` (FK) | `doctor_id` (FK)
   - `admission_no` | `admission_date` | `bed_no` | `admission_diagnosis`
   - `status` ∈ {admitted, discharged, transferred} | `days_admitted` (calculated)

#### Financial & Billing
4. **charges**
   - Line-item entries: medicine, tests, room charges, procedures
   - `patient_id` (FK) | `encounter_id` | `admission_id` | `description` | `amount`
   - `category` ∈ {medicine, test, procedure, room, consultation}
   - `gst_rate` | `gst_amount` | `status` ∈ {pending, invoiced}

5. **invoices**
   - `id` (UUID, PK) | `invoice_no` (auto-increment) | `patient_id` (FK)
   - `line_items` (JSON array of charges) | `subtotal` | `gst_total` | `total_amount`
   - `amount_paid` | `amount_due` | `payment_status` ∈ {unpaid, partial, paid}
   - `gst_breakup` (JSON: per-category tax breakdown)

6. **payments**
   - `id` (UUID, PK) | `payment_no` (auto-increment) | `invoice_id` (FK)
   - `amount` | `payment_mode` ∈ {cash, card, cheque, online, insurance}
   - `reference_no` | `bank_name` | `status` ∈ {success, pending, failed}

#### Pharmacy & Inventory
7. **medicine_catalog**
   - `id` (UUID, PK) | `name` | `generic_name` | `category` | `strength` | `unit`
   - `manufacturer` | `mrp` | `selling_price` | `gst_rate` | `reorder_level`
   - `current_stock` (auto-calc from batches) | `hsn_sac` (GST classification)

8. **medicine_batches**
   - `id` (UUID, PK) | `medicine_id` (FK) | `batch_no` | `expiry_date`
   - `quantity_received` | `quantity_remaining` | `purchase_price` | `selling_price`

9. **stock_transactions**
   - `id` (UUID, PK) | `medicine_id` (FK) | `batch_id` (FK) | `transaction_type`
   - `transaction_type` ∈ {in, out, adjustment, return, dispense}
   - `quantity` (negative if out) | `unit_price` | `total_value` | `reference_id` (encounter/admission)

#### Clinical & Prescriptions
10. **prescriptions**
    - `id` (UUID, PK) | `encounter_id` (FK) | `patient_id` (FK) | `medicine_id` (FK)
    - `strength` | `dosage` | `frequency` | `duration` | `route` | `instructions`

11. **test_orders**
    - `id` (UUID, PK) | `encounter_id` (FK) | `patient_id` (FK) | `order_no`
    - `test_name` | `category` ∈ {Lab, Radiology, Procedure} | `priority` ∈ {routine, urgent}

12. **test_results**
    - `id` (UUID, PK) | `order_id` (FK) | `result` (JSON) | `result_date` | `status`

#### Facility & Resource Management
13. **departments**
    - `id` (UUID, PK) | `name` | `code` | `type` ∈ {opd, ipd, ancillary}
    - `location` | `phone` | `is_active`

14. **rooms**
    - `id` (UUID, PK) | `room_no` | `room_type` ∈ {general, semi-private, private, icu}
    - `department_id` (FK) | `beds_total` | `daily_rate` | `is_active`

15. **users**
    - `id` (UUID, PK) | `username` (unique) | `password_hash` (bcrypt)
    - `role` ∈ {admin, doctor, nurse, reception, pharmacist, billing}
    - `department_id` | `name` | `email` | `phone` | `qualification` | `registration_no`
    - `is_active` | `last_login`

#### Operational
16. **appointments**
    - `id` (UUID, PK) | `appointment_no` | `patient_id` (FK) | `doctor_id` (FK)
    - `department_id` | `scheduled_date` | `scheduled_time` | `appointment_type`
    - `status` ∈ {scheduled, checked-in, completed, cancelled}

17. **token_queue**
    - `id` (UUID, PK) | `token_no` | `department` | `doctor_id` (FK) | `priority`
    - `status` ∈ {waiting, called, completed}

18. **expenses**
    - `id` (UUID, PK) | `expense_no` | `category` | `description` | `vendor`
    - `amount` | `gst_amount` | `payment_mode` | `expense_date`

19. **audit_logs**
    - `id` (UUID, PK) | `user_id` (FK) | `user_role` | `entity_type` | `entity_id`
    - `details` (JSON) | `created_at` (timestamp)

---

## 4. KEY BUSINESS LOGIC FUNCTIONS

### 4.1 Patient Balance Synchronization
**Function**: `syncPatientBalance(patient_id)`

```
Logic Flow:
1. Calculate total_billed = SUM(invoices.total_amount) WHERE patient_id
   AND payment_status != 'refunded'
2. Calculate total_paid = SUM(payments.amount) WHERE patient_id
   AND status = 'success'
3. Calculate outstanding = total_billed - total_paid
4. UPDATE patients SET outstanding, total_billed, total_paid, updated_at
5. Triggers: On every invoice creation, payment, or refund
```

**Why Critical**: Direct financial reporting; used on Dashboard KPI

### 4.2 FEFO Inventory Dispensing Algorithm
**Function**: `dispense(patient_id, medicine_id, quantity)`

```
Logic Flow (First-Expired-First-Out):
1. Fetch all unexpired batches for medicine_id, sorted by expiry_date ASC
2. Iterate through batches:
   a. remaining_qty = Math.min(required_qty, batch.quantity_remaining)
   b. Deduct from batch
   c. Create stock_transaction entry (type='dispense')
   d. Create charge line-item for patient
   e. Decrement required_qty
3. If required_qty > 0 after all batches: throw "INSUFFICIENT_STOCK"
4. Update medicine_catalog.current_stock
```

**Why Critical**: Prevents expired medicine use; ensures legal compliance

### 4.3 Invoice Generation & GST Calculation
**Function**: `createInvoice(patient_id, charge_ids[], discount, notes)`

```
Logic Flow:
1. Fetch all charges by charge_ids with payment_status = 'pending'
2. Group charges by gst_rate
3. For each group: tax_amount = (charge_amount * gst_rate) / 100
4. Calculate GST breakup: {rate: 5%, taxable: X, cgst: Y, sgst: Y}
5. subtotal = SUM(charges.amount)
6. gst_total = SUM(tax_amounts)
7. total_amount = subtotal + gst_total - discount
8. Create invoice record
9. UPDATE charges SET status='invoiced' for used charge_ids
10. Call syncPatientBalance(patient_id)
```

**Why Critical**: Legal GST compliance for India; billing accuracy

### 4.4 Admission Discharge & Room Charge Calculation
**Function**: `dischargeAdmission(admission_id, discharge_diagnosis, notes)`

```
Logic Flow:
1. Fetch admission with room details
2. Calculate days_admitted = (TODAY - admission_date)
3. room_charges = days_admitted * room.daily_rate
4. Create charge line-item for room fee
5. UPDATE admissions SET status='discharged', discharge_date=TODAY, discharge_diagnosis
6. FREE the room: UPDATE rooms SET beds_occupied--
7. Auto-trigger: createInvoice for admission charges
```

**Why Critical**: Ensures complete billing on discharge; room availability

### 4.5 AI SOAP Note Generation
**Function**: `generateAISoapNote(encounter_id, chief_complaint, vitals)`

**Providers Supported**:
- **OpenAI GPT-4** (with Authorization header)
- **Anthropic Claude Haiku** (with x-api-key header)

```
Logic Flow:
1. Fetch encounter data: chief_complaint, vitals, previous_history
2. Build prompt: "Generate SOAP note: S(subjective)=CC, O(objective)=vitals, A(assessment)=..., P(plan)=..."
3. Call AI API (configurable provider + key via environment)
4. Parse response content
5. UPDATE encounters SET ai_note=content, ai_generated=true
6. Note mutable until encounter.status changes to 'signed'
```

**Why Critical**: Reduces documentation time; standardizes clinical notes

---

## 5. API ENDPOINTS (RESTful Routing)

### Authentication Routes
```
POST /api/auth/login
  Payload: { username, password }
  Response: { token, user: {id, username, role, name, department} }
  Auth: None (rate-limited)

GET /api/auth/me
  Response: Current logged-in user
  Auth: Required
```

### Patient Management
```
GET /api/patients?page=1&limit=10
  Response: { data: [...], total, page }
  Auth: Required

POST /api/patients
  Payload: { name, age, gender, blood_group, phone, email, dpdp_consent, ... }
  Response: { id, uhid, ... }
  Auth: Required, Role: admin/reception

PUT /api/patients/:id
  Payload: { ...fields to update }
  Auth: Required

GET /api/patients/:id/ledger
  Response: { total_billed, total_paid, outstanding, transactions: [...] }
  Auth: Required
```

### OPD (Encounters)
```
POST /api/encounters
  Payload: { patient_id, chief_complaint, appointment_id }
  Response: { id, encounter_no, status: 'open' }
  Auth: Required, Role: doctor/nurse

PUT /api/encounters/:id
  Payload: { vitals_json: {...}, notes }
  Auth: Required, Role: doctor/nurse

POST /api/encounters/:id/ai-soap-note
  Payload: { disease_description } (optional)
  Response: { ai_note: "S: ...\nO: ...\nA: ...\nP: ..." }
  Auth: Required, Role: doctor

PUT /api/encounters/:id/sign
  Response: { status: 'signed', signed_at }
  Auth: Required, Role: doctor (who created it)
```

### Pharmacy & Dispensing
```
POST /api/pharmacy/dispense
  Payload: { prescription_id, encounter_id, patient_id }
  Response: { dispense_id, medicine, quantity_dispensed, total_charged, current_stock }
  Auth: Required, Role: pharmacist
  Side Effects: Creates stock_transaction, creates charge line-item

GET /api/pharmacy/inventory
  Response: { total_medicines, current_stock, low_stock: [...], expiring_soon: [...] }
  Auth: Required, Role: pharmacist/admin

POST /api/pharmacy/stock-in
  Payload: { medicine_id, batch_no, expiry_date, quantity, purchase_price, selling_price, supplier }
  Auth: Required, Role: pharmacist
```

### Billing & Invoicing
```
POST /api/billing/invoice
  Payload: { patient_id, charge_ids: [...], discount: 0, notes: "" }
  Response: { id, invoice_no, total_amount, amount_due }
  Auth: Required, Role: billing

POST /api/billing/payment
  Payload: { invoice_id, amount, payment_mode, reference_no, bank_name }
  Response: { payment_no, amount_paid, patient_balance }
  Auth: Required, Role: billing

GET /api/billing/patient/:id/invoices
  Response: [{ invoice_no, total, payment_status, created_at }, ...]
  Auth: Required
```

### IPD (Admissions)
```
POST /api/admissions
  Payload: { patient_id, doctor_id, room_id, bed_no, admission_diagnosis, notes }
  Response: { id, admission_no, status: 'admitted' }
  Auth: Required, Role: doctor

PUT /api/admissions/:id/discharge
  Payload: { discharge_diagnosis, discharge_summary, notes }
  Response: { status: 'discharged', days_admitted, room_charges }
  Auth: Required, Role: doctor
  Side Effects: Creates charge, frees room, auto-invoices
```

### Reports & Analytics
```
GET /api/reports/financial
  Query: ?from=2024-01-01&to=2024-12-31
  Response: { 
    summary: { gross_revenue, total_collected, outstanding_dues, net_profit },
    daily_revenue: [...],
    payment_modes: {...},
    top_services: [...]
  }
  Auth: Required, Role: admin/billing

GET /api/reports/inventory-status
  Response: { total, low_stock, expiring_soon, out_of_stock, inventory_value }
  Auth: Required, Role: admin/pharmacist

GET /api/dashboard/stats
  Response: KPIs for dashboard
  Auth: Required
```

---

## 6. FRONTEND ARCHITECTURE

### Page Structure & Routes
```
/login                  → Login page (stateless)
/dashboard              → KPI dashboard (all roles)
/front-office           → Patient registration, appointment booking
/appointments           → Appointment management queue
/opd                    → Encounter management, SOAP notes, prescriptions
/ipd                    → Admission matrix, room management, discharge
/pharmacy               → Inventory, dispensing, stock transactions
/billing                → Invoice creation, payment recording
/reports                → Financial & inventory analytics
/admin                  → User management, system settings
```

### Component Hierarchy
```
<App>
  ├─ <BrowserRouter>
  │   ├─ Route: /login → <Login />
  │   ├─ Guard Component (JWT validation + role check)
  │   │   └─ <Layout>
  │   │       ├─ <Sidebar> (role-filtered navigation)
  │   │       ├─ <Header> (breadcrumbs, user menu)
  │   │       └─ <Outlet> (page router)
  │   │           ├─ <Dashboard>
  │   │           ├─ <OPD>
  │   │           ├─ <IPD>
  │   │           ├─ <Pharmacy>
  │   │           ├─ <Billing>
  │   │           ├─ <Reports>
  │   │           └─ ...
  │   └─ Fallback: Navigate to /dashboard
```

### State Management (Zustand)
```javascript
// AuthStore: /src/store/authStore.js
useAuthStore() {
  token,              // JWT string
  user,               // {id, username, role, name, department}
  isAuthenticated,    // boolean
  login(token, user), // persist to localStorage
  logout(),           // clear localStorage
  getToken(),         // getter for axios interceptor
}

// Storage Key: 'medos-auth-v2' (persisted via middleware)
// Expires: Not persisted; JWT expiry is server-side (10 hours)
```

### API Client Setup
```javascript
// /src/api/client.js
axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  interceptors: {
    request: Add 'Authorization: Bearer {token}',
    response: Handle 401 → logout & redirect to /login
  }
})
```

### Styling Approach
- **CSS Custom Properties**: Root variables in `index.css`
- **Glassmorphism Design**: backdrop-filter + transparency
- **Z-Index Hierarchy**: Sidebar(40), Header(30), Modal(100), Toast(200)
- **Responsive**: Flex/Grid layouts, media queries
- **Dark Theme**: Primary(#3b82f6), Surface(#18181b), Text(#e4e4e7)

---

## 7. SECURITY & COMPLIANCE

### Authentication & Authorization
1. **JWT Token Flow**:
   - Login endpoint issues 10-hour JWT
   - Payload: `{id, username, role, name, department}`
   - Signature: HS256 with JWT_SECRET
   - Storage: localStorage (XSS exposure, but single-page app)

2. **Role-Based Access Control (RBAC)**:
   - Middleware `can(...roles)` checks decoded JWT.role
   - Frontend Guard component validates role before render
   - 6 role types: admin, doctor, nurse, reception, pharmacist, billing

3. **Rate Limiting**:
   - `/api/auth/login`: 5 attempts per 15 minutes per IP

### Data Protection
1. **DPDP Compliance** (Digital Personal Data Protection):
   - Patient consent flag: `dpdp_consent` (boolean)
   - Consent date recorded: `dpdp_consent_date`
   - Audit logging for all sensitive operations

2. **SQL Injection Prevention**:
   - Knex.js parameterized queries (no string concatenation)
   - Input validation on all POST/PUT endpoints

3. **Password Security**:
   - Bcrypt 10-round hashing
   - No plaintext passwords in logs or responses

4. **Audit Logging**:
   - Every critical operation logged to `audit_logs` table
   - Contains: user_id, user_role, entity_type, entity_id, action, timestamp

### Environment Isolation
```
Backend:
  DATABASE_URL=sqlite://medos.db    (dev) / postgres://... (prod)
  PORT=3001
  JWT_SECRET=your-secure-secret
  ANTHROPIC_API_KEY=sk-ant-...      (for AI)
  FRONTEND_URL=http://localhost:3000

Frontend:
  VITE_API_URL=http://localhost:3001/api
```

---

## 8. DEVELOPMENT WORKFLOW

### Setup & Initialization
```bash
# Terminal 1: Backend
cd backend
npm install
node server.js  # Runs on port 3001

# Terminal 2: Frontend
cd frontend
npm install
npm run dev     # Runs on port 5173 (Vite default)
```

### Database Initialization
- **Schema Creation**: `setupSchema()` runs on first server start
- **Seeding**: `seed()` populates test departments, users, medicines, rooms, patients
- **Idempotent**: Checks for existing tables before creation

### Test Logins
| Role | Username | Password | Department |
|------|----------|----------|------------|
| Admin | admin | admin123 | - |
| Doctor (General) | drpriya | doctor123 | General Medicine |
| Doctor (Cardiology) | drrahul | doctor123 | Cardiology |
| Reception | reception1 | recep123 | Front Office |
| Nurse | nurse1 | nurse123 | General |
| Pharmacist | pharmacist1 | pharma123 | Pharmacy |
| Billing | billing1 | billing123 | Billing |

### Code Entry Points
- **Backend**: `backend/server.js` (monolithic, 1700+ lines)
- **Frontend App**: `frontend/src/App.jsx` (routing root)
- **Frontend Entry**: `frontend/src/main.jsx` (React mount point)

---

## 9. COMMON WORKFLOWS & PATTERNS

### Workflow: Patient Registration → Appointment → OPD Encounter → Billing

1. **Registration** (Front Office)
   - POST /api/patients with name, age, phone, blood_group, DPDP consent
   - System auto-generates UHID (Universal Health ID)

2. **Appointment Booking** (Reception)
   - POST /api/appointments with patient_id, doctor_id, scheduled_date, chief_complaint
   - Token queuing: Creates token_queue entry

3. **Check-in & Encounter** (Doctor/Nurse)
   - POST /api/encounters with patient_id, chief_complaint
   - PUT /api/encounters/:id with vitals_json
   - POST /api/encounters/:id/ai-soap-note (optional AI generation)
   - Add prescriptions via POST /api/prescriptions

4. **Prescription Dispensing** (Pharmacist)
   - POST /api/pharmacy/dispense with prescription_id
   - FEFO algorithm selects batch
   - Charge line-item auto-created

5. **Billing** (Billing)
   - POST /api/billing/invoice with charge_ids (all pending charges)
   - Calculates GST breakup
   - POST /api/billing/payment with amount, payment_mode

6. **Patient Balance** (Auto-sync)
   - syncPatientBalance(patient_id) called after every payment
   - Dashboard shows outstanding amount

### Workflow: Hospital Admission → IPD Stay → Discharge

1. **Admission** (Doctor)
   - POST /api/admissions with patient_id, room_id, admission_diagnosis
   - Room becomes occupied

2. **Daily Charting** (Nurse/Doctor)
   - PUT /api/admissions/:id/notes with daily observations

3. **Discharge** (Doctor)
   - PUT /api/admissions/:id/discharge with discharge_diagnosis
   - Calculates room_charges = days_admitted * daily_rate
   - Creates charge + invoice automatically
   - Frees room for next admission

### Workflow: Pharmacy Stock Management

1. **Stock Receipt** (Pharmacist)
   - POST /api/pharmacy/stock-in with batch_no, expiry_date, quantity
   - Creates medicine_batch + stock_transaction (type='in')

2. **Inventory Monitoring**
   - Dashboard shows low_stock_items (current_stock < reorder_level)
   - Expiring_soon items (expiry_date < 90 days)

3. **Inventory Adjustment** (Admin)
   - POST /api/pharmacy/adjust-stock (for shrinkage, spillage, theft)
   - Creates stock_transaction (type='adjustment')

---

## 10. DEPLOYMENT CONSIDERATIONS

### Single-File Architecture Notes
- **Pros**: Simple deployment, no build complexity, single entrypoint
- **Cons**: Monolithic, hard to test, scaling limits

### Database Flexibility
- **SQLite**: File-based, zero config, suitable for ≤100 concurrent users
- **PostgreSQL**: Recommended for production, better concurrency, backups
- **Switch**: Change `knexConfig` client from 'sqlite3' to 'pg'

### Environment Variables (.env required)
```
PORT=3001
JWT_SECRET=generate-secure-random-string
ANTHROPIC_API_KEY=sk-ant-... (optional, for AI)
FRONTEND_URL=http://your-frontend-url.com
DATABASE_URL=postgresql://user:pass@localhost/medos
```

### Performance Tips
1. Add database indexing on frequently queried columns (patient_id, encounter_id)
2. Cache KPI calculations with 5-minute TTL
3. Batch process monthly billing jobs
4. Archive old encounters/test_results after 2 years
5. Use connection pooling for PostgreSQL

---

## 11. TROUBLESHOOTING & DEBUGGING

### Common Issues & Solutions

**Issue**: "INSUFFICIENT_STOCK" error on dispense
- Check: medicine_catalog.current_stock
- Check: All batches expired? Query medicine_batches for active batches
- Solution: Stock-in new batch or adjust inventory

**Issue**: Patient balance doesn't update after payment
- Trigger: Manual call to `GET /api/patients/:id/ledger` to recalculate
- Check: Verify payment.status = 'success' (not 'pending')
- Solution: Call syncPatientBalance(patient_id) manually

**Issue**: JWT token expired, blank screen
- Frontend should: Catch 401 response → call logout() → redirect to /login
- Check: useAuthStore hook is properly integrated

**Issue**: AI note generation fails
- Check: ANTHROPIC_API_KEY is set correctly
- Check: API key has correct permissions
- Fallback: Return empty ai_note, allow manual entry

**Issue**: SQLite database locked
- Cause: Multiple processes accessing simultaneously
- Solution: Use PostgreSQL for production
- Workaround: Restart backend server

---

## 12. KEY FILES & PATHS

### Backend
```
backend/
├── server.js                    (entire backend logic)
├── package.json                 (dependencies: express, knex, bcrypt, jwt)
├── medos.db                     (SQLite database, auto-created)
└── .env                         (configuration)
```

### Frontend
```
frontend/
├── src/
│   ├── main.jsx                 (React mount point)
│   ├── App.jsx                  (routing root)
│   ├── index.css                (global styles + CSS variables)
│   ├── api/
│   │   └── client.js            (axios instance + interceptors)
│   ├── store/
│   │   └── authStore.js         (Zustand + persist)
│   ├── components/
│   │   └── Layout.jsx           (sidebar + header + outlet)
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── OPD.jsx
│       ├── IPD.jsx
│       ├── Pharmacy.jsx
│       ├── Billing.jsx
│       ├── Reports.jsx
│       ├── Admin.jsx
│       ├── FrontOffice.jsx
│       └── Appointments.jsx
├── package.json                 (dependencies: react, react-router, zustand, axios)
└── vite.config.js               (Vite configuration)
```

---

## 13. QUICK REFERENCE: CRITICAL FUNCTIONS

| Function | Purpose | Key Logic | Triggers |
|----------|---------|-----------|----------|
| `syncPatientBalance()` | Auto-calc patient outstanding | SUM(invoices) - SUM(payments) | After payment/refund |
| `dispensePharmacy()` | FEFO medicine allocation | Sort batches by expiry, deduct | Prescription dispensing |
| `createInvoice()` | Generate billing invoice | Group charges, calc GST | Manual billing trigger |
| `dischargeAdmission()` | End IPD stay | Calc room_charges, free room | Doctor discharge order |
| `generateAISoapNote()` | AI clinical notes | Call Anthropic/OpenAI API | Doctor request |
| `setupSchema()` | Init database | CREATE TABLE IF NOT EXISTS | Server startup |
| `seed()` | Populate test data | INSERT demo users/medicines | First-time setup |
| `nextNo()` | Auto-increment counters | SELECT MAX + 1 | Before creation |

---

## 14. BEST PRACTICES FOR THIS CODEBASE

1. **Always sync patient balance** after financial operations
2. **Use Knex parameterized queries** (never raw SQL concatenation)
3. **Validate input** before DB operations (age: 0-150, gst_rate: 0-28)
4. **Check role** in both middleware AND component level
5. **Handle 401 responses** globally in axios interceptor
6. **Test login** with each role to verify RBAC
7. **Archive old data** to keep performance optimal
8. **Backup database** before schema changes
9. **Log audit trail** for compliance
10. **Use transactions** for multi-step operations (admission → charges → invoice)

---

## 15. NEXT STEPS FOR NEW DEVELOPERS

1. **Clone & Run Locally**
   ```bash
   npm install (both frontend & backend)
   cd backend && node server.js
   cd frontend && npm run dev
   ```

2. **Explore Database**
   - Open `backend/medos.db` with SQLite viewer
   - Understand 19-entity schema

3. **Trace a Workflow**
   - Register patient → Create appointment → Start OPD → Dispense medicine → Invoice
   - Follow API calls in network tab

4. **Test Each Role**
   - Login as different roles
   - Verify role-based UI rendering
   - Check unauthorized 403 errors

5. **Check AI Integration**
   - Set ANTHROPIC_API_KEY
   - Generate SOAP note on an encounter
   - Verify AI response format

---

## 16. GLOSSARY

- **UHID**: Universal Health ID (auto-generated per patient)
- **DPDP**: Digital Personal Data Protection (GDPR-equivalent in India)
- **FEFO**: First-Expired-First-Out (medicine dispensing algorithm)
- **OPD**: Out-Patient Department (ambulatory/walk-in)
- **IPD**: In-Patient Department (hospitalized)
- **SOAP**: Subjective-Objective-Assessment-Plan (clinical documentation)
- **HSN/SAC**: Harmonized System of Nomenclature / Service Accounting Code (for GST)
- **GST**: Goods & Services Tax (Indian tax, rates: 5%, 12%, 18%, 28%)
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token (stateless auth)
- **Knex**: SQL query builder for Node.js

---

**Document Version**: 3.0  
**Last Updated**: April 2026  
**Applicable To**: MedOS HMS v3.0 + Backend v2.0 + Frontend v2.0
