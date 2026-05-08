# MedOS Project Documentation Index

Welcome to the MedOS v3.0 project knowledge base. Use this guide to find the right documentation for your needs.

---

## 📚 Documentation Files

### 1. **PROJECT_SKILLS.md** (Start Here!)
**Comprehensive project understanding document**

Use this when you need to understand:
- ✅ What MedOS does and why it exists
- ✅ Complete technology stack details
- ✅ All 19 database entities and relationships
- ✅ All business logic functions (balance sync, FEFO, GST, etc.)
- ✅ Complete API endpoints with examples
- ✅ Frontend architecture and component hierarchy
- ✅ Security, compliance, and deployment considerations
- ✅ Common workflows (patient registration → billing)
- ✅ Troubleshooting guide
- ✅ Glossary of hospital/technical terms

**Navigation**: Organized in 16 sections. Use Ctrl+F to search.

---

### 2. **QUICK_REFERENCE.md** (Daily Development)
**Quick lookup guide for common tasks**

Use this when you need:
- 🚀 Getting started (first-time setup)
- 🔐 Authentication flow
- 💰 Billing workflow examples
- 💊 Pharmacy FEFO algorithm
- 🏥 Admission → discharge process
- 🧠 AI SOAP note generation
- 📊 Patient data sync mechanisms
- 🛡️ Role-based access control
- 🗄️ Database quick access
- 🐛 Debugging checklist
- 📝 Common code changes
- 🚨 Critical business rules
- 💡 Pro tips

**Use Case**: Coffee break reference, quick copy-paste code, testing checklist

---

### 3. **ARCHITECTURE_DECISIONS.md** (Understanding Why)
**Detailed rationale for architectural choices**

Use this when you need to understand:
- 🏗️ Why monolithic backend instead of microservices?
- 🗄️ Why SQLite for dev + PostgreSQL for prod?
- 🔐 Why JWT instead of sessions?
- 📦 Why Zustand instead of Redux?
- 🔍 Why Knex instead of Prisma/raw SQL?
- 💊 Why FEFO algorithm for pharmacy?
- 📊 Why auto-sync patient balance?
- 🧮 Why GST calculation stored per line-item?
- 🛡️ Why RBAC at 2 levels (backend + frontend)?
- 📑 Why encounter signing is one-way?
- 🏥 Why separate OPD vs IPD entities?
- 🤖 Why support multiple AI providers?

**Use Case**: Architecture reviews, design discussions, defending decisions to stakeholders

---

## 🎯 Quick Navigation by Role

### 👨‍💼 Project Manager / Product Owner
1. Read: **PROJECT_SKILLS.md** Section 1 (Overview)
2. Read: **PROJECT_SKILLS.md** Section 9 (Common Workflows)
3. Reference: **QUICK_REFERENCE.md** (glossary section)

### 👨‍💻 Frontend Developer
1. Start: **QUICK_REFERENCE.md** (setup section)
2. Read: **PROJECT_SKILLS.md** Section 6 (Frontend Architecture)
3. Read: **PROJECT_SKILLS.md** Section 3 (Database schema - needed for data binding)
4. Reference: **QUICK_REFERENCE.md** (RBAC, API patterns)

### 🖥️ Backend Developer
1. Start: **QUICK_REFERENCE.md** (setup section)
2. Read: **PROJECT_SKILLS.md** Section 4 (Business Logic Functions)
3. Read: **PROJECT_SKILLS.md** Section 5 (API Endpoints)
4. Read: **PROJECT_SKILLS.md** Section 3 (Database Schema)
5. Reference: **ARCHITECTURE_DECISIONS.md** (design rationale)

### 🏗️ DevOps / Infrastructure
1. Read: **PROJECT_SKILLS.md** Section 10 (Deployment)
2. Read: **PROJECT_SKILLS.md** Section 7 (Security)
3. Read: **ARCHITECTURE_DECISIONS.md** Section 2 (Database flexibility)
4. Check: **QUICK_REFERENCE.md** (environment setup)

### 🔍 QA / Tester
1. Start: **QUICK_REFERENCE.md** (test logins, debugging checklist)
2. Read: **PROJECT_SKILLS.md** Section 9 (Workflows to test)
3. Read: **PROJECT_SKILLS.md** Section 14 (Best practices)
4. Reference: **QUICK_REFERENCE.md** (critical business rules)

