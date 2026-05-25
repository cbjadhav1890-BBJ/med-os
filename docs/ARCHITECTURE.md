# MedOS Hospital Management System — Architecture & Design

> **Version:** 2.0.0
> **Last Updated:** 2026-05-25

---

## Table of Contents

1. [High-Level Design (HLD)](#high-level-design)
2. [Low-Level Design (LLD)](#low-level-design)
3. [Tech Stack Recommendations](#tech-stack-recommendations)
4. [Production-Readiness Checklist](#production-readiness-checklist)

---

## 1. High-Level Design (HLD)

### 1.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  React   │  │ Zustand  │  │ React    │  │ Vite     │  │ Nginx        │ │
│  │  SPA     │  │ State    │  │ Router   │  │ Build    │  │ Static Host  │ │
│  │          │  │ Store    │  │ (Routes) │  │ Tool     │  │ (Prod only)  │ │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│       │                                                                     │
│       │ HTTP (JSON) via Axios                                               │
│       │ Authorization: Bearer <JWT>                                         │
└───────┼─────────────────────────────────────────────────────────────────────┘
        │
┌───────┼─────────────────────────────────────────────────────────────────────┐
│       │                       API GATEWAY (Express)                         │
│  ┌────┴──────────────────────────────────────────────────────────────────┐  │
│  │                         Middleware Stack                               │  │
│  │  Helmet → CORS → Rate Limiter → Request Logger → JSON Parser          │  │
│  │                                                                        │  │
│  │  ┌────────────────────────────────────────────────────┐               │  │
│  │  │           Route Modules (server.js)                │               │  │
│  │  │  ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │               │  │
│  │  │  │ Auth   │ │Dashboard│ │Patients│ │Appts  │ │OPD   │  │               │  │
│  │  │  │ Routes │ │Routes  │ │Routes  │ │Routes │ │Routes│  │               │  │
│  │  │  └────────┘ └──────┘ └──────┘ └──────┘ └──────┘  │               │  │
│  │  │  ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │               │  │
│  │  │  │ Pharmacy│ │Billing│ │IPD    │ │Reports│ │Admin  │  │               │  │
│  │  │  │ Routes  │ │Routes │ │Routes │ │Routes │ │Routes │  │               │  │
│  │  │  └────────┘ └──────┘ └──────┘ └──────┘ └──────┘  │               │  │
│  │  └────────────────────────────────────────────────────┘               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│       │                                                                      │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────────────────────┐
│       │                       DATA ACCESS LAYER                              │
│  ┌────┴──────────────────────────────────────────────────────────────────┐   │
│  │                           Knex Query Builder                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐  │   │
│  │  │ Migrations│  │  Schema   │  │  Queries  │  │  Connection Pool    │  │   │
│  │  │          │  │  Builder │  │          │  │  (min:2, max:10)    │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────────────────────┐
│       │                        DATABASE LAYER                                │
│  ┌────┴──────────────────────────────────────────────────────────────────┐   │
│  │                        PostgreSQL 15+                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │   │
│  │  │ 20 Tables │ │  GIN     │ │  B-tree  │ │  FK      │ │  Views       │ │   │
│  │  │ (Schema)  │ │ Indexes  │ │ Indexes  │ │ Constraint│ │  (Future)    │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │                    Supporting Services                                  │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────────────┐  │   │
│  │  │  Redis    │  │  S3/MinIO    │  │  Bull    │  │  Prometheus +     │  │   │
│  │  │ (Cache)   │  │ (File Store) │  │ (Queue)  │  │  Grafana          │  │   │
│  │  │  ★Add     │  │  ★Add        │  │  ★Add    │  │  (Monitoring) ★Add│  │   │
│  │  └──────────┘  └──────────────┘  └──────────┘  └───────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
└───────┼──────────────────────────────────────────────────────────────────────┘
```

★ = Recommended addition for production readiness.

### 1.2 Deployment Architecture

```
                          ┌──────────────────┐
                          │   Cloud Load     │
                          │   Balancer       │
                          │   (ALB/HAProxy)  │
                          └────────┬─────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
          ┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
          │  Frontend    │ │  Frontend    │ │  Frontend    │
          │  (Nginx)     │ │  (Nginx)     │ │  (Nginx)     │
          │  Container   │ │  Container   │ │  Container   │
          └───────┬──────┘ └──────┬───────┘ └──────┬───────┘
                  │                │                │
                  └────────────────┼────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
  ┌───────▼──────┐         ┌──────▼───────┐        ┌──────▼───────┐
  │  Backend     │         │  Backend     │        │  Backend     │
  │  (Express)   │◄────────│  (Express)   │◄───────│  (Express)   │
  │  Container   │  Redis  │  Container   │  Redis │  Container   │
  └───────┬──────┘  Cache  └──────┬───────┘  Cache └──────┬───────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                          ┌───────▼───────┐
                          │  PostgreSQL   │
                          │  (Primary)    │
                          └───────┬───────┘
                                  │
                          ┌───────▼───────┐
                          │  PostgreSQL   │
                          │  (Standby)    │
                          └───────────────┘
```

### 1.3 System Context Diagram

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│   Doctors    │────▶│                      │◀────│  Pharmacists │
└──────────────┘     │                      │     └──────────────┘
┌──────────────┐     │    MedOS HMS         │     ┌──────────────┐
│   Nurses     │────▶│                      │◀────│  Billing     │
└──────────────┘     │                      │     └──────────────┘
┌──────────────┐     │  ┌────────────────┐  │     ┌──────────────┐
│  Reception   │────▶│  │  AI Service    │  │◀────│  Admin       │
└──────────────┘     │  │  (Claude/GPT)  │  │     └──────────────┘
                     │  └────────────────┘  │
┌──────────────┐     │                      │     ┌──────────────┐
│  Patients    │────▶│  ┌────────────────┐  │     │  ABHA       │
└──────────────┘     │  │  PDF Analysis  │  │     │  (Future)   │
                     │  └────────────────┘  │     └──────────────┘
┌──────────────┐     └──────────────────────┘
│  Auditors    │────────────────────────────────▶ Audit Logs
└──────────────┘
```

### 1.4 Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MedOS MODULES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  CORE MODULES                                                        │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │  │
│  │  │  Auth   │ │  User    │ │  Patient │ │ Dept   │ │  Audit       │  │  │
│  │  │  & JWT  │ │  Mgmt    │ │  Registry│ │ Mgmt   │ │  Trail       │  │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └────────┘ └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  CLINICAL MODULES                                                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │  │
│  │  │Appointment│ │  Queue   │ │ OPD      │ │ IPD      │ │  Lab &    │ │  │
│  │  │ Booking  │ │  Mgmt    │ │Encounter │ │Admission │ │ Radiology │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                             │  │
│  │  │Prescription│ │  ICD-10  │ │  AI Note │                             │  │
│  │  │  Mgmt    │ │  Codes   │ │  Gen     │                             │  │
│  │  └──────────┘ └──────────┘ └──────────┘                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  FINANCIAL MODULES                                                   │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │  │
│  │  │ Charges │ │ Invoices │ │ Payments │ │ Expenses │ │  Financial │ │  │
│  │  │ Ledger  │ │ (GST)    │ │ & Refunds│ │ Mgmt     │ │  Reports   │ │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  INVENTORY MODULES                                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │  │
│  │  │ Medicine │ │ Stock    │ │ FEFO     │ │Dispensing│ │  Stock    │ │  │
│  │  │ Catalog  │ │ Batches  │ │ Engine   │ │ Records  │ │  Reports  │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  COMPLIANCE MODULES                                                  │  │
│  │  ┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────────┐ │  │
│  │  │  DPDP Act    │ │  CBIC Rule │ │  ABHA (NDHM) │ │  GST         │ │  │
│  │  │  2023 Consent│ │  46 HSN/SAC│ │  Integration │ │  Compliance  │ │  │
│  │  └──────────────┘ └────────────┘ └──────────────┘ └──────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  AI/INTELLIGENCE MODULES                                             │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌────────┐ ┌────────────────┐       │  │
│  │  │ SOAP Note│ │  Medicine    │ │ PDF    │ │  Disease       │       │  │
│  │  │ Gen      │ │  Suggestion  │ │ Report │ │  Prediction    │       │  │
│  │  │ (Claude) │ │  (AI/Keyword)│ │ Analyze│ │  (Future)      │       │  │
│  │  └──────────┘ └──────────────┘ └────────┘ └────────────────┘       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5 Data Flow: End-to-End Patient Journey

```
Patient Visit Flow:

  1. REGISTRATION ─────────────────────────────────────────────────────────
     Reception → POST /api/patients → Save to DB → Audit Log
       ↓
  2. APPOINTMENT ─────────────────────────────────────────────────────────
     Reception → POST /api/appointments → Schedule → Queue Entry
       ↓
  3. QUEUE MANAGEMENT ────────────────────────────────────────────────────
     POST /api/queue → Waiting List → Doctor Assignment
       ↓
  4. OPD ENCOUNTER ───────────────────────────────────────────────────────
     Doctor → POST /api/encounters → Vitals → Diagnosis → AI SOAP Note
       ↓                          ↓
  5a. Prescriptions ──────┐  5b. Lab Orders ─────────────┐
     POST /api/encounters/ │    POST /api/encounters/     │
     :id/prescriptions     │    :id/orders                │
       ↓                   │      ↓                       │
  6. Pharmacy Dispense     │  6. Lab Results              │
     POST /api/pharmacy/   │     PUT /api/orders/:id/     │
     dispense → FEFO →     │     result                   │
     Deduct Stock          │      ↓                       │
       ↓                   │      ↓                       │
       └───────────────────┴──────┘                       │
                          │                                │
  7. BILLING ──────────────────────────────────────────────│──────────────
     Auto-post Charges → POST /api/invoices → GST Calc    │
     → POST /api/payments → syncPatientBalance()           │
       ↓                                                   │
  8. IPD (if needed) ──────────────────────────────────────┘
     POST /api/admissions → Room Assignment → Daily Charges
     → PUT /api/admissions/:id/discharge → Final Invoice
       ↓
  9. FOLLOW-UP
     Appointment Scheduled → Return to Step 2
```

### 1.6 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────── LAYER 1: Network ──────────────────────────┐   │
│  │  ● HTTPS/TLS (Let's Encrypt / Cloudflare)                        │   │
│  │  ● Docker internal network (backend ↔ db, no external db)        │   │
│  │  ● VPC / Security Groups (AWS/GCP/Azure)                         │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────── LAYER 2: Application ──────────────────────┐   │
│  │  ● Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)   │   │
│  │  ● CORS (whitelist frontend origin only)                          │   │
│  │  ● Rate Limiting (100 req/15min general, 10/15min login)         │   │
│  │  ● JWT-based auth (10hr expiry, bcrypt passwords)                │   │
│  │  ● Role-based access control (admin/doctor/nurse/reception/      │   │
│  │    billing/pharmacist)                                            │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────── LAYER 3: Data ─────────────────────────────┐   │
│  │  ● Prepared statements via Knex (prevents SQL injection)          │   │
│  │  ● Input validation (Joi/Zod ★Add)                               │   │
│  │  ● Immutable audit log for all financial & clinical actions      │   │
│  │  ● DPDP Act 2023 patient consent tracking                        │   │
│  │  ● Environment-based secrets (no hardcoded keys in prod)         │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.7 Scalability Considerations

| Dimension | Current State | Recommended |
|-----------|--------------|-------------|
| **Horizontal Scale (App)** | Single process | Containerized with k8s/ECS, auto-scaling |
| **Database** | Single instance | Read replicas, connection pooling (PgBouncer) |
| **Caching** | None | Redis for session store, API response cache |
| **File Storage** | Multer memory (no persistence) | S3/MinIO for uploads |
| **Async Jobs** | In-process (blocking) | Bull/BullMQ with Redis |
| **Session** | JWT (stateless) | JWT + Redis blacklist for invalidation |
| **CDN** | None | CloudFront/CDN for static assets |

---

## 2. Low-Level Design (LLD)

### 2.1 Database Schema (Entity Relationship)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  departments  │       │    users     │       │   patients   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ PK id (uuid) │◄──────│ FK dept_id   │       │ PK id (uuid) │
│ name         │       │ username     │       │ uhid (unique)│
│ code (unique)│       │ password_hash│       │ name         │
│ type         │       │ role         │       │ phone        │
│ location     │       │ name         │       │ total_billed │
│ is_active    │       │ is_active    │       │ total_paid   │
└──────┬───────┘       └──────┬───────┘       │ outstanding  │
       │                      │               │ dpdp_consent │
       │                      │               │ dpdp_date    │
       │              ┌───────┴───────┐       └──────┬───────┘
       │              │               │              │
       │      ┌───────▼────┐  ┌──────▼────────┐     │
       │      │ queue      │  │ appointments   │     │
       │      ├────────────┤  ├───────────────┤     │
       │      │ PK id      │  │ PK id         │     │
       │      │ FK patient │  │ appointment_no │     │
       │      │ token_no   │  │ FK patient_id │─────┘
       │      │ status     │  │ FK doctor_id  │
       │      │ priority   │  │ scheduled_date│
       └──────┴────────────┘  │ status        │
                              │ FK encounter  │
                              └──────┬────────┘
                                     │
       ┌─────────────────────────────┼──────────────────────────┐
       │                             │                          │
┌──────▼──────┐              ┌──────▼──────┐           ┌───────▼──────┐
│ encounters  │              │ admissions  │           │  invoices    │
├─────────────┤              ├─────────────┤           ├──────────────┤
│ PK id       │              │ PK id       │           │ PK id        │
│ encounter_no│              │ admission_no│           │ invoice_no   │
│ FK patient  │              │ FK patient  │           │ FK patient   │
│ FK doctor   │              │ FK doctor   │           │ FK encounter │
│ FK dept     │              │ FK room     │           │ line_items   │
│ vitals_json │              │ admission_dt│           │ subtotal     │
│ ai_note     │              │ discharge_dt│           │ gst_total    │
│ icd10_codes │              │ status      │           │ total_amount │
│ status      │              └──────┬──────┘           │ amount_due   │
└──┬──┬──┬────┘                     │                   │ status       │
   │  │  │                         │                   └──────┬───────┘
   │  │  │                    ┌────▼────┐                     │
   │  │  │                    │ rooms   │                     │
   │  │  │                    ├─────────┤              ┌──────▼───────┐
   │  │  │                    │ PK id   │              │  payments    │
   │  │  │                    │ room_no │              ├──────────────┤
   │  │  │                    │ type    │              │ PK id        │
   │  │  │                    │ beds_occ│              │ payment_no   │
   │  │  │                    │ rate    │              │ FK invoice   │
   │  │  │                    └─────────┘              │ FK patient   │
   │  │  │                                              │ amount       │
┌──▼──┴──▼──────┐     ┌──────────────┐                 │ status       │
│ prescriptions │     │  lab_orders  │                 │ refund_amt   │
├───────────────┤     ├──────────────┤                 └──────────────┘
│ PK id         │     │ PK id        │
│ FK encounter  │     │ FK encounter │     ┌──────────────────────┐
│ FK medicine   │     │ FK patient   │     │  charges             │
│ medicine_name │     │ test_name    │     ├──────────────────────┤
│ dosage        │     │ category     │     │ PK id                │
│ frequency     │     │ result       │     │ FK patient           │
│ duration      │     │ status       │     │ FK encounter         │
│ status        │     └──────────────┘     │ FK invoice           │
└───────┬───────┘                          │ description          │
        │                                  │ amount (qty × price) │
        │                                  │ gst_rate/gst_amount  │
        │                                  │ total_amount         │
┌───────▼────────┐    ┌─────────────────┐  │ status               │
│ medicine_catalog│    │ dispensing_record│  └──────────────────────┘
├────────────────┤    ├─────────────────┤
│ PK id          │    │ PK id           │     ┌──────────────────┐
│ name           │◄───│ FK medicine     │     │ audit_log        │
│ generic_name   │    │ FK patient      │     ├──────────────────┤
│ category       │    │ FK batch        │     │ PK id            │
│ selling_price  │    │ FK encounter    │     │ user_id          │
│ hsn_sac        │    │ quantity        │     │ action           │
│ gst_rate       │    │ total_amount    │     │ entity_type      │
│ current_stock  │    │ gst_amount      │     │ entity_id        │
│ reorder_level  │    └─────────────────┘     │ details (JSON)   │
└───────┬────────┘                            │ created_at       │
        │                                     └──────────────────┘
┌───────▼────────┐     ┌──────────────────┐
│ stock_batches  │     │ stock_transactions│
├────────────────┤     ├──────────────────┤
│ PK id          │     │ PK id            │
│ FK medicine_id │◄────│ FK medicine_id   │
│ batch_no       │     │ FK batch_id      │
│ expiry_date    │     │ transaction_type │
│ qty_remaining  │     │ quantity(+/-)    │
│ selling_price  │     │ reference_id     │
│ supplier       │     │ notes            │
└────────────────┘     └──────────────────┘
```

### 2.2 Key Data Flows with Integrity Guarantees

#### 2.2.1 Financial Integrity (Add/Subtract Pattern)

```
CREATE CHARGE:
  charges.insert({ amount, gst_amount, total_amount, status:'pending' })
  └→ No patient balance update until invoiced

CREATE INVOICE:
  1. Read all pending charges for patient
  2. Calculate: subtotal = Σ(amount), gst_total = Σ(gst_amount)
  3. Insert invoice with total_amount = subtotal + gst_total
  4. UPDATE charges SET status='invoiced', invoice_id=?
  5. UPDATE patients SET total_billed+=total_amount, outstanding+=total_amount
  6. auditLog('CREATE_INVOICE')

RECORD PAYMENT:
  1. INSERT payment { amount, status:'success' }
  2. UPDATE invoices SET amount_paid+=amount, amount_due=total-amount_paid
  3. Calculate: if amount_due <= 0 → payment_status='paid'
                 else if amount_paid > 0 → payment_status='partial'
  4. syncPatientBalance(patientId)  // full recalculation
  5. auditLog('RECORD_PAYMENT')

PROCESS REFUND:
  1. UPDATE payment SET status='refunded', refund_amount=x
  2. UPDATE invoices SET amount_paid-=x, amount_due+=x
  3. Recalculate payment_status
  4. syncPatientBalance(patientId)
  5. auditLog('PROCESS_REFUND')
```

#### 2.2.2 Inventory Integrity (FEFO Engine)

```
RECEIVE STOCK (Purchase):
  1. INSERT stock_batches { batch_no, expiry_date, quantity_received, quantity_remaining }
  2. INSERT stock_transactions { type:'purchase', quantity:+qty }
  3. syncMedicineStock(medicineId)  // full recalculation from all transactions
  4. auditLog('ADD_STOCK')

DISPENSE (FEFO - First Expiry First Out):
  1. SELECT batches WHERE medicine_id=? AND quantity_remaining > 0
     ORDER BY expiry_date ASC  // soonest-expiring first
  2. FOR EACH batch (until requested qty fulfilled):
     a. take = MIN(batch.quantity_remaining, remaining_qty)
     b. UPDATE batch SET quantity_remaining -= take
     c. INSERT stock_transactions { type:'dispense', quantity:-take }
     d. INSERT dispensing_record { medicine_id, batch_id, quantity:take, ... }
     e. remaining_qty -= take
  3. syncMedicineStock(medicineId)
  4. If any prescription linked, update prescription status to 'dispensed'
  5. auditLog('DISPENSE_MEDICINE')

STOCK ADJUSTMENT:
  1. INSERT stock_transactions { type:'adjustment', quantity:+/-n }
  2. If batch-specific, UPDATE stock_batches SET quantity_remaining +/-= n
  3. syncMedicineStock(medicineId)
  4. auditLog('STOCK_ADJUSTMENT')
```

#### 2.2.3 Patient Encounter Flow

```
CREATE ENCOUNTER:
  1. INSERT encounters { patient_id, doctor_id, department_id, status:'open' }
  2. If from appointment → UPDATE appointment SET encounter_id=?, status='completed'
  3. If from queue → UPDATE queue SET status='completed'
  4. INSERT charge { description:'OPD Consultation', category:'Consultation',
     hsn_sac:'999312', quantity:1, unit_price:<dept_rate>, amount:<rate>,
     gst_rate:0, total_amount:<rate> }
  5. auditLog('CREATE_ENCOUNTER')

SIGN ENCOUNTER:
  1. UPDATE encounters SET status='signed', signed_by=?, signed_at=NOW()
     WHERE id=? AND status='open'
  2. Lock all edits (future: front-end disables edit)
  3. auditLog('SIGN_ENCOUNTER')
```

### 2.3 API Route Design

#### 2.3.1 Route Module Breakdown

| Module | Base Path | File | Auth | Key Routes |
|--------|-----------|------|------|------------|
| Auth | `/api/auth` | server.js | Mixed | POST login, GET me |
| Dashboard | `/api/dashboard` | server.js | JWT | GET stats |
| Departments | `/api/departments` | server.js | JWT | GET list, POST create |
| Patients | `/api/patients` | server.js | JWT | CRUD + consent + balance |
| Appointments | `/api/appointments` | server.js | JWT | CRUD + status workflow |
| Queue | `/api/queue` | server.js | JWT | CRUD + status workflow |
| Encounters | `/api/encounters` | server.js | JWT | CRUD + AI + medicines |
| Pharmacy | `/api/pharmacy` | server.js | JWT | Catalog + Stock + Dispense |
| Billing | `/api/charges`, `/api/invoices`, `/api/payments` | server.js | JWT | Ledger + Invoicing + Payments |
| IPD | `/api/rooms`, `/api/admissions` | server.js | JWT | Room mgmt + Admit/Discharge |
| Reports | `/api/reports` | server.js | JWT | Financial + Stock + PDF AI |
| Admin | `/api/users`, `/api/audit-log`, `/api/settings` | server.js | JWT+admin | User CRUD + Logs + Config |

#### 2.3.2 Standard Response Envelope

```json
// Success
{ "patients": [...], "total": 100, "page": 1 }

// Error
{ "error": "Human-readable error message" }

// Single Resource
{ "id": "uuid", "name": "...", ... }
```

### 2.4 Frontend Component Tree

```
<App>
  ├── <Route path="/login"> → <Login />
  └── <Guard>
      └── <Layout>
          ├── <NavDock />       (role-filtered icons)
          ├── <ToastContainer />
          └── <Outlet>
              ├── /dashboard     → <Dashboard />
              ├── /front-office  → <FrontOffice />
              ├── /appointments  → <Appointments />
              ├── /opd           → <OPD />
              ├── /ipd           → <IPD />
              ├── /billing       → <Billing />
              ├── /pharmacy      → <Pharmacy />
              ├── /reports       → <Reports />
              └── /admin         → <Admin />
```

### 2.5 State Management (Zustand)

```javascript
authStore = {
  token: string | null,
  user: { id, username, role, name, department } | null,
  login: (username, password) => Promise<void>,
  logout: () => void,
  isAuthenticated: boolean,
  hasRole: (...roles) => boolean,
}
// Persisted to localStorage under 'medos-auth-v2'
```

### 2.6 Error Handling Strategy

```
┌────────────────────────────────────────────┐
│         GLOBAL ERROR HANDLER               │
├────────────────────────────────────────────┤
│                                            │
│  Backend (current):                        │
│  • Async route wrapper catches all         │
│    unhandled rejections → 500 JSON         │
│  • UnhandledRejection → console.error      │
│                                            │
│  Backend (recommended add):                │
│  • Centralized Express error middleware    │
│  • Structured error classes (AppError,     │
│    ValidationError, NotFoundError, etc.)   │
│  • Error serialization for logs            │
│                                            │
│  Frontend (current):                       │
│  • Axios interceptor for 401 → logout      │
│  • try/catch with toast notifications      │
│                                            │
└────────────────────────────────────────────┘
```

---

## 3. Tech Stack Recommendations

### 3.1 Recommended Stack vs Current

| Layer | Current | Recommended | Rationale |
|-------|---------|-------------|-----------|
| **Frontend Framework** | React 18 + Vite | ✓ **Keep** | Modern, fast, well-suited |
| **State Management** | Zustand 4 | ✓ **Keep** | Lightweight, sufficient |
| **Routing** | React Router 6 | ✓ **Keep** | Industry standard |
| **API Client** | Axios | ✓ **Keep** | Interceptors, wide support |
| **UI Library** | Custom CSS | → **Shadcn/Radix** | Accessible, themeable, 60% less custom CSS |
| **CSS Approach** | index.css (1185 lines) | → **Tailwind CSS 4** | Maintainability, consistency |
| **Backend Runtime** | Node 18+ (Express) | ✓ **Keep** | Mature, large ecosystem |
| **API Framework** | Express 4.18 | → **Express 5** or **Fastify** | Better async error handling, 2x throughput |
| **Auth** | JWT + bcryptjs | ✓ **Keep** | Stateless, well-implemented |
| **Validation** | Manual checks | → **Zod** | Type-safe, runtime validation |
| **DB Query Builder** | Knex 3.1 | ✓ **Keep** | Mature, migrations built-in |
| **Database** | SQLite/PostgreSQL | → **PostgreSQL 16 only** | See Section 3.2 |
| **ORM Alternative** | None | → Consider **Drizzle ORM** | Type-safe SQL, better DX than raw Knex |
| **File Storage** | Multer (memory) | → **S3/MinIO** | Persistent, scalable uploads |
| **Caching** | None | → **Redis** | Session store, API cache, rate limiting |
| **Job Queue** | In-process | → **BullMQ** | Async PDF processing, email, reports |
| **Logging** | Console.log | → **Winston/Pino** | Structured, levels, transports |
| **Monitoring** | None | → **Prometheus + Grafana** | Metrics, dashboards, alerts |
| **Testing** | Jest + Supertest | ✓ **Keep** | Well-integrated, expand coverage |
| **Type Safety** | None | → **TypeScript** | Catch bugs at compile time |
| **Container** | Docker | ✓ **Keep** | Consistent deployments |
| **Orchestration** | docker-compose | → **Kubernetes** or **ECS** | Production scaling |

### 3.2 Database Recommendation: PostgreSQL

| Criteria | PostgreSQL | SQLite (current fallback) | Recommendation |
|----------|-----------|---------------------------|----------------|
| **Concurrent Users** | Unlimited (100+ connections) | 1 writer at a time | PostgreSQL |
| **Data Integrity** | Full ACID, CHECK constraints, triggers | Limited ACID, no CHECK | PostgreSQL |
| **Backup Strategy** | pg_dump, WAL archiving, PITR | File copy only | PostgreSQL |
| **Replication** | Streaming, logical, cascading | None | PostgreSQL |
| **Extensions** | PostGIS, pg_cron, pg_partman | None | PostgreSQL |
| **GIN Indexes** | Full-text search, JSONB | Limited | PostgreSQL |
| **Performance** | Query optimizer, parallel query | Single-threaded | PostgreSQL |
| **Compliance** | Audit triggers, row-level security | Minimal | PostgreSQL |
| **Maturity** | Enterprise-grade (30+ years) | Embedded/Dev only | PostgreSQL |

**Migration Plan:**
1. Enforce `DATABASE_URL` in production (exit if SQLite detected in `NODE_ENV=production`)
2. Add PgBouncer for connection pooling
3. Enable `pg_stat_statements` for query monitoring
4. Schedule `VACUUM ANALYZE` during off-peak hours
5. Set up streaming replica for read queries

### 3.3 Additional Services (Production-Grade)

| Service | Purpose | Implementation |
|---------|---------|----------------|
| **Redis** | Cache, session store, rate-limit backing, BullMQ queue | ElastiCache / self-hosted |
| **BullMQ** | Async job processing (PDF reports, email, backups) | Worker process with Redis |
| **MinIO / S3** | Persistent file storage (lab reports, patient docs) | S3-compatible object store |
| **Prometheus + Grafana** | Application metrics (req/s, latency, error rate, DB pool) | Export via `express-prom-bundle` |
| **Sentry** | Error tracking and performance monitoring | Use `@sentry/node` |
| **GitHub Actions / CI/CD** | Automated tests, lint, build, deploy | GH Actions pipelines |
| **PgBouncer** | Connection pooling for PostgreSQL | Sidecar or standalone |

### 3.4 Migration Path: Incremental Improvements

| Phase | Effort | Impact | Changes |
|-------|--------|--------|---------|
| **Phase 1 (Now)** | Low | High | Fix critical bugs, enforce PG, add types |
| **Phase 2 (1-2 weeks)** | Medium | High | Refactor, add validation, improve logging |
| **Phase 3 (2-4 weeks)** | Medium | Medium | Redis caching, BullMQ, file storage |
| **Phase 4 (4-8 weeks)** | High | Medium | TypeScript migration, monitoring, CI/CD |
| **Phase 5 (8-12 weeks)** | High | High | Container orchestration, auto-scaling |

---

## 4. Production-Readiness Checklist

### 🔴 Critical (Must Fix Before Production)

- [ ] **Enforce PostgreSQL in production** — Exit if `DATABASE_URL` missing or SQLite detected when `NODE_ENV=production`
- [ ] **Fix `src/index.js` redeclaration bug** — Remove duplicate `require('jwt')`, `require('bcrypt')`, `require('uuidv4')` inside function bodies
- [ ] **Remove default JWT secrets** — `process.exit(1)` if JWT_SECRET matches any known default. Enforce min 32-char with entropy check
- [ ] **Fix `dangerouslySetInnerHTML`** — Sanitize AI-generated HTML in OPD.jsx and Reports.jsx with DOMPurify
- [ ] **Add database migration guard** — Run `knex migrate:latest` before starting, not inline schema creation
- [ ] **Add proper CORS in production** — Whitelist only known frontend domains, not wildcard
- [ ] **Change default passwords** — Force password change on first login for all seed users

### 🟡 High Priority

- [ ] **Structured logging** — Replace `console.log` with Pino/Winston (levels: debug/info/warn/error)
- [ ] **Centralized error middleware** — Replace inline try/catch with Express error handler
- [ ] **Add request validation** — Use Zod/Joi for all POST/PUT/PATCH endpoints
- [ ] **Paginate all list endpoints** — `/charges`, `/payments`, `/queue`, `/encounters`
- [ ] **Add ON DELETE CASCADE** — Foreign keys that should cascade (e.g., charges → invoice)
- [ ] **Fix audit log silent failure** — Remove empty catch on audit log inserts; log to separate channel
- [ ] **Add health check with dependency verification** — Check DB pool, Redis (if added), disk space
- [ ] **Create proper knexfile.js** — Separate configs for dev/staging/production/test
- [ ] **Set up database backup** — Automated pg_dump with 30-day retention
- [ ] **Add rate limiting by IP/user** — Different limits for authenticated vs. anonymous routes

### 🟢 Medium Priority

- [ ] **Add TypeScript** — Start with `backend/src/**/*.ts` conversion, then frontend
- [ ] **Set up CI/CD** — GitHub Actions: lint → test → build → deploy
- [ ] **Add integration tests** — Cover all API endpoints (currently only 22 tests for 50+ routes)
- [ ] **Docker compose health checks** — Add proper startup dependencies
- [ ] **Nginx hardening** — Add rate limiting, request size limits, gzip
- [ ] **Add Prometheus metrics** — Request duration, error rate, DB pool usage, active users
- [ ] **Implement Redis caching** — Cache department list, frequently accessed patients, medicine catalog
- [ ] **Set up Sentry/error monitoring** — Capture and alert on 5xx errors
- [ ] **Add database connection pool monitoring** — Alert when pool exhaustion nears
- [ ] **Document disaster recovery** — RPO/RTO targets, restore procedure

### 🔵 Nice to Have

- [ ] **Unify `server.js` and `src/index.js`** — Single entry point with configurable middleware
- [ ] **Add GraphQL or REST API versioning** — `/api/v1/` prefix for future compatibility
- [ ] **WebSocket for real-time updates** — Queue board, bed occupancy, notifications
- [ ] **Email/SMS notifications** — Appointment reminders, invoice alerts via BullMQ
- [ ] **Multi-tenancy** — Support for multiple hospital branches
- [ ] **ABHA (Ayushman Bharat) integration** — India's digital health ID
- [ ] **HL7/FHIR compliance** — Standard healthcare data exchange
- [ ] **Dark mode toggle** — Already has dark theme, add light mode option
- [ ] **i18n (Hindi + English)** — Multi-language support for hospital staff
- [ ] **Offline-first with PWA** — Service worker for low-connectivity areas

---

## Appendix A: File Organization (Recommended)

```
med-os/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── app.ts                # Express app factory
│   │   ├── config/               # Environment configuration
│   │   │   ├── database.ts
│   │   │   ├── auth.ts
│   │   │   └── app.ts
│   │   ├── db/
│   │   │   ├── knex.ts           # Knex instance
│   │   │   ├── migrations/       # Knex migration files
│   │   │   └── seeds/            # Seed data
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT + role guard
│   │   │   ├── validate.ts       # Zod validation middleware
│   │   │   ├── errorHandler.ts   # Global error handler
│   │   │   └── audit.ts          # Audit log middleware
│   │   ├── modules/              # Domain-driven modules
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── patients/
│   │   │   │   ├── patient.routes.ts
│   │   │   │   ├── patient.controller.ts
│   │   │   │   ├── patient.service.ts
│   │   │   │   └── patient.model.ts
│   │   │   ├── appointments/
│   │   │   ├── encounters/
│   │   │   ├── pharmacy/
│   │   │   ├── billing/
│   │   │   ├── ipd/
│   │   │   ├── reports/
│   │   │   └── admin/
│   │   ├── shared/
│   │   │   ├── errors.ts
│   │   │   ├── logger.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── ai/
│   │       ├── soapNote.ts
│   │       ├── medicineSuggestion.ts
│   │       └── pdfAnalyzer.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Shared UI components
│   │   ├── pages/                # Page-level components
│   │   ├── api/                  # API client & hooks
│   │   ├── store/                # Zustand stores
│   │   ├── lib/                  # Utilities & helpers
│   │   ├── types/                # TypeScript types
│   │   └── hooks/                # Custom hooks
│   ├── Dockerfile
│   └── package.json
├── deployment/
│   ├── k8s/                      # Kubernetes manifests
│   ├── terraform/                # Infrastructure as code
│   └── scripts/                  # CI/CD scripts
├── docker-compose.yml            # Local dev
├── docker-compose.prod.yml       # Production stack
└── AGENTS.md
```

## Appendix B: Recommended Libraries

| Purpose | Library | Current | Replace With |
|---------|---------|---------|--------------|
| Validation | Zod | None | ✅ Add |
| Logging | Pino | console.log | ✅ Replace |
| Error Tracking | Sentry | None | ✅ Add |
| Metrics | prom-client | None | ✅ Add |
| Rate Limit | express-rate-limit | ✅ Keep | Add Redis store |
| Queue | BullMQ | None | ✅ Add |
| File Store | multer-s3 | multer (memory) | ✅ Upgrade |
| Testing | Jest + Supertest | ✅ Keep | Add MSW for mocks |
| Linting | ESLint + Prettier | ESLint (no config) | ✅ Add config |
| Type Safety | TypeScript | None | ✅ Add |
| ORM/DB | Knex + Drizzle | Knex | ✅ Add Drizzle |
| State (Frontend) | Zustand | ✅ Keep | Add persist |
| UI (Frontend) | Shadcn/Radix | Custom CSS | ✅ Upgrade |
| CSS (Frontend) | Tailwind CSS | index.css | ✅ Upgrade |
| HTTP Client | Axios | ✅ Keep | Add interceptors |
| Security | Helmet | ✅ Keep | Add CSP reporting |
| Sanitize | DOMPurify | None | ✅ Add |
| PDF | pdf-parse | ✅ Keep | Add pdf-lib for gen |
| SMS/Email | None | None | ✅ Add Twilio/SES |
| Date | date-fns | None | ✅ Add |
| UUID | uuid | ✅ Keep | Switch to crypto.randomUUID() |

---

*This document serves as both architecture reference and production-readiness roadmap. Teams should treat Phase 1 items as blocking for any production deployment.*
