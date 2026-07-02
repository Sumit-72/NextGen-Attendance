# Architecture Overview

## Goals

- Support 50,000+ students and 2,000+ faculty members
- Keep the system modular, maintainable, and secure
- Enable live attendance updates without refresh
- Preserve a clean path to future microservices if needed

## Logical Layers

### Presentation
- Next.js App Router for pages, dashboards, and auth screens
- React Query for server state
- React Hook Form + Zod for form validation
- Tailwind CSS and motion primitives for UI polish

### Application
- Route handlers and backend services
- Input validation, authorization, orchestration, caching, and event publishing
- Reusable DTOs and domain types

### Domain
- Attendance sessions
- Enrollment and approval workflows
- Attendance records and correction requests
- Notifications, leave flows, audit logs, and analytics

### Infrastructure
- Prisma ORM + Neon PostgreSQL
- Firebase Authentication for identity
- Socket.IO or managed realtime for live session updates
- Optional Redis for caching, rate limiting, and job queues

## Recommended Module Boundaries

- auth
- users
- departments
- courses
- subjects
- classes
- enrollments
- attendance
- otp
- qr
- geo-fence
- notifications
- reports
- analytics
- admin
- audit

## Scalability Strategy

- Keep API requests stateless
- Push live updates through WebSockets rather than polling
- Index all attendance and enrollment lookup paths
- Use pagination for every list endpoint
- Use background jobs for notifications, exports, and predictions
- Cache heavy dashboard aggregates where safe

## Security Strategy

- Verify Firebase ID tokens server-side
- Map Firebase identities to internal users and roles
- Enforce authorization on every protected endpoint
- Hash OTPs and refresh tokens
- Record IP, user agent, device fingerprint, and GPS metadata
- Rate limit login and attendance endpoints
- Log all privileged actions to audit tables

## Data Flow Summary

1. User signs in with Firebase.
2. Backend validates the token and resolves role/profile.
3. Teacher opens an attendance session.
4. Students submit session proof via OTP, QR, or geo validation.
5. Backend validates anti-abuse controls and stores attendance.
6. Realtime channel notifies dashboards.
7. Reports and analytics aggregate from normalized tables.