### 👴 Architect / Tech Lead
1. Read: **ARCHITECTURE_DECISIONS.md** (all 18 decisions)
2. Read: **PROJECT_SKILLS.md** Section 2 (Architecture overview)
3. Read: **PROJECT_SKILLS.md** Section 10 (Deployment)
4. Reference: **ARCHITECTURE_DECISIONS.md** Section 1 (Migration path for future)

---

## 🔗 Cross-References

### Common Questions & Where to Find Answers

| Question | Document | Section |
|----------|----------|---------|
| How do I start the project? | QUICK_REFERENCE | Getting Started |
| What's the database schema? | PROJECT_SKILLS | 3. Database Schema |
| How does billing work? | PROJECT_SKILLS | 4.3 Invoice Generation |
| How do I dispense medicine? | QUICK_REFERENCE | Pharmacy FEFO Algorithm |
| What's the API to create invoice? | PROJECT_SKILLS | 5. API Endpoints |
| How does FEFO work? | ARCHITECTURE_DECISIONS | 6. FEFO Algorithm |
| Why JWT instead of sessions? | ARCHITECTURE_DECISIONS | 3. JWT Authentication |
| How do I debug auth issues? | QUICK_REFERENCE | Debugging Checklist |
| What are the business rules? | QUICK_REFERENCE | Critical Business Rules |
| How does AI note generation work? | PROJECT_SKILLS | 4.5 AI SOAP Notes |
| What roles exist? | QUICK_REFERENCE | RBAC Section |
| How to switch to PostgreSQL? | ARCHITECTURE_DECISIONS | 2. SQLite vs PostgreSQL |
| What's the frontend structure? | PROJECT_SKILLS | 6. Frontend Architecture |
| How does patient balance sync? | PROJECT_SKILLS | 4.1 Balance Sync |
| Where are audit logs? | PROJECT_SKILLS | 7. Compliance |

---

## 📊 Key Statistics About MedOS

| Metric | Value |
|--------|-------|
| Backend File Size | 1,700+ lines (server.js) |
| Database Entities | 19 tables |
| API Endpoints | 40+ routes |
| Roles Supported | 6 types |
| Frontend Pages | 9 main pages |
| Tech Stack Items | 15 dependencies |
| Test Logins | 7 pre-configured users |
| GST Rate Tiers | 4 rates (5%, 12%, 18%, 28%) |
| OPD Status Values | 3 states |
| IPD Status Values | 3 states |

---

## 🚀 Getting Started Path

### For New Developers (30 minutes)
1. **Clone & Setup** (QUICK_REFERENCE - Getting Started)
   ```bash
   npm install (both frontend & backend)
   cd backend && node server.js
   cd frontend && npm run dev
   ```

2. **Test Login** (QUICK_REFERENCE - Test Logins)
   - Use: admin / admin123

3. **Explore Dashboard** (PROJECT_SKILLS - Section 1)
   - Understand what the system does

4. **Read Quick Reference** (QUICK_REFERENCE - Entire document)
   - 20-minute read, covers 80% of daily tasks

5. **Explore Database** (QUICK_REFERENCE - Database Quick Access)
   ```bash
   sqlite3 backend/medos.db
   .tables
   ```

### For Understanding Architecture (1 hour)
1. **Read Architecture Decisions** (ARCHITECTURE_DECISIONS - All)
   - Understand the WHY behind choices

2. **Review Database Schema** (PROJECT_SKILLS - Section 3)
   - Understand 19-entity model

3. **Trace Sample Workflow** (PROJECT_SKILLS - Section 9)
   - Mentally walk through patient registration → billing

### For Contributing Code (2 hours)
1. Complete above paths

2. **Read Business Logic** (PROJECT_SKILLS - Section 4)
   - Understand critical functions

3. **Review API Endpoints** (PROJECT_SKILLS - Section 5)
   - Know what endpoints exist

4. **Check Best Practices** (PROJECT_SKILLS - Section 14)
   - Follow coding patterns

---

## 🎓 Learning Paths by Topic

### Topic: Billing System
1. QUICK_REFERENCE → Billing Flow
2. PROJECT_SKILLS → Section 4.3 (Invoice Generation)
3. PROJECT_SKILLS → Section 4.1 (Patient Balance Sync)
4. ARCHITECTURE_DECISIONS → Section 8 (GST Calculation)

### Topic: Pharmacy Management
1. QUICK_REFERENCE → Pharmacy FEFO Algorithm
2. PROJECT_SKILLS → Section 4.2 (FEFO Algorithm)
3. ARCHITECTURE_DECISIONS → Section 6 (FEFO Rationale)
4. PROJECT_SKILLS → Section 3 (Database schema for pharmacy tables)

### Topic: OPD/Encounters
1. QUICK_REFERENCE → AI SOAP Note Generation
2. PROJECT_SKILLS → Section 4.5 (AI Notes)
3. PROJECT_SKILLS → Section 9 (OPD Workflow)
4. ARCHITECTURE_DECISIONS → Section 15 (AI Providers)

### Topic: IPD/Admissions
1. QUICK_REFERENCE → Admission → Discharge → Billing
2. PROJECT_SKILLS → Section 4.4 (Discharge & Room Charges)
3. ARCHITECTURE_DECISIONS → Section 13 (OPD vs IPD)
4. PROJECT_SKILLS → Section 9 (IPD Workflow)

### Topic: Authentication & Security
1. QUICK_REFERENCE → Authentication Flow
2. PROJECT_SKILLS → Section 7 (Security & Compliance)
3. ARCHITECTURE_DECISIONS → Section 3 (JWT)
4. ARCHITECTURE_DECISIONS → Section 9 (RBAC)

### Topic: Database & ORM
1. ARCHITECTURE_DECISIONS → Section 2 (SQLite vs PostgreSQL)
2. ARCHITECTURE_DECISIONS → Section 5 (Knex.js)
3. QUICK_REFERENCE → Database Quick Access
4. PROJECT_SKILLS → Section 3 (Schema)

---

## 🔧 Common Development Tasks

### Add New User Role
1. Check current roles: QUICK_REFERENCE → RBAC Section
2. Plan changes: ARCHITECTURE_DECISIONS → Section 9 (RBAC)
3. Implement: Update database + frontend guards
4. Test: With all test logins (QUICK_REFERENCE)

### Add New API Endpoint
1. Determine endpoint pattern: PROJECT_SKILLS → Section 5 (API Examples)
2. Check auth requirements: QUICK_REFERENCE → RBAC
3. Follow business rules: QUICK_REFERENCE → Critical Business Rules
4. Validate input: PROJECT_SKILLS → Best Practices

### Debug Patient Balance Issue
1. Run checklist: QUICK_REFERENCE → Debugging Checklist
2. Understand sync logic: PROJECT_SKILLS → Section 4.1
3. Check business rule: QUICK_REFERENCE → Critical Business Rules
4. Query database: QUICK_REFERENCE → Database Quick Access

### Switch to PostgreSQL
1. Read rationale: ARCHITECTURE_DECISIONS → Section 2
2. Follow checklist: ARCHITECTURE_DECISIONS → Production Checklist
3. Configure environment: QUICK_REFERENCE → Environment Setup
4. Test connections: PROJECT_SKILLS → Deployment

---

## 📞 When You Get Stuck

### Error: "INSUFFICIENT_STOCK"
→ QUICK_REFERENCE → Debugging → Data Issues

### Error: "Forbidden" (403)
→ QUICK_REFERENCE → RBAC Section
→ QUICK_REFERENCE → Debugging → API Issues

### Patient balance wrong
→ QUICK_REFERENCE → Critical Business Rules
→ PROJECT_SKILLS → Section 4.1

### AI notes not generating
→ QUICK_REFERENCE → AI SOAP Note Generation
→ QUICK_REFERENCE → Debugging → Frontend Issues

### JWT token expired
→ QUICK_REFERENCE → Auth Flow
→ QUICK_REFERENCE → Debugging → Auth Issues

### Can't find an API endpoint
→ PROJECT_SKILLS → Section 5 (All endpoints listed)

### Understanding a business process
→ PROJECT_SKILLS → Section 9 (Workflows)

---

## 📈 Documentation Maintenance

These files are living documents. If you:
- ✏️ Fix a bug → Update QUICK_REFERENCE with the solution
- 🆕 Add a feature → Add to PROJECT_SKILLS and QUICK_REFERENCE
- 🏗️ Refactor → Update ARCHITECTURE_DECISIONS with new rationale
- 🔍 Discover a gotcha → Add to QUICK_REFERENCE debugging section

**Last Updated**: April 2026
**Version**: 3.0
**Team**: MedOS Development

---

## 📚 External References

- **Knex.js Docs**: http://knexjs.org
- **Express.js Docs**: https://expressjs.com
- **React Router Docs**: https://reactrouter.com
- **Zustand Docs**: https://zustand-demo.vercel.app
- **Anthropic Claude Docs**: https://docs.anthropic.com
- **Indian GST Rates**: https://www.gst.gov.in

---

**Created**: April 2026  
**For**: MedOS v3.0 Hospital Management System  
**Format**: Markdown (GitHub-compatible)
