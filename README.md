# AttendEdge

Production-oriented college attendance management platform for teachers, students, and administrators.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Socket.IO client, Firebase Auth
- **Backend:** Node.js, Express, Prisma, PostgreSQL (Neon), Firebase Admin, Socket.IO
- **Security:** JWT sessions, hashed OTP/QR tokens, geofencing, role-based access, audit logs

## Features

| Area | Capabilities |
|------|----------------|
| Auth | Firebase + dev sign-in, JWT session exchange, role portals |
| Classes | Create classes, enrollment requests, teacher approval |
| Attendance | OTP / QR / geofence sessions, live Socket.IO updates, camera QR scan |
| Requests | Leave applications, attendance corrections |
| Reports | Student summaries, teacher CSV export |
| Admin | Platform overview, user management, audit log |

## Local Development

### 1. Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**Backend** (`backend/.env`):

- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SESSION_SECRET` — 24+ character secret
- `OTP_PEPPER`, `QR_TOKEN_SECRET` — random secrets for attendance tokens
- `CORS_ORIGIN=http://localhost:3000`
- `FIREBASE_*` — optional for production; dev tokens work without Firebase

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`
- `NEXT_PUBLIC_FIREBASE_*` — optional; dev sign-in works without Firebase

### 3. Database setup

```bash
npx prisma migrate dev --prefix backend
npx prisma db seed --prefix backend
```

### 4. Run services

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Socket.IO: http://localhost:4000

### Dev sign-in (no Firebase)

Use any email on the login screen with **Continue (Dev Sign-in)**:

- Teacher: `/teacher/login`
- Student: `/student/login`
- Admin: `/admin/login`

Dev tokens follow the format: `dev:ROLE:uid:email:name`

## Production Deployment

### Database — Neon PostgreSQL

1. Create a Neon project and copy the pooled `DATABASE_URL`.
2. Run migrations: `npx prisma migrate deploy` (from `backend/`).
3. Seed catalog data once: `npx prisma db seed`.

### Backend — Railway / Render / Fly.io

1. Deploy the `backend` directory as a Node service.
2. Set all env vars from `backend/.env.example`.
3. Ensure `CORS_ORIGIN` matches your frontend URL (e.g. `https://your-app.vercel.app`).
4. Expose port `4000` (or set `PORT`).

### Frontend — Vercel

1. Import the repo and set root directory to `frontend`.
2. Add environment variables from `frontend/.env.example`.
3. Set `NEXT_PUBLIC_API_URL` to your backend URL (for API rewrites).
4. Set `NEXT_PUBLIC_SOCKET_URL` to the same backend URL (Socket.IO connects directly).

### Firebase Authentication

1. Create a Firebase project with Email/Password and Google providers.
2. Add a web app and copy config to `NEXT_PUBLIC_FIREBASE_*`.
3. Download service account JSON → set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` on backend.

## API Overview

Base path: `/api`

| Route group | Endpoints |
|-------------|-----------|
| `/auth` | Session exchange, me, logout |
| `/classes` | Class CRUD |
| `/enrollments` | Join requests, approval |
| `/attendance` | Sessions, mark attendance |
| `/requests` | Leave & corrections |
| `/reports` | Student/teacher reports, CSV export |
| `/admin` | Overview, user management |
| `/dashboard` | Role-based dashboard data |

## Project Structure

```
frontend/     Next.js App Router (student, teacher, admin portals)
backend/      Express API + Prisma + Socket.IO
docs/         Architecture and API contracts
```
