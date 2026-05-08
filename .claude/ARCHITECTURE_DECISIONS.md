# MedOS Architecture & Design Decisions

## Overview
This document explains the "WHY" behind key architectural choices in MedOS v3.0.

---

## 1. MONOLITHIC BACKEND (Single server.js File)

### Decision
All backend logic in one 1700-line `server.js` file instead of microservices or modular structure.

### Rationale
- ✅ **Simplicity**: No inter-service communication, single deployment
- ✅ **Faster Development**: Hospital teams don't need complex DevOps
- ✅ **Debugging**: Single file easier to trace logic
- ✅ **Hospital Context**: Most hospitals have <1000 beds; doesn't need Netflix-scale architecture

### Trade-offs
- ❌ Hard to test individual functions in isolation
- ❌ Not horizontally scalable
- ❌ Code duplication in similar operations
- ❌ Single point of failure

### When to Refactor
- If deployment complexity increases
- If team needs to work on separate features in parallel
- If performance becomes bottleneck (then split into modules)

### Migration Path (If Needed)
```
Current: monolithic backend/server.js
↓
Step 1: Separate into routes/
        routes/patients.js, routes/pharmacy.js, etc.
↓
Step 2: Extract business logic to models/
        models/PatientService.js, etc.
↓
Step 3: Split into microservices
        api-gateway → patient-service, billing-service, etc.
```

---

## 2. SQLite FOR DEV, POSTGRESQL FOR PROD

### Decision
Use file-based SQLite for development, switch to PostgreSQL for production.

### Rationale
- ✅ **Dev**: No database setup; works on any machine
- ✅ **Prod**: PostgreSQL handles concurrency, replication, backups
- ✅ **Flexibility**: Change via `DATABASE_URL` environment variable

### Implementation
```javascript
const knexConfig = {
  client: process.env.DB_CLIENT || 'sqlite3',
  connection: process.env.DATABASE_URL || './medos.db'
}
```

### SQLite Limitations
- Single writer at a time (locks on write)
- Max ~100 concurrent users
- No replication/clustering

### Production Checklist
- [ ] Switch `DATABASE_URL` to PostgreSQL connection string
- [ ] Install `pg` npm package
- [ ] Run schema setup on production database
- [ ] Test migrations work
- [ ] Set up daily backups

---

## 3. JWT-BASED STATELESS AUTHENTICATION

### Decision
Use JWT tokens instead of session-based auth with server-side storage.

### Rationale
- ✅ **Scalable**: No server-side session storage needed
- ✅ **Stateless**: Any server can validate token independently
- ✅ **Mobile-Ready**: Works with mobile apps naturally
- ✅ **No Database Lookups**: Token decoded locally

### Token Structure
```json
{
  "id": "uuid-of-user",
  "username": "drpriya",
  "role": "doctor",
  "name": "Dr. Priya",
  "department": "General Medicine",
  "iat": 1713475200,
  "exp": 1713514200  // 10 hours
}
```

### Security Considerations
- ✅ Signed with HS256 + JWT_SECRET
- ✅ Expires after 10 hours (reasonable for hospital use)
- ⚠️ No refresh token mechanism (session ends completely)
- ⚠️ Stored in localStorage (XSS risk, but acceptable for internal app)

### Why 10 Hours?
- Long enough for 8-hour shift
- Short enough for security (limits stolen token damage)
- Can be configured per role if needed

### Alternative: Refresh Tokens
If needed later:
```javascript
// Issue both access_token (1 hour) + refresh_token (30 days)
// On 401: Client calls POST /auth/refresh with refresh_token
// Gets new access_token without re-entering password
```

---

## 4. ZUSTAND FOR CLIENT-SIDE STATE

### Decision
Use Zustand instead of Redux, Context API, or other state managers.

### Rationale
- ✅ **Minimal Boilerplate**: Simple create(set, get) API
- ✅ **Small Bundle**: ~2KB vs Redux ~40KB
- ✅ **Typescript-Ready**: Works well with types
- ✅ **Persist Middleware**: Built-in localStorage sync
- ✅ **No Providers Hell**: Optional, lightweight

### Current AuthStore
```javascript
const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'medos-auth-v2' }
  )
)
```

### When to Add More Stores
```javascript
// PatientStore for selected patient context
const usePatientStore = create((set) => ({
  currentPatient: null,
  setPatient: (p) => set({ currentPatient: p })
}))

// Not needed: API response caching (handled by axios)
// Not needed: Form state (use React useState)
```

### Why NOT Redux?
- Redux has boilerplate (actions, reducers, selectors)
- Overkill for single JWT + user info
- Zustand is modern, hospital teams don't know Redux anyway

---

## 5. KNEX.JS FOR DATABASE ABSTRACTION

### Decision
Use Knex query builder instead of raw SQL or Prisma.

### Rationale
- ✅ **No ORMs Overhead**: Lightweight, just SQL builder
- ✅ **Switch Databases**: Same code works for SQLite/PostgreSQL
- ✅ **SQL Injection Prevention**: Parameterized queries by default
- ✅ **Familiar**: SQL-like syntax, easier for beginners

### Examples
```javascript
// Safe (parameterized, no injection risk)
knex('patients').where('id', patient_id).select('*')

// Unsafe (string concatenation)
knex.raw(`SELECT * FROM patients WHERE id = '${patient_id}'`)  // DON'T!
```

### Why NOT Prisma?
- Prisma has higher learning curve
- Better for large applications
- Knex sufficient for hospital domain

### Schema Management
- Manual schema creation in `setupSchema()`
- No migrations needed in development
- For production: Knex migrations can be added

---

## 6. FEFO ALGORITHM FOR MEDICINE DISPENSING

### Decision
Use First-Expired-First-Out instead of FIFO or random selection.

### Rationale
- ✅ **Regulatory Compliance**: Legal requirement in pharmacies
- ✅ **Prevents Waste**: Uses near-expiry medicines first
- ✅ **Patient Safety**: Expires less likely to have degraded efficacy
- ✅ **Cost Optimization**: Reduces shrinkage

### Algorithm
```javascript
// Get all batches sorted by expiry (earliest first)
const batches = knex('medicine_batches')
  .where('medicine_id', medicine_id)
  .andWhere('expiry_date', '>', today)
  .orderBy('expiry_date', 'ASC')

// Greedily fill from earliest-expiry batches
let remaining = quantity_needed;
for (let batch of batches) {
  const deduct = Math.min(remaining, batch.quantity_remaining);
  batch.quantity_remaining -= deduct;
  remaining -= deduct;
  if (remaining === 0) break;
}

if (remaining > 0) throw "INSUFFICIENT_STOCK"
```

### Real-World Example
```
Order: 150 tablets of Aspirin
Batches available:
1. Batch A: 100 tablets, expires 2024-05-01
2. Batch B: 80 tablets, expires 2024-06-15

Dispensing:
1. Take 100 from Batch A (expires soonest)
2. Take 50 from Batch B
Result: Batch A = 0, Batch B = 30
```

### Alternative: FIFO
- Simpler (just take first batch ever received)
- But: Might use old stock while expiring stock remains
- ❌ Not recommended for pharmacies

---

## 7. AUTO-SYNC PATIENT BALANCE

### Decision
Recalculate patient outstanding after every financial transaction.

### Rationale
- ✅ **Accuracy**: Single source of truth
- ✅ **Audit Trail**: Transaction log remains; balance auto-derives
- ✅ **Consistency**: No manual adjustments to outstanding field
- ✅ **Prevents Fraud**: Cannot manually inflate/deflate balance

### Implementation
```javascript
async function syncPatientBalance(patient_id) {
  const invoiced = knex('invoices').sum('total_amount')
    .where('patient_id', patient_id)
    .andWhere('payment_status', '!=', 'refunded')
  
  const paid = knex('payments').sum('amount')
    .where('patient_id', patient_id)
    .andWhere('status', 'success')
  
  const outstanding = invoiced - paid
  
  knex('patients').update({
    outstanding,
    updated_at: today
  }).where('id', patient_id)
}
```

### Triggers
- After invoice creation
- After payment recording
- After refund processing
- On demand: GET /api/patients/:id/ledger

### Why NOT Stored Procedures?
- SQLite doesn't support triggers well
- Manual function calls sufficient
- Easier to debug in application code

---

## 8. GST CALCULATION & BREAKUP

### Decision
Calculate and store GST per charge, group by rate for invoice.

