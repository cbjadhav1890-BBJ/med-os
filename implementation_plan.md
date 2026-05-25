# MedOS HMS - Production Readiness Implementation Plan

This plan outlines the steps and code changes required to resolve syntax errors, add robust security controls, improve data validations, and make the application completely production-ready.

## User Review Required

> [!IMPORTANT]
> - **JWT_SECRET Enforcement**: In production mode (`NODE_ENV=production`), the backend will now crash on startup if `JWT_SECRET` is not set or matches default development values. A secure, random string (min 32 characters) must be configured in your production environment variables.
> - **Rate Limiting**: We are enabling rate limiting (100 requests per 15 minutes per IP) on all API endpoints, and a stricter brute-force protection limit (10 attempts per 15 minutes per IP) on the `/api/auth/login` endpoint.
> - **Input Validation**: We will restrict patient names from containing HTML characters (`<` and `>`) to mitigate Stored XSS risks, and validate that charge amounts and quantities are positive.

## Proposed Changes

---

### Component: Backend Security & Stability

We will enhance the backend codebase to support standard production practices, resolve bugs preventing test completion, and add required security features.

#### [MODIFY] [index.js](file:///Users/sai/Documents/Gaurav/workspace/NodeProject/med-os/backend/src/index.js)
- Fix compilation/Jest crash by removing redeclarations of `jwt`, `bcrypt`, and `uuidv4` on lines 309-311.
- Add age validation to the patient registration endpoint (`app.post('/api/patients')`).
- Add XSS check to patient names to prevent stored payloads.
- Enforce positive values for charge amounts in billing routes.
- Add a catch-all 404 handler for unmatched API routes.

#### [MODIFY] [server.js](file:///Users/sai/Documents/Gaurav/workspace/NodeProject/med-os/backend/server.js)
- Import and use `helmet` for secure HTTP headers.
- Import and use `express-rate-limit` for global API rate limiting and dedicated login brute-force protection.
- Enforce that `JWT_SECRET` must be set and secure when running in production mode.
- Validate `app.post('/api/charges')` to reject negative/zero amounts and invalid discount/GST rates.
- Prevent XSS by blocking names with HTML characters (`<` or `>`) in patient registration.
- Add a catch-all 404 handler for unmatched API routes.

#### [NEW] [knexfile.js](file:///Users/sai/Documents/Gaurav/workspace/NodeProject/med-os/backend/knexfile.js)
- Create a multi-environment Knex configuration supporting SQLite (for local dev) and PostgreSQL (for production if `DATABASE_URL` is set). This officially restores the `npm run migrate` command.

#### [NEW] [20260525000000_initial_schema.js](file:///Users/sai/Documents/Gaurav/workspace/NodeProject/med-os/backend/migrations/20260525000000_initial_schema.js)
- Create a JS migration script that reads and executes `001_initial_schema.sql` automatically when database type is PostgreSQL, keeping a single source of truth for PostgreSQL deployment.

---

### Component: Frontend Production Nginx

We will add production-grade HTTP security headers to Nginx to prevent XSS, MIME-sniffing, and clickjacking attacks.

#### [MODIFY] [nginx.conf](file:///Users/sai/Documents/Gaurav/workspace/NodeProject/med-os/frontend/nginx.conf)
- Add secure HTTP response headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.).

## Verification Plan

### Automated Tests
- Run `npm test` inside the `backend/` directory to verify all unit and integration tests compile and pass successfully.
- Start the application and run `node qa_test.js` to execute the full destructive QA test suite (verifying auth, privilege escalation, brute force blocking, invalid inputs, and security headers).

### Manual Verification
- Verify backend boots successfully in development mode using SQLite and prints clean logs.
- Verify health check endpoint returns 200 OK: `curl http://localhost:3001/api/health`.
