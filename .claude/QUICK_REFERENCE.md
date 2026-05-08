# MedOS - Quick Developer Reference Guide

## 🚀 Getting Started

### First-Time Setup
```bash
# Clone and setup
git clone <repo>
cd med-os

# Backend
cd backend
npm install
cp .env.example .env  # Configure DB & JWT_SECRET
node server.js        # Runs on http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev           # Runs on http://localhost:5173
```

### Test Logins
- **Admin**: admin / admin123
- **Doctor**: drpriya / doctor123
- **Pharmacist**: pharmacist1 / pharma123
- **Billing**: billing1 / billing123

---

## 🗂️ Project Structure Quick Map

```
med-os/
├── backend/
│   ├── server.js              ← ALL backend logic here
│   ├── medos.db               ← SQLite database
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            ← Main routing
│   │   ├── pages/             ← Route components
│   │   ├── store/             ← Zustand state
│   │   └── api/               ← API client
│   └── package.json
└── .claude/
    └── PROJECT_SKILLS.md      ← Full documentation
```

---

## 🔐 Authentication Flow

```javascript
// User logs in
POST /api/auth/login
Response: { token, user: {id, role, name, ...} }

// Frontend stores JWT
useAuthStore.login(token, user)
// Persisted to localStorage as 'medos-auth-v2'

// Every API request adds header
Authorization: Bearer <token>

// Token expires after 10 hours server-side
// 401 response triggers logout + redirect to /login
```

---

## 💰 Billing Flow

### Step 1: Charges Accumulate
```
Patient encounter/admission → Creates charge line-items
- Consultation fee
- Medicine dispensed
- Tests ordered
- Room charges
All marked status='pending'
```

### Step 2: Create Invoice
```javascript
POST /api/billing/invoice
{
  patient_id,
  charge_ids: [list of pending charges],
  discount: 0,
  notes: ""
}

Response: {
  id, invoice_no, 
  line_items, 
  gst_breakup: {rate: 5%, taxable: X, cgst: Y, sgst: Y},
  total_amount, amount_due
}

// Side effects:
// - Charges marked status='invoiced'
// - Invoice created
// - Patient balance synced
```

### Step 3: Record Payment
```javascript
POST /api/billing/payment
{
  invoice_id,
  amount,
  payment_mode: 'cash|card|cheque|online',
  reference_no: '',
  bank_name: ''
}

// Side effects:
// - Payment recorded
// - Invoice amount_paid updated
// - Patient outstanding recalculated
```

---

## 💊 Pharmacy FEFO Algorithm

```javascript
// Dispense medicine to patient
POST /api/pharmacy/dispense
{
  prescription_id,
  encounter_id,
  patient_id
}

// Backend logic:
1. Find all batches for medicine, sorted by expiry_date ASC
2. For each batch (earliest expiry first):
   - Take min(required_qty, batch.quantity_remaining)
   - Create stock_transaction (type='dispense')
   - Create charge line-item for patient
3. If still qty needed: throw "INSUFFICIENT_STOCK"
4. Update medicine_catalog.current_stock

// Why? Legal compliance + prevents waste
```

---

## 🏥 Admission → Discharge → Billing

### Admit Patient
```javascript
POST /api/admissions
{
  patient_id,
  doctor_id,
  room_id,      // Room becomes occupied
  bed_no,
  admission_diagnosis,
  notes
}
// Status: 'admitted'
// Room charges = 0 (calculated on discharge)
```

### Discharge Patient
```javascript
PUT /api/admissions/:id/discharge
{
  discharge_diagnosis,
  discharge_summary,
  notes
}

// Backend logic:
1. days_admitted = TODAY - admission_date
2. room_charges = days_admitted * room.daily_rate
3. Create charge line-item for room
4. Status: 'discharged'
5. Room becomes available
6. Auto-create invoice for all charges
```

---

## 🧠 AI SOAP Note Generation

