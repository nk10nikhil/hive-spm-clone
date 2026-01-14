# User Authentication API

This document describes the user authentication endpoints available in the Hive backend.

## Base URL

```
http://localhost:4000
```

## Endpoints

### Register a New User

Create a new user account and receive an authentication token.

```
POST /user/register
```

#### Request Headers

| Header       | Value            | Required |
| ------------ | ---------------- | -------- |
| Content-Type | application/json | Yes      |

#### Request Body

| Field     | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| email     | string | Yes      | User's email address            |
| password  | string | Yes      | Password (minimum 8 characters) |
| name      | string | No       | Display name                    |
| firstname | string | No       | First name                      |
| lastname  | string | No       | Last name                       |

#### Example Request

```bash
curl -X POST http://localhost:4000/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "firstname": "John",
    "lastname": "Doe"
  }'
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com",
  "name": "John Doe",
  "firstname": "John",
  "lastname": "Doe",
  "current_team_id": 1,
  "create_time": "2026-01-13T01:52:56.604Z"
}
```

#### Error Responses

| Status | Code                  | Message                                |
| ------ | --------------------- | -------------------------------------- |
| 400    | Bad Request           | Email and password are required        |
| 400    | Bad Request           | Please enter a valid email             |
| 400    | Bad Request           | Password must be at least 8 characters |
| 409    | Conflict              | Email already registered               |
| 500    | Internal Server Error | Registration failed. Please try again. |

---

### Login

Authenticate an existing user and receive an authentication token.

```
POST /user/login-v2
```

#### Request Headers

| Header       | Value            | Required |
| ------------ | ---------------- | -------- |
| Content-Type | application/json | Yes      |

#### Request Body

| Field    | Type   | Required | Description          |
| -------- | ------ | -------- | -------------------- |
| email    | string | Yes      | User's email address |
| password | string | Yes      | User's password      |

#### Example Request

```bash
curl -X POST http://localhost:4000/user/login-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "name": "John Doe",
  "current_team_id": 1,
  "create_time": "2026-01-13T01:52:56.594Z"
}
```

#### Error Responses

| Status | Code                  | Message                                |
| ------ | --------------------- | -------------------------------------- |
| 400    | Bad Request           | Email and password are required        |
| 400    | Bad Request           | Please enter a valid email             |
| 400    | Bad Request           | Password must be at least 6 characters |
| 400    | Bad Request           | Please sign in with OAuth              |
| 401    | Unauthorized          | Invalid email or password              |
| 403    | Forbidden             | Your account has been disabled         |
| 500    | Internal Server Error | Login failed. Please try again.        |

---

### Get Current User

Retrieve information about the currently authenticated user.

```
GET /user/me
```

#### Request Headers

| Header        | Value   | Required |
| ------------- | ------- | -------- |
| Authorization | {token} | Yes      |

#### Example Request

```bash
curl -X GET http://localhost:4000/user/me \
  -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "firstname": "John",
    "lastname": "Doe",
    "current_team_id": 1,
    "avatar_url": null
  }
}
```

#### Error Responses

| Status | Code                  | Message                 |
| ------ | --------------------- | ----------------------- |
| 401    | Unauthorized          | No token provided       |
| 401    | Unauthorized          | Invalid token           |
| 500    | Internal Server Error | Failed to get user info |

---

## Authentication

After successful login or registration, the API returns a JWT token. Include this token in the `Authorization` header for authenticated requests:

```
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Structure

The JWT token contains the following claims:

| Claim           | Description                      |
| --------------- | -------------------------------- |
| id              | User ID                          |
| email           | User email                       |
| firstname       | User first name                  |
| lastname        | User last name                   |
| current_team_id | User's current team ID           |
| salt            | Random salt for token validation |
| iat             | Issued at timestamp              |
| exp             | Expiration timestamp             |

### Token Expiration

By default, tokens expire after 7 days. This can be configured via the `JWT_EXPIRES_IN` environment variable.

---

## Development Credentials

For local development, the following default user is available:

| Field    | Value               |
| -------- | ------------------- |
| Email    | dev@honeycomb.local |
| Password | honeycomb123        |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "msg": "Error message describing what went wrong"
}
```

---

## Rate Limiting

Currently, rate limiting is not enabled by default. It can be enabled via the `features.rate_limiting` config option.

---

## CORS

The API supports CORS. Configure the allowed origin via the `cors.origin` config option (default: `http://localhost:3000`).
