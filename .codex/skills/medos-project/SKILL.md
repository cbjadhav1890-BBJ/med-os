---
name: medos-project
description: Use when working in the MedOS hospital management system repository, especially for understanding architecture, APIs, auth/RBAC, database tables, frontend pages, billing, pharmacy, OPD/IPD, reports, or project-specific implementation patterns.
---

# MedOS Project Skill

## First Steps

1. Read `AGENTS.md` at the repository root.
2. Use `rg` to confirm the current implementation before trusting long-form documentation.
3. Load `references/project-map.md` when you need route, schema, workflow, or file-location details.

## Current Architecture

MedOS is a full-stack hospital management system:

- Backend: Express, Knex, JWT, bcrypt, SQLite by default, PostgreSQL with `DATABASE_URL`.
- Frontend: React 18, Vite, React Router, Zustand, Axios, plain CSS.
- Runtime ports: backend `3001`, frontend `3000`.
- Main backend implementation: `backend/server.js`.
- Smaller secondary backend: `backend/src/index.js`, used by tests and `start:prod`, but missing much of the full API surface.

## Development Habits

- Treat `backend/server.js` as the source of truth for the active app unless the user is specifically working on `backend/src`.
- Check frontend route permissions in `frontend/src/App.jsx` and backend permissions in `can(...)` route middleware together.
- For API changes, inspect existing consumers with `rg "api\\." frontend/src`.
- Keep financial and inventory logic transactional in spirit: invoices, payments, charges, stock batches, stock transactions, and patient balances are coupled.
- If changing AI behavior, check both encounter note routes and PDF report analysis routes.

## Verification

- Backend unit/integration tests: `cd backend && npm test`.
- Frontend build: `cd frontend && npm run build`.
- Full manual app run: start backend with `npm start`, then frontend with `npm run dev`.
- Docker path: `docker-compose up -d --build`.

## Reference Loading

Use `references/project-map.md` for:

- File map and entry points.
- Current route groups.
- Core business workflows.
- Known documentation drift and sharp edges.
