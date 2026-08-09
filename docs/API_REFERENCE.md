# API Reference

> **Version**: 1.0.0
> **Base URL**: `/api`
> **Last Updated**: December 2025

---

## Overview

The Content Creation Platform API provides RESTful endpoints for authentication, content processing, platform management, and system configuration.

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

### Authentication

Most endpoints require JWT authentication via the `Authorization` header:

```http
Authorization: Bearer <token>
```

### Rate Limits

| Endpoint Type  | Limit        | Window     |
| -------------- | ------------ | ---------- |
| Authentication | 5 requests   | 15 minutes |
| AI Services    | 10 requests  | 1 minute   |
| General API    | 100 requests | 15 minutes |
| Admin          | 50 requests  | 15 minutes |

### Response Format

All responses follow this structure:

```json
{
  "data": { ... },        // Response payload (success)
  "error": "string",      // Error message (failure)
  "message": "string",    // Human-readable message
  "timestamp": "ISO8601"  // Response timestamp
}
```

---

## Endpoints

### Health Check

#### `GET /api/health`

Returns system health status. Supports two modes:

1. **Quick Health Check** (default) - For deployment verification and load balancers
2. **Detailed Health Check** (with `?detailed=true`) - For monitoring systems

**Authentication**: None required

**Query Parameters:**

| Parameter  | Type    | Description                                        |
| ---------- | ------- | -------------------------------------------------- |
| `detailed` | boolean | Include component health details and configuration |

**Quick Health Check Response (200 OK):**

Always returns HTTP 200 if the application is running, regardless of configuration status.

```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T10:30:00.000Z",
  "version": "1.0.0",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "builtAt": "2026-08-09T16:00:00.000Z",
  "uptime": 86400,
  "environment": "dev"
}
```

**Detailed Health Check Response (200 OK or 503):**

Returns HTTP 200 for "healthy" or "degraded" status. Returns HTTP 503 only for "unhealthy" status (critical failures like memory exhaustion).

```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T10:30:00.000Z",
  "version": "1.0.0",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "builtAt": "2026-08-09T16:00:00.000Z",
  "uptime": 86400,
  "environment": "production",
  "components": [
    {
      "name": "feature-flags",
      "status": "healthy",
      "message": "8/8 flags enabled",
      "lastChecked": "2025-12-05T10:30:00.000Z"
    },
    {
      "name": "memory",
      "status": "healthy",
      "message": "128MB / 512MB (25%)",
      "lastChecked": "2025-12-05T10:30:00.000Z"
    },
    {
      "name": "environment",
      "status": "healthy",
      "message": "All configuration present",
      "lastChecked": "2025-12-05T10:30:00.000Z"
    }
  ],
  "details": {
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    },
    "featureFlags": {
      "enabled": 8,
      "total": 8
    }
  }
}
```

**Status Values:**

- `healthy` - All components functioning normally
- `degraded` - Some non-critical issues (e.g., optional configuration missing, high memory usage)
- `unhealthy` - Critical failures (e.g., memory exhaustion)

**Component Status:**

The detailed check includes status for:

- `feature-flags` - Feature flag system health
- `memory` - Memory usage (degraded >75%, unhealthy >90%)
- `environment` - Configuration status (optional variables like JWT_SECRET, NEXT_PUBLIC_API_URL)

**Use Cases:**

- **Quick Check**: Use for load balancer health probes, deployment verification, uptime monitoring
- **Detailed Check**: Use for application monitoring, alerting on degraded performance, configuration validation

---

### Authentication

#### `POST /api/auth`

Authenticate user and receive JWT token.