### Generate Clinical Note
```javascript
POST /api/encounters/:id/ai-soap-note
{
  disease_description: "fever, cough for 3 days"  // optional
}

Response: {
  ai_note: "S: Chief complaint is fever...\nO: BP 120/80...\nA: Likely viral...\nP: Antibiotics...",
  ai_generated: true
}

// Providers:
// 1. Anthropic Claude (default if ANTHROPIC_API_KEY set)
// 2. OpenAI GPT-4 (if OPENAI_API_KEY set)
// Note is mutable until encounter status='signed'
```

---

## 📊 Key Patient Data Sync

### Patient Balance Auto-Sync
```javascript
// Triggered after: payment, refund, invoice creation

syncPatientBalance(patient_id) {
  total_billed = SUM(invoices.total_amount) WHERE status != 'refunded'
  total_paid = SUM(payments.amount) WHERE status = 'success'
  outstanding = total_billed - total_paid
  
  UPDATE patients SET outstanding, total_billed, total_paid, updated_at
}
```

### Medicine Stock Auto-Sync
```javascript
// After every stock transaction (in/out/dispense/adjustment)

syncMedicineStock(medicine_id) {
  current_stock = SUM(medicine_batches.quantity_remaining)
  UPDATE medicine_catalog SET current_stock
}
```

---

## 🔍 Common API Patterns

### Paginated Patient List
```javascript
GET /api/patients?page=1&limit=10
Response: {
  data: [{id, uhid, name, age, outstanding, ...}],
  total: 45,
  page: 1
}
```

### Patient Ledger (Financial History)
```javascript
GET /api/patients/:id/ledger
Response: {
  total_billed: 5000,
  total_paid: 3000,
  outstanding: 2000,
  transactions: [
    {date, type: 'invoice|payment', amount, description}
  ]
}
```

### Dashboard Stats
```javascript
GET /api/dashboard/stats
Response: {
  patients_today: 23,
  total_patients: 1250,
  encounters_today: 18,
  open_encounters: 5,
  queue_waiting: 8,
  pending_charges: 42,
  revenue_today: 45000,
  revenue_month: 890000,
  low_stock_items: 7,
  admitted_patients: 12,
  ...
}
```

---

## 🛡️ Role-Based Access Control

### Role Types
- **admin**: Full system access, user management, settings
- **doctor**: OPD/IPD encounters, prescriptions, discharge
- **nurse**: Patient check-in, vitals, nursing notes
- **reception**: Patient registration, appointments
- **pharmacist**: Inventory, dispensing, stock management
- **billing**: Invoice creation, payment recording

### Frontend Guard Example
```javascript
// Route protected by role
<Route path="/pharmacy" 
  element={
    <Guard roles={['pharmacist','admin']}>
      <Pharmacy />
    </Guard>
  }
/>

// If user.role not in roles array → redirects to /dashboard
```

### Backend Middleware
```javascript
// Express middleware check
app.put('/api/encounters/:id/sign', auth, can('doctor','admin'), (req,res) => {
  // Only doctor/admin can sign encounters
})

// can() middleware checks decoded JWT.role
```

---

## 🗄️ Database Quick Access

### SQLite CLI
```bash
# From backend directory
sqlite3 medos.db

# Common queries:
.tables                          # List all tables
SELECT * FROM patients LIMIT 5;  # View patients
SELECT * FROM users;             # View users
.schema encounters               # View table structure
SELECT COUNT(*) FROM invoices;   # Count invoices
```

### Key Tables for Debugging
```
patients          → UHID, outstanding balance
encounters        → Chief complaint, vitals, ai_note
admissions        → Room assignment, discharge date
charges           → Line items pending/invoiced
invoices          → Invoice_no, total_amount
payments          → Payment records, status
medicine_catalog  → Medicine list, current_stock
medicine_batches  → Batch details, expiry_date
stock_transactions→ Stock movements
```

---

## 🐛 Debugging Checklist

### Auth Issues
- [ ] JWT_SECRET set in .env?
- [ ] Token saved to localStorage?
- [ ] Bearer token included in request headers?
- [ ] Token not expired (< 10 hours old)?

