# API Contracts

Base path: `/api`

## Health

### `GET /health`

Returns service availability.

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "attendance-backend",
    "timestamp": "2026-07-01T10:00:00.000Z"
  }
}
```

## Authentication

### `POST /auth/session`

Exchanges a Firebase ID token for an internal session token.

Request:

```json
{
  "idToken": "firebase-or-dev-token",
  "roleHint": "STUDENT"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid",
      "firebaseUid": "firebase-uid",
      "email": "student@example.edu",
      "fullName": "Student Name",
      "role": "STUDENT",
      "status": "ACTIVE",
      "departmentId": null
    },
    "sessionToken": "jwt-session-token",
    "expiresIn": "7d",
    "permissions": ["class:view", "attendance:mark", "analytics:view"]
  }
}
```

### `GET /auth/me`

Returns the current authenticated session user.

### `POST /auth/logout`

Returns a signed-out acknowledgement. Session revocation is handled by the client or a refresh-token flow when introduced.

## Dashboards

### `GET /dashboard`

Returns the current user dashboard based on role.

### `GET /dashboard/student`

Returns the student dashboard payload.

### `GET /dashboard/teacher`

Returns the teacher dashboard payload.

## Response Contract

All successful endpoints use:

```json
{
  "success": true,
  "data": {}
}
```

Validation and domain failures use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```