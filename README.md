# MedOS HMS v2.0

## Quick Start

Double-click `start.bat` — it installs everything and launches both servers.

Or manually:

```bash
# Terminal 1
cd backend && npm install && node server.js

# Terminal 2
cd frontend && npm install && npm run dev
```

Open http://localhost:3000

## Logins
| Username | Password | Role |
|---|---|---|
| admin | admin123 | Administrator |
| drpriya | doctor123 | Doctor (General Medicine) |
| drrahul | doctor123 | Doctor (Cardiology) |
| reception1 | recep123 | Reception |
| nurse1 | nurse123 | Nurse |
| billing1 | billing123 | Billing |

## Architecture
- **Backend**: Node.js + Express + SQLite (swap to PostgreSQL: change DATABASE_URL)
- **Frontend**: React + Vite + Zustand
- **Auth**: JWT with role-based access control
- **AI Notes**: Claude Haiku (set ANTHROPIC_API_KEY in backend/.env)

## Environment Variables (backend)
```
PORT=3001
JWT_SECRET=your-secret-here
ANTHROPIC_API_KEY=sk-ant-...   # Optional: for AI SOAP notes
FRONTEND_URL=http://localhost:3000
```
