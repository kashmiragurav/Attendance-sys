# Multi-Tenant Application Architecture

## 1. System Architecture Explanation

Our application follows a **Multi-Tenant (Shared Database, Shared Schema)** architecture. This is the most cost-effective and scalable approach for SaaS applications.

### Key Components:
- **Tenant Isolation**: Achieved using a `company_id` discriminant column in every table/collection. Every query must include this ID to ensure data isolation.
- **Authentication**: JWT (JSON Web Token) based. The token payload contains `uid`, `role`, and `company_id`.
- **Role-Based Access Control (RBAC)**: Roles define what actions a user can perform.
  - `SUPER_ADMIN`: Access to all companies, and system-wide settings.
  - `COMPANY_ADMIN`: Full access ONLY to data associated with their `company_id`.
  - `USER/EMPLOYEE`: Restricted access to their own data within their company.
- **Middleware**: Intercepts requests to:
  1. Validate the JWT.
  2. Check if the user's role allows the action.
  3. Inject `company_id` into the request or validate that the requested `company_id` matches the user's.

## 2. Database Schema (Firestore/Relational)

### `companies` Collection
```json
{
  "id": "comp_123",
  "name": "Acme Corp",
  "status": "active", // active, deactivated
  "settings": {
    "theme": "dark",
    "timezone": "UTC"
  },
  "createdAt": "2024-01-22T..."
}
```

### `users` Collection
```json
{
  "id": "user_456",
  "company_id": "comp_123", // null for SUPER_ADMIN
  "email": "admin@acme.com",
  "passwordHash": "...",
  "role": "COMPANY_ADMIN", // SUPER_ADMIN, COMPANY_ADMIN, EMPLOYEE
  "name": "John Doe",
  "status": "active"
}
```

### `attendance` (Company Specific Data)
```json
{
  "id": "att_789",
  "company_id": "comp_123", // CRITICAL: Every record must have this
  "user_id": "user_456",
  "checkIn": "...",
  "status": "present"
}
```

## 3. API Route Structure

### Super Admin Routes (`/api/super-admin`)
- `POST /companies`: Create a new company.
- `GET /companies`: List all companies.
- `PUT /companies/:id`: Update/Deactivate company.
- `POST /companies/:id/admin`: Create the first Admin user for a company.

### Company Admin Routes (`/api/admin`)
- `GET /users`: List employees of the company.
- `POST /users`: Add new employee.
- `GET /reports`: View company-wide summaries.
- `PATCH /settings`: Update company settings.

### Shared/User Routes (`/api`)
- `POST /auth/login`: Authenticate and receive JWT.
- `GET /profile`: Get own data.
- `POST /attendance/punch`: Submit attendance (automatically tagged with `company_id`).
