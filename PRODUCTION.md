# MedOS HMS - Production Deployment Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

## Environment Setup

### 1. Configure Environment Variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with production values
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure random string (min 32 chars)
- `NODE_ENV=production`

### 2. Database Setup
```bash
# Option A: Run migrations
cd backend
npm run migrate

# Option B: Run SQL directly
psql -U postgres -d medos -f migrations/001_initial_schema.sql
```

### 3. Build & Start

#### Development
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

#### Production with Docker
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

#### Production without Docker
```bash
# Backend
cd backend && npm install && NODE_ENV=production npm start

# Frontend
cd frontend && npm install && npm run build
# Serve with nginx or any static server
```

## Health Check
```bash
curl http://localhost:3001/api/health
```

## Default Production Users
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |

**Change passwords immediately in production!**

## Security Checklist
- [ ] Change JWT_SECRET
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review audit logs regularly