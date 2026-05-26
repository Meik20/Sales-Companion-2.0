# 📚 API Documentation - Sales Companion 2.0

## Overview

API REST Backend for Sales Companion 2.0 platform. Built with Express.js + TypeScript + Firebase.

**Base URLs:**

- Development: `http://localhost:8000`
- Production: `https://api.salescompanion.cm`

**Authentication:** Bearer Token (Firebase JWT)

---

## Authentication Endpoints

### Register User

```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "independent"
}

Response: 201 Created
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Login User

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response: 200 OK
{
  "user": {...},
  "token": "jwt-token"
}
```

---

## Pipeline Endpoints

### List Pipeline Items

```
GET /api/pipeline
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "item-1",
    "userId": "user-id",
    "companyId": "company-id",
    "companyName": "Company A",
    "status": "prospection",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Create Pipeline Item

```
POST /api/pipeline
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyId": "company-123",
  "companyName": "Company Name",
  "companySector": "Technology",
  "companyCity": "Douala",
  "status": "prospection",
  "notes": "Initial contact"
}

Response: 201 Created
```

### Update Pipeline Item

```
PUT /api/pipeline/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "negotiation",
  "notes": "Updated notes"
}

Response: 200 OK
```

### Delete Pipeline Item

```
DELETE /api/pipeline/{id}
Authorization: Bearer {token}

Response: 200 OK
```

### Get Pipeline Stats

```
GET /api/pipeline/stats/summary
Authorization: Bearer {token}

Response: 200 OK
{
  "total": 100,
  "prospection": 60,
  "negotiation": 25,
  "conclusion": 10,
  "lost": 5
}
```

---

## Companies Endpoints

### Search Companies

```
GET /api/companies?query={query}&sector={sector}&city={city}
Authorization: Bearer {token}

Parameters:
- query: Search text (optional)
- sector: Industry sector (optional)
- city: Location (optional)

Response: 200 OK
[
  {
    "id": "company-1",
    "name": "Company Name",
    "sector": "Technology",
    "city": "Douala",
    "phone": "+237123456789",
    "email": "contact@company.cm",
    "employees": 50
  }
]
```

---

## Admin Endpoints

### Get Dashboard Stats

```
GET /api/admin/stats
Authorization: Bearer {token}
X-Admin: true (implicit via custom claims)

Response: 200 OK
{
  "totalUsers": 150,
  "totalCompanies": 2500,
  "totalPipelineItems": 5000,
  "totalSearchesToday": 450,
  "activeUsers": 89,
  "newUsersThisWeek": 12
}
```

### List All Users

```
GET /api/admin/users
Authorization: Bearer {token}

Response: 200 OK
{
  "items": [
    {
      "uid": "user-1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "member",
      "plan": "starter",
      "active": true
    }
  ]
}
```

### Update User

```
PATCH /api/admin/users/{uid}
Authorization: Bearer {token}
Content-Type: application/json

{
  "active": false,
  "role": "manager"
}

Response: 200 OK
```

### Delete User

```
DELETE /api/admin/users/{uid}
Authorization: Bearer {token}

Response: 200 OK
```

---

## Team Endpoints

### List Team Members

```
GET /api/team/members
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "uid": "member-1",
    "email": "member@example.com",
    "name": "Team Member",
    "role": "member",
    "managerUid": "manager-id",
    "active": true
  }
]
```

### Create Team Assignment

```
POST /api/team/assignments
Authorization: Bearer {token}
Content-Type: application/json

{
  "pipelineItemId": "item-1",
  "memberId": "member-1"
}

Response: 201 Created
```

### List Team Assignments

```
GET /api/team/assignments
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "assignment-1",
    "pipelineItemId": "item-1",
    "memberId": "member-1",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## Support Endpoints

### List Support Threads

```
GET /api/support/threads
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "thread-1",
    "userId": "user-id",
    "subject": "Issue title",
    "status": "open",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Create Support Ticket

```
POST /api/support/threads
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Issue description",
  "message": "Detailed message"
}

Response: 201 Created
```

### Reply to Support Thread

```
POST /api/support/threads/{id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Reply text"
}

Response: 201 Created
```

---

## Error Responses

### Validation Error (400)

```json
{
  "message": "Invalid input",
  "errors": [{ "field": "email", "message": "Invalid email format" }]
}
```

### Unauthorized (401)

```json
{
  "message": "Unauthorized - Missing or invalid token"
}
```

### Forbidden (403)

```json
{
  "message": "Forbidden - Insufficient permissions"
}
```

### Not Found (404)

```json
{
  "message": "Resource not found"
}
```

### Server Error (500)

```json
{
  "message": "Internal server error"
}
```

---

## Rate Limiting

- **Standard:** 100 requests per 15 minutes per IP
- **Authenticated:** 1000 requests per day per user
- **Admin:** Unlimited

Headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

---

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require Bearer token authentication.

**Header Format:**

```
Authorization: Bearer {firebase_jwt_token}
```

**Getting Token:**

1. Register/Login via `/auth/register` or `/auth/login`
2. Token is returned in response
3. Use token in Authorization header for subsequent requests

---

## Environment Variables

```env
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=sales-companion-237
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
WEB_ORIGIN=https://salescompanion.cm
CORS_ORIGIN=https://salescompanion.cm
LOG_LEVEL=info
```

---

## Webhooks (Future)

- Pipeline item status changes
- User registration events
- Support ticket updates
- Team member additions

---

## Versioning

Current API Version: **2.0.0**

---

**Last Updated:** April 30, 2026
**Support:** support@salescompanion.cm
