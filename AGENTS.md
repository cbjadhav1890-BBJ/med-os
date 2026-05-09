# MedOS Agent Guide

Use this file as the first project orientation point for future Codex work in this repository.

## Project Shape

MedOS is a hospital management system with a React/Vite frontend and a Node/Express backend.

- Frontend: `frontend/src`, Vite dev server on port `3000`, API calls proxied to `http://localhost:3001`.
- Backend: `backend/server.js` is the main application used by `npm start`, Docker, and the current frontend surface.
- Secondary backend: `backend/src/index.js` is a smaller production/test-oriented implementation. It exports `{ app, knex }`, but it starts a listener on import and does not cover the full v3 surface in `server.js`.
- Database: Knex targets SQLite by default and PostgreSQL when `DATABASE_URL` is set.
- Existing long-form notes live in `.claude/`, but verify them against code before relying on route names or table names.

## Important Current Entry Points

- `backend/server.js`: canonical full API and schema bootstrap.
- `backend/migrations/001_initial_schema.sql`: PostgreSQL schema baseline.
- `frontend/src/App.jsx`: route and role guard map.
- `frontend/src/api/client.js`: Axios instance and JWT injection.
- `frontend/src/store/authStore.js`: persisted Zustand auth state.
- `frontend/src/components/Layout.jsx`: shared shell, nav, and toast context.
- `frontend/src/index.css`: global styling system.

## Run Commands

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Docker:

```bash
docker-compose up -d --build
```

Tests:

```bash
cd backend
npm test
```

## Auth And Roles

Auth is JWT-based. The frontend stores auth in localStorage under `medos-auth-v2` and sends `Authorization: Bearer <token>`.

Default seeded users include:

- `admin` / `admin123` / `admin`
- `drpriya` / `doctor123` / `doctor`
- `drrahul` / `doctor123` / `doctor`
- `reception1` / `recep123` / `reception`
- `nurse1` / `nurse123` / `nurse`
- `billing1` / `billing123` / `billing`
- `pharma1` / `pharma123` / `pharmacist`

## Working Rules

- Prefer `rg` and direct code inspection over stale docs.
- Keep changes scoped. `backend/server.js` is large and stateful, so avoid broad refactors unless requested.
- Do not touch the user-owned `start.sh` mode change unless asked.
- When adding routes, update the matching frontend API calls and verify role guards in both `backend/server.js` and `frontend/src/App.jsx`.
- Preserve financial and inventory side effects: patient balance sync, invoice/payment updates, stock batch deductions, and audit logs.
- For frontend changes, keep the existing CSS/custom-property design language unless explicitly redesigning.

## Known Sharp Edges

- Some `.claude` docs use stale endpoint names such as `/api/billing/invoice` and `/api/encounters/:id/ai-soap-note`; current code uses `/api/invoices`, `/api/payments`, `/api/encounters/:id/ai-note`, and `/api/reports/analyze-pdf`.
- `backend/src/index.js` and `backend/server.js` duplicate concepts but are not equivalent.
- Backend tests import `backend/src/index.js`, not the full `backend/server.js` API.
- As of this pass, `cd backend && npm test -- --runInBand` fails because `backend/src/index.js` redeclares `jwt`, `bcrypt`, and `uuidv4` around line 309 after already declaring them at the top of the file.
- `npm run migrate` references `knexfile.js`, which is not currently present in the repo.