### Data Issues
- [ ] Patient balance not updating? → Call syncPatientBalance()
- [ ] Stock count wrong? → Call syncMedicineStock()
- [ ] Invoice created but charges not marked? → Check charge status
- [ ] Dispense fails? → Check batch expiry, quantity available

### API Issues
- [ ] 401 Unauthorized? → Login required or token expired
- [ ] 403 Forbidden? → Role check failed
- [ ] 400 Bad Request? → Validation error, check response message
- [ ] 500 Server Error? → Check backend console logs

### Frontend Issues
- [ ] Blank screen after login? → Check useAuthStore hydration
- [ ] API calls failing? → Check VITE_API_URL environment variable
- [ ] Styles not loading? → Check index.css CSS variables
- [ ] Components not rendering? → Check route guards and role permissions

---

## 📝 Making Common Changes

### Add New Medicine
```javascript
POST /api/pharmacy/add-medicine
{
  name: "Aspirin",
  generic_name: "Acetylsalicylic Acid",
  category: "Analgesic",
  strength: "500mg",
  mrp: 50,
  selling_price: 40,
  gst_rate: 5,
  reorder_level: 100
}
```

### Add New Doctor
```javascript
POST /api/users
{
  username: "drnew",
  password: "temppass123",
  role: "doctor",
  name: "Dr. New Person",
  department_id: <uuid>,
  email: "drnew@hospital.com",
  phone: "9876543210",
  qualification: "MBBS",
  registration_no: "REG123456"
}
```

### Add Test Order to Encounter
```javascript
POST /api/test-orders
{
  encounter_id: <uuid>,
  patient_id: <uuid>,
  test_name: "CBC",
  category: "Lab",
  priority: "routine"
}

// Creates charge line-item automatically
```

### Record Test Result
```javascript
PUT /api/test-orders/:id/result
{
  result: {
    wbc: 7.5,
    rbc: 4.8,
    hemoglobin: 14.2
  },
  result_date: "2024-04-18"
}
```

---

## 🚨 Critical Business Rules

1. **Patient Outstanding**: AUTO-CALCULATED, never manually set
   - Only changes via syncPatientBalance() after financial transactions
   
2. **Medicine Dispensing**: FEFO ONLY
   - Always select earliest-expiry batch first
   - Prevents expired medicine use
   
3. **GST Calculation**: MANDATORY
   - Every charge MUST have gst_rate
   - Separate CGST/SGST for each rate
   
4. **Room Charges**: CALCULATED ON DISCHARGE
   - room_charges = days * daily_rate
   - Cannot be manually overridden
   
5. **Encounter Signing**: ONE-WAY
   - Once signed, cannot be edited
   - SOAP note locked

---

## 📚 Documentation References

- **Full Schema**: `.claude/PROJECT_SKILLS.md` (Section 3)
- **API Endpoints**: `.claude/PROJECT_SKILLS.md` (Section 5)
- **Business Logic**: `.claude/PROJECT_SKILLS.md` (Section 4)
- **Workflows**: `.claude/PROJECT_SKILLS.md` (Section 9)

---

## 🔗 External APIs

### Anthropic Claude (AI SOAP Notes)
- Endpoint: `https://api.anthropic.com/v1/messages`
- Model: `claude-3-5-haiku-20241022`
- Required: `ANTHROPIC_API_KEY` in .env
- Rate limit: Check Anthropic docs

### Environment Setup
```bash
# Backend .env
ANTHROPIC_API_KEY=sk-ant-v0-xxxxxxxxxxxxx
# Get key from: https://console.anthropic.com
```

---

## 💡 Pro Tips

1. **Always test with all 6 roles** before pushing
2. **Check network tab** to see actual API calls
3. **Use localStorage browser dev tools** to inspect auth token
4. **Enable SQL logging** in backend to debug queries:
   ```javascript
   // In knexConfig
   debug: true  // Logs all SQL queries
   ```
5. **Backup medos.db** before major changes
6. **Use `npm run dev`** not `npm start` for hot reload
7. **Check browser console** for frontend errors
8. **Restart both servers** if strange errors occur

---

**Last Updated**: April 2026 | **Version**: 2.0