### Rationale
- ✅ **India Compliance**: GST is mandatory tax
- ✅ **Multiple Rates**: Hospital services taxed at different rates (5%, 12%, 18%)
- ✅ **Audit**: Each line-item must show tax calculation
- ✅ **Split CGST/SGST**: Central + State tax components

### GST Rates by Category (India)
```
Medicine:      5% (essential healthcare)
Consultation:  5% (medical services)
Tests:        12% (diagnostic services)
Procedures:   12% (surgical services)
Room Charges:  5% (accommodation)
```

### Invoice Tax Breakup
```json
{
  "gst_breakup": {
    "5%": {
      "taxable": 1000,
      "cgst": 25,
      "sgst": 25,
      "total_tax": 50
    },
    "12%": {
      "taxable": 2000,
      "cgst": 120,
      "sgst": 120,
      "total_tax": 240
    }
  },
  "total_gst": 290
}
```

### Why Store Line-Item Tax?
- Freeze historical rates (tax changes over time)
- Generate exact receipts later
- Audit compliance
- Easier refunds (don't recalculate)

---

## 9. ROLE-BASED ACCESS CONTROL (RBAC) AT 2 LEVELS

### Decision
Validate role both at backend middleware AND frontend route guards.

### Rationale
- ✅ **Defense in Depth**: Backend can't be bypassed by frontend hacks
- ✅ **UX**: Frontend hides unauthorized routes for cleaner UI
- ✅ **API Security**: Backend still validates even if frontend bypassed

### Backend Validation
```javascript
// Every protected endpoint checks JWT.role
app.put('/api/encounters/:id/sign', auth, can('doctor', 'admin'), handler)

function can(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
```

### Frontend Validation
```javascript
<Route path="/pharmacy" 
  element={
    <Guard roles={['pharmacist', 'admin']}>
      <Pharmacy />
    </Guard>
  }
/>

// If role not in array: redirects to /dashboard
```

### Why 2 Levels?
- **Backend**: Security (prevents API abuse)
- **Frontend**: UX (prevents confusing "unauthorized" errors)

---

## 10. SINGLE-FILE DATABASE INITIALIZATION

### Decision
All schema creation + seeding in `setupSchema()` and `seed()` functions.

### Rationale
- ✅ **No Migration Tool**: Simpler than Flyway/Liquibase
- ✅ **First-Time Setup**: Automatic on server start
- ✅ **Idempotent**: Safe to run multiple times (IF NOT EXISTS)
- ✅ **Test Data**: Included for quick demos

### Initialization Flow
```javascript
// On server startup:
1. Check if tables exist (SELECT * FROM sqlite_master)
2. If not: Run setupSchema() → creates all 19 tables
3. Check if seed data exists (SELECT COUNT FROM users)
4. If not: Run seed() → inserts departments, users, medicines, etc.
5. Server starts
```

### Why NOT Migrations?
- Migrations needed when schema evolves in production
- For now: Manual ALTER TABLE if schema changes
- If team grows: Add Knex migrations

### Production Schema Changes
```bash
# Backup first!
cp medos.db medos.db.backup

# Manual ALTER if schema changes
ALTER TABLE patients ADD COLUMN middle_name VARCHAR(255);

# Or: Recreate from scratch (if no data)
DROP DATABASE medos;
CREATE DATABASE medos;
# Re-seed
```

---

## 11. ENCOUNTER SIGNING AS ONE-WAY STATE

### Decision
Once encounter status='signed', it cannot be edited or deleted.

### Rationale
- ✅ **Medical-Legal**: Signed documents are legal records
- ✅ **Audit Trail**: Cannot alter after doctor sign-off
- ✅ **Compliance**: Required by medical boards
- ✅ **Prevents Fraud**: Can't backdate or modify patient records

### Implementation
```javascript
// Only allows status change: open → signed (not reversible)
PUT /api/encounters/:id/sign
{
  id,
  status: 'signed',
  signed_by: doctor_id,
  signed_at: NOW(),
  // ai_note field locked (cannot update after signing)
}

// Any attempt to PUT encounter after signed should fail:
if (encounter.status === 'signed') {
  return res.status(400).json({ error: 'Encounter already signed' })
}
```

### Amendment Process (If Needed)
```javascript
// Create new encounter as amendment
POST /api/encounters/{original_id}/amendment
{
  notes: "Correction: BP was actually 130/80",
  original_encounter_id: original_id
}
// References original (audit trail preserved)
```

---

## 12. APPOINTMENT + TOKEN QUEUE DUAL SYSTEM

### Decision
Support both scheduled appointments AND walk-in token queue.

### Rationale
- ✅ **Scheduled**: For pre-booked patients (OPD at 10 AM)
- ✅ **Walk-in**: For emergency/walk-in patients (token-based queue)
- ✅ **Real Hospitals**: Mix of both models

### Flow
```
Scheduled Patient:
  1. Book appointment (scheduled_date='2024-05-01', scheduled_time='10:00')
  2. Day of appointment: Reception checks in
  3. Doctor calls from queue
  4. Encounter created

Walk-in Patient:
  1. Register at front desk
  2. Get token number from queue
  3. Wait for name call
  4. Encounter created
```

### Why Not Just Appointments?
- Many Indian hospitals run walk-in queues
- Faster for unscheduled emergencies
- Token system familiar to patients

---

## 13. HOSPITAL ADMISSIONS: IPD VS OPD TRACKING

### Decision
Separate entities: encounters (OPD) vs admissions (IPD).

### Rationale
- ✅ **Different Workflows**: Outpatient vs inpatient have different lifecycles
- ✅ **Room Management**: IPD needs bed tracking, OPD doesn't
- ✅ **Discharge Process**: Room charges calculated on IPD discharge
- ✅ **Clinical Workflow**: Doctor may see same patient in both OPD (consultation) + IPD (rounds)

### Workflows
```
OPD Patient:
  1. Create encounter (chief_complaint, vitals)
  2. Prescribe medicines + tests
  3. Sign encounter
  4. Discharge (encounter closed)
  5. Invoice for services

IPD Patient:
  1. Create admission (room_id, bed_no)
  2. Multiple encounters during stay (daily rounds)
  3. Discharge (calc room_charges)
  4. Invoice with room + services
```

### Why Not Unified?
- Different state machines
- OPD: open → signed
- IPD: admitted → discharged
- Different data (room_id, bed_no only in IPD)

---

## 14. AUDIT LOGGING FOR COMPLIANCE

### Decision
Log all critical operations to audit_logs table with user + timestamp.

### Rationale
- ✅ **DPDP Compliance**: India's data protection law requires audit trail
- ✅ **Fraud Detection**: Track who changed what when
- ✅ **Medical-Legal**: Prove data integrity in disputes
- ✅ **Compliance**: Required for hospital accreditation

### Logged Events
```javascript
// Critical operations trigger:
await auditLog(req.user.id, req.user.role, 'patient', patientId, 'CREATE', details)

// Examples:
- Patient created/edited
- Invoice generated
- Payment recorded
- Medicine dispensed
- Encounter signed
- User roles changed
```

### Audit Log Structure
```json
{
  "id": "uuid",
  "user_id": "uuid of who did it",
  "user_role": "doctor",
  "entity_type": "invoice",
  "entity_id": "inv-123",
  "action": "CREATE",
  "details": {
    "invoice_no": "INV-0001",
    "patient_id": "pat-123",
    "amount": 5000
  },
  "created_at": "2024-04-18T10:30:00Z"
}
```

### Retention Policy
- Keep forever (storage is cheap; required by law)
- Archive to separate table after 5 years if needed
- Never delete (integrity)

---

## 15. AI PROVIDER ABSTRACTION (OpenAI vs Anthropic)

### Decision
Support multiple AI providers (OpenAI + Anthropic) via environment variable.

### Rationale
- ✅ **Flexibility**: Switch providers without code change
- ✅ **Cost Optimization**: OpenAI vs Anthropic pricing differs
- ✅ **Failover**: Use Anthropic if OpenAI unavailable
- ✅ **Future-Proof**: Easy to add more providers

### Provider Configuration
```javascript
// Via .env
AI_PROVIDER=anthropic     // or 'openai'
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

// Backend detects provider at runtime
const provider = process.env.AI_PROVIDER
const key = provider === 'anthropic' 
  ? process.env.ANTHROPIC_API_KEY 
  : process.env.OPENAI_API_KEY
```

### Cost Comparison (2024)
```
OpenAI GPT-4:
  $0.03 per 1K input tokens
  $0.06 per 1K output tokens
  → SOAP note: ~$0.05

Anthropic Claude Haiku:
  $0.00080 per 1K input tokens
  $0.0024 per 1K output tokens
  → SOAP note: ~$0.001
  
Claude is 50x cheaper!
```

### Why Both?
- Some hospitals already use OpenAI (vendor lock-in)
- Anthropic better for cost + performance
- Support both = maximum compatibility

---

## 16. ENVIRONMENT-BASED DATABASE SWITCHING

### Decision
Use DATABASE_URL env variable to switch SQLite ↔ PostgreSQL.

### Rationale
- ✅ **12-Factor App Compliant**: Config via environment
- ✅ **Docker-Friendly**: Easy to set via docker-compose
- ✅ **Dev/Prod Parity**: Same code, different config
- ✅ **No Code Changes**: Just set env variable

### Examples
```bash
# Development (local file)
DATABASE_URL=sqlite://./medos.db

# Production (managed database)
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/medos

# Heroku
DATABASE_URL=postgresql://...  (auto-set by Heroku)
```

### Knex Configuration
```javascript
const knexConfig = {
  client: process.env.DB_CLIENT || 'sqlite3',
  connection: process.env.DATABASE_URL || './medos.db',
  useNullAsDefault: true  // SQLite quirk
}
```

---

## 17. NO FRONTEND BUILD REQUIRED FOR DEVELOPMENT

### Decision
Use Vite dev server (not production build) during development.

### Rationale
- ✅ **Hot Module Reload**: Changes appear instantly
- ✅ **Faster Feedback**: No build step between edit → test
- ✅ **Better DX**: Industry standard for React development
- ✅ **ES6 Modules**: Modern tooling out of the box

### Dev vs Production
```bash
# Development
npm run dev    # Starts Vite dev server, port 5173
# Serves uncompressed JSX, instant HMR

# Production Build
npm run build  # Outputs optimized dist/
# Minified, code-split, ready for deployment
```

### Why Vite Over Create React App?
- ✅ Vite: ~100ms dev server (instant)
- ❌ CRA: ~3s startup (bloated webpack)
- ✅ Vite: Modern ESM (native browser modules)
- ❌ CRA: CommonJS + polyfills (legacy)

---

## 18. REACT ROUTER V6 FOR NESTED ROUTES

### Decision
Use React Router v6 with `<Outlet>` for nested layouts.

### Rationale
- ✅ **Layouts**: Reuse sidebar + header across pages
- ✅ **Parallel Routes**: Can have multiple Outlets (if needed)
- ✅ **Modern API**: v6 is cleaner than v5
- ✅ **Hook-Based**: useParams, useNavigate, etc.

### Structure
```jsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Layout />}>  {/* Wraps all */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/opd" element={<OPD />} />
      {/* <Outlet /> in Layout renders these */}
    </Route>
  </Routes>
</BrowserRouter>
```

### Why Not Next.js?
- MedOS is simple (no SSR needed)
- React Router sufficient
- Simpler deployment (no Node.js server for Next.js)

---

## Summary: Key Tensions Resolved

| Tension | Decision | Rationale |
|---------|----------|-----------|
| Monolithic vs Microservices | Monolithic | Simplicity for hospital context |
| SQLite vs PostgreSQL | Both (env-based) | Dev simplicity, prod robustness |
| Session vs JWT | JWT | Stateless, scalable, mobile-ready |
| Redux vs Zustand | Zustand | Minimal boilerplate, smaller bundle |
| Raw SQL vs ORM | Knex (middle ground) | SQL injection prevention + database switching |
| FIFO vs FEFO | FEFO | Regulatory compliance, waste prevention |
| Manual vs Auto-sync Balance | Auto-sync | Accuracy, prevents fraud |
| Single AI Provider | Multi-provider | Cost optimization, flexibility |
| Manual Schema vs Migrations | Manual (for now) | Simplicity at scale of project |
| Session-based Roles | JWT + role field | Scalability, standard practice |

---

**Document Version**: 1.0  
**Last Updated**: April 2026  
**Audience**: Architects, senior developers, code reviewers