**Authentication**: None required

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "username": "admin",
    "role": "admin"
  },
  "expiresIn": 86400
}
```

**Errors:**

| Status | Error               | Description                    |
| ------ | ------------------- | ------------------------------ |
| 400    | VALIDATION_ERROR    | Missing or invalid credentials |
| 401    | INVALID_CREDENTIALS | Username or password incorrect |
| 429    | RATE_LIMITED        | Too many login attempts        |

---

#### `DELETE /api/auth`

Logout and invalidate token.

**Authentication**: Required

**Request Headers:**

```http
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/validate`

Validate current token.

**Authentication**: Required

**Response (200 OK):**

```json
{
  "valid": true,
  "user": {
    "id": "user_123",
    "username": "admin",
    "role": "admin"
  },
  "expiresAt": "2025-12-06T10:30:00.000Z"
}
```

---

### Content Processing

#### `POST /api/parse`

Parse raw text input using AI.

**Authentication**: Required

**Request Body:**

```json
{
  "rawInput": "string",
  "options": {
    "format": "json" | "markdown",
    "preserveFormatting": boolean
  }
}
```

**Response (200 OK):**

```json
{
  "parsed": {
    "title": "Extracted title",
    "content": "Processed content...",
    "metadata": {
      "wordCount": 500,
      "readingTime": 3
    }
  },
  "provider": "openai"
}
```

**Errors:**

| Status | Error               | Description             |
| ------ | ------------------- | ----------------------- |
| 400    | VALIDATION_ERROR    | Invalid input           |
| 429    | RATE_LIMITED        | AI service rate limit   |
| 503    | SERVICE_UNAVAILABLE | AI provider unavailable |

---

#### `POST /api/summarize`

Generate summary from content.

**Authentication**: Required

**Request Body:**

```json
{
  "content": "string",
  "options": {
    "maxLength": number,
    "style": "concise" | "detailed" | "bullet-points"
  }
}
```

**Response (200 OK):**

```json
{
  "summary": "Generated summary text...",
  "originalLength": 5000,
  "summaryLength": 200,
  "provider": "huggingface"
}
```

---

### Image Generation

#### `POST /api/images`

Generate image from prompt.

**Authentication**: Required

**Request Body:**

```json
{
  "prompt": "string",
  "options": {
    "width": number,
    "height": number,
    "style": "realistic" | "artistic" | "cartoon"
  }
}
```

**Response (200 OK):**

```json
{
  "imageUrl": "https://...",
  "prompt": "Original prompt",
  "dimensions": {
    "width": 1024,
    "height": 1024
  },
  "provider": "huggingface"
}
```

**Errors:**

| Status | Error               | Description                |
| ------ | ------------------- | -------------------------- |
| 400    | VALIDATION_ERROR    | Invalid prompt or options  |
| 429    | RATE_LIMITED        | AI service rate limit      |
| 503    | SERVICE_UNAVAILABLE | Image provider unavailable |

---

### Platforms

#### `GET /api/platforms`

List all configured platforms.

**Authentication**: Required

**Response (200 OK):**

```json
{
  "platforms": [
    {
      "id": "platform_1",
      "name": "Twitter/X",
      "type": "social",
      "enabled": true,
      "config": {
        "maxLength": 280,
        "supportsImages": true
      }
    },
    {
      "id": "platform_2",
      "name": "LinkedIn",
      "type": "social",
      "enabled": true,
      "config": {
        "maxLength": 3000,
        "supportsImages": true
      }
    }
  ]
}
```

---

#### `PUT /api/platforms/:id`

Update platform configuration.

**Authentication**: Required (Admin)

**Request Body:**

```json
{
  "enabled": boolean,
  "config": {
    "key": "value"
  }
}
```

**Response (200 OK):**

```json
{
  "platform": {
    "id": "platform_1",
    "name": "Twitter/X",
    "enabled": false,
    "config": { ... }
  },
  "message": "Platform updated successfully"
}
```

---

### Feature Flags

#### `GET /api/feature-flags`

Get all feature flags.

**Authentication**: Required

**Response (200 OK):**

```json
{
  "flags": {
    "textParser": {
      "enabled": true,
      "implementation": "openai"
    },
    "imageGeneration": {
      "enabled": true,
      "implementation": "huggingface"
    },
    "summarization": {
      "enabled": true,
      "implementation": "huggingface"
    },
    "platformConnectors": true,
    "multiPlatformPublishing": true,
    "notificationSystem": true,
    "feedbackMechanism": true,
    "airtableIntegration": true
  }
}
```

---

#### `PUT /api/feature-flags/:flag`

Update a feature flag.

**Authentication**: Required (Admin)

**Request Body:**

```json
{
  "enabled": boolean,
  "implementation": "string"  // For AI service flags
}
```

**Response (200 OK):**

```json
{
  "flag": "textParser",
  "value": {
    "enabled": true,
    "implementation": "azure-foundry"
  },
  "message": "Feature flag updated"
}
```

---

## Error Codes

| Code                  | HTTP Status | Description               |
| --------------------- | ----------- | ------------------------- |
| `VALIDATION_ERROR`    | 400         | Request validation failed |
| `UNAUTHORIZED`        | 401         | Authentication required   |
| `INVALID_CREDENTIALS` | 401         | Wrong username/password   |
| `FORBIDDEN`           | 403         | Insufficient permissions  |
| `NOT_FOUND`           | 404         | Resource not found        |
| `RATE_LIMITED`        | 429         | Too many requests         |
| `INTERNAL_ERROR`      | 500         | Server error              |
| `SERVICE_UNAVAILABLE` | 503         | External service down     |

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
const { data } = await api.post('/parse', {
  rawInput: 'Content to parse...',
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Parse content (with token)
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"rawInput":"Content to parse..."}'

# Health check
curl http://localhost:3000/api/health?detailed=true
```

---

## Changelog

| Version | Date    | Changes                   |
| ------- | ------- | ------------------------- |
| 1.0.0   | 2025-12 | Initial API documentation |
