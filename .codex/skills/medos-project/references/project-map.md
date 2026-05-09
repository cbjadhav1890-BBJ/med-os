# MedOS Project Map

## Repository Layout

- `README.md`: quick start, login table, high-level architecture.
- `PRODUCTION.md`: deployment notes.
- `docker-compose.yml`: Postgres, backend, frontend services.
- `backend/server.js`: full v3 backend, schema bootstrap, seed data, API routes, AI/PDF handling.
- `backend/src/index.js`: smaller backend with security middleware and limited API surface.
- `backend/migrations/001_initial_schema.sql`: PostgreSQL table definitions.
- `backend/tests`: Jest/Supertest tests against `backend/src/index.js`.
- `frontend/src/App.jsx`: React route tree and role guards.
- `frontend/src/pages`: page-level feature modules.
- `frontend/src/components/Layout.jsx`: shared nav, toast context, app shell.
- `frontend/src/api/client.js`: Axios `/api` client with JWT interceptor.
- `frontend/src/store/authStore.js`: persisted Zustand auth state.
- `.claude`: older project documentation, useful but not always current.

## Backend Route Surface In `backend/server.js`

Auth and system:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/settings`
- `POST /api/settings`
- `GET /api/audit-log`

Dashboard and admin:

- `GET /api/dashboard/stats`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PUT /api/users/:id/password`
- `GET /api/departments`
- `POST /api/departments`

Front office and appointments:

- `GET /api/patients`
- `GET /api/patients/:id`
- `POST /api/patients`
- `PUT /api/patients/:id`
- `PATCH /api/patients/:id/consent`
- `GET /api/patients/:id/balance`
- `GET /api/appointments`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `GET /api/queue`
- `POST /api/queue`
- `PUT /api/queue/:id`

Clinical OPD:

- `GET /api/encounters`
- `GET /api/encounters/:id`
- `POST /api/encounters`
- `PUT /api/encounters/:id`
- `POST /api/encounters/:id/sign`
- `POST /api/encounters/:id/ai-note`
- `POST /api/encounters/:id/prescriptions`
- `DELETE /api/encounters/:eid/prescriptions/:rxid`
- `POST /api/encounters/:id/orders`
- `PUT /api/orders/:id/result`
- `POST /api/encounters/:id/suggest-medicines`
- `GET /api/icd10/search`

Pharmacy:

- `GET /api/pharmacy/catalog`
- `POST /api/pharmacy/catalog`
- `PUT /api/pharmacy/catalog/:id`
- `POST /api/pharmacy/stock/add`
- `POST /api/pharmacy/stock/adjust`
- `GET /api/pharmacy/stock/:medicine_id`
- `POST /api/pharmacy/dispense`
- `GET /api/pharmacy/dispensing`

Billing, IPD, and reports:

- `GET /api/charges`
- `POST /api/charges`
- `PATCH /api/charges/:id/waive`
- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `GET /api/payments`
- `POST /api/payments`
- `POST /api/payments/:id/refund`
- `GET /api/rooms`
- `GET /api/admissions`
- `POST /api/admissions`
- `PUT /api/admissions/:id/discharge`
- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/reports/financial`
- `GET /api/reports/stock`
- `POST /api/reports/test-ai`
- `POST /api/reports/analyze-pdf`

## Frontend Pages

- `Dashboard.jsx`: KPI cards and summary views.
- `FrontOffice.jsx`: patient registration, consent, queue.
- `Appointments.jsx`: scheduling and appointment status.
- `OPD.jsx`: encounters, notes, vitals, prescriptions, orders, AI notes, ICD search.
- `IPD.jsx`: rooms, admissions, discharge.
- `Pharmacy.jsx`: catalog, stock add/adjust, FEFO dispensing records.
- `Billing.jsx`: charges, invoices, payments.
- `Reports.jsx`: financial/stock reports and PDF report analysis.
- `Admin.jsx`: users, settings, audit logs, AI provider testing.
- `Login.jsx`: login and demo credentials UI.

## Core Workflows

Patient registration:

1. Front office creates a patient with consent metadata.
2. Backend generates a UHID.
3. Audit log records registration.

Appointment and queue:

1. Appointment links patient, doctor, schedule, and optional department.
2. Queue tokens are separate operational records.
3. Status transitions happen through update routes.

OPD encounter:

1. Doctor/nurse/admin creates encounter.
2. Vitals and notes are stored on the encounter.
3. Prescriptions and lab/radiology orders attach to the encounter.
4. AI note generation can populate `ai_note`.
5. Signing sets encounter status and locks intent at the workflow level.

Pharmacy:

1. Catalog entries define medicine metadata and prices.
2. Stock batches hold quantities and expiry dates.
3. Dispensing uses earliest-expiry batches first.
4. Dispensing creates stock transactions, dispensing records, and charge lines.
5. Catalog `current_stock` is recalculated after stock changes.

Billing:

1. Charges accumulate from manual entries, pharmacy, room charges, or clinical workflows.
2. Invoices consume selected charges.
3. Payments update invoice paid/due state.
4. Refunds and payments recalculate patient totals.

IPD:

1. Admission occupies room/bed capacity.
2. Discharge calculates admitted days and room charges.
3. Room occupancy is released on discharge.

Reports and AI:

1. Financial reports summarize invoices, payments, and expenses.
2. Stock reports highlight inventory levels.
3. PDF analysis parses uploaded reports and uses configured AI provider when a key exists; otherwise mock mode responds.

## Known Documentation Drift

- Some `.claude` docs name routes that do not match current code.
- Some docs refer to `medicine_batches`, `test_orders`, `token_queue`, or `audit_logs`; current code commonly uses `stock_batches`, `lab_orders`, `queue`, and `audit_log`.
- `README.md` mentions Anthropic only, but current report analysis can use OpenAI or Anthropic through settings/headers.
- `PRODUCTION.md` references `backend/.env.example` and `npm run migrate`; confirm those files/commands before relying on them.
- Backend Jest integration tests currently fail before execution because `backend/src/index.js` redeclares `jwt`, `bcrypt`, and `uuidv4` around line 309.
