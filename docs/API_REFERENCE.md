# API Reference - GS Stream Digest

## Base URL

```
Development: http://localhost:3000
Staging: https://gs-digest-staging.fly.dev
Production: https://gs-digest-api.grand-shooting.com
```

## Authentication

L'API utilise l'authentification Bearer Token (JWT) ou API Key.

### JWT Token

```http
Authorization: Bearer <jwt_token>
```

### API Key

```http
X-API-Key: <api_key>
```

## Rate Limiting

- **Par défaut** : 100 requêtes par minute
- **API Key** : Configurable (60-1000 req/min)

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "req_123abc"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "req_123abc"
  }
}
```

## Endpoints

### Authentication

#### POST /api/auth/login

Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "role": "admin",
    "accountId": "acc_456"
  }
}
```

#### POST /api/auth/logout

Logout current user.

**Response:**
```json
{
  "success": true
}
```

#### GET /api/auth/me

Get current user information.

**Response:**
```json
{
  "id": "usr_123",
  "email": "user@example.com",
  "role": "admin",
  "accountId": "acc_456",
  "metadata": { ... }
}
```

### API Keys

#### POST /api/auth/api-keys

Create new API key.

**Request:**
```json
{
  "name": "Production API Key",
  "expiresIn": 2592000  // 30 days in seconds (optional)
}
```

**Response:**
```json
{
  "id": "key_123",
  "name": "Production API Key",
  "key": "sk_live_abc123...",  // Only shown once
  "keyPrefix": "sk_live_",
  "createdAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-01-31T00:00:00Z"
}
```

#### GET /api/auth/api-keys

List all API keys for current user.

**Response:**
```json
{
  "keys": [
    {
      "id": "key_123",
      "name": "Production API Key",
      "keyPrefix": "sk_live_",
      "lastUsedAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### DELETE /api/auth/api-keys/:id

Revoke an API key.

**Response:**
```json
{
  "success": true
}
```

### Digests

#### GET /api/digests

List all digests (filtered by user permissions).

**Query Parameters:**
- `limit` (number): Max items to return (1-100, default: 20)
- `offset` (number): Pagination offset (default: 0)
- `accountId` (string): Filter by account (superadmin only)
- `isActive` (boolean): Filter by active status
- `sortBy` (string): Sort field (name, createdAt, updatedAt)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "digests": [
    {
      "id": "dig_123",
      "name": "Daily File Share Digest",
      "description": "Daily summary of shared files",
      "accountId": "acc_456",
      "filters": {
        "eventTypes": ["file.share"],
        "sourceApplications": ["gs-sourcing"]
      },
      "schedule": "0 9 * * *",
      "recipients": ["team@example.com"],
      "templateId": "tpl_789",
      "isActive": true,
      "isPaused": false,
      "lastCheckAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/digests/:id

Get digest details by ID.

**Response:**
```json
{
  "id": "dig_123",
  "name": "Daily File Share Digest",
  "description": "Daily summary of shared files",
  "accountId": "acc_456",
  "filters": {
    "eventTypes": ["file.share"],
    "sourceApplications": ["gs-sourcing"],
    "maxAgeHours": 24
  },
  "schedule": "0 9 * * *",
  "timezone": "Europe/Paris",
  "recipients": ["team@example.com"],
  "testRecipients": ["test@example.com"],
  "templateId": "tpl_789",
  "template": { ... },
  "isActive": true,
  "isPaused": false,
  "lastEventUid": "evt_abc",
  "lastCheckAt": "2024-01-01T00:00:00Z",
  "recentRuns": [
    {
      "id": "run_123",
      "runAt": "2024-01-01T09:00:00Z",
      "eventsCount": 15,
      "emailsSent": 3,
      "status": "success"
    }
  ],
  "createdBy": "usr_123",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### POST /api/digests

Create a new digest.

**Request:**
```json
{
  "name": "Weekly Summary",
  "description": "Weekly activity summary",
  "filters": {
    "eventTypes": ["file.share", "file.upload"],
    "sourceApplications": ["gs-sourcing"],
    "maxAgeHours": 168
  },
  "schedule": {
    "type": "weekly",
    "weekDays": [1],  // Monday
    "weeklyTime": "09:00",
    "timezone": "Europe/Paris"
  },
  "recipients": ["team@example.com"],
  "testRecipients": ["test@example.com"],
  "templateId": "tpl_789",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "dig_124",
  "name": "Weekly Summary",
  ...
}
```

#### PUT /api/digests/:id

Update an existing digest.

**Request:**
```json
{
  "name": "Updated Name",
  "recipients": ["newteam@example.com"],
  "isPaused": false
}
```

**Response:**
```json
{
  "id": "dig_123",
  "name": "Updated Name",
  ...
}
```

#### DELETE /api/digests/:id

Delete a digest.

**Response:**
```
204 No Content
```

#### POST /api/digests/:id/test

Test a digest with sample events.

**Request:**
```json
{
  "recipientEmail": "test@example.com",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent",
  "eventsFound": 10,
  "emailSent": true
}
```

#### POST /api/digests/:id/send

Trigger immediate digest send.

**Response:**
```json
{
  "success": true,
  "message": "Digest triggered",
  "runId": "run_125"
}
```

### Templates

#### GET /api/templates

List all available templates.

**Query Parameters:**
- `limit` (number): Max items (1-100, default: 20)
- `offset` (number): Pagination offset
- `isGlobal` (boolean): Filter global templates

**Response:**
```json
{
  "templates": [
    {
      "id": "tpl_789",
      "name": "File Share Template",
      "description": "Template for file sharing events",
      "isGlobal": true,
      "isDefault": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/templates/:id

Get template details.

**Response:**
```json
{
  "id": "tpl_789",
  "name": "File Share Template",
  "description": "Template for file sharing events",
  "accountId": null,
  "isGlobal": true,
  "isDefault": false,
  "subjectLiquid": "{{ eventsCount }} new file(s) shared",
  "bodyHtmlLiquid": "<html>...</html>",
  "bodyTextLiquid": "Plain text version...",
  "previewData": { ... },
  "createdBy": "usr_123",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### POST /api/templates

Create a new template.

**Request:**
```json
{
  "name": "Custom Template",
  "description": "My custom template",
  "subjectLiquid": "{{ digest.name }} - {{ eventsCount }} events",
  "bodyHtmlLiquid": "<html>...</html>",
  "bodyTextLiquid": "Text version...",
  "isGlobal": false
}
```

#### PUT /api/templates/:id

Update a template.

#### DELETE /api/templates/:id

Delete a template.

#### POST /api/templates/:id/preview

Preview template with sample data.

**Request:**
```json
{
  "events": [ ... ],  // Optional sample events
  "useRealEvents": false,
  "filters": { ... }  // Optional filters for real events
}
```

**Response:**
```json
{
  "subject": "Rendered subject",
  "bodyHtml": "<html>...</html>",
  "bodyText": "Plain text version"
}
```

### Emails

#### GET /api/emails

Get email history.

**Query Parameters:**
- `limit` (number): Max items (1-100)
- `offset` (number): Pagination offset
- `digestId` (string): Filter by digest
- `recipient` (string): Filter by recipient
- `status` (string): Filter by status

**Response:**
```json
{
  "emails": [
    {
      "id": "eml_123",
      "digestRunId": "run_123",
      "recipient": "user@example.com",
      "subject": "10 new files shared",
      "status": "delivered",
      "resendId": "re_abc123",
      "sentAt": "2024-01-01T09:00:00Z",
      "deliveredAt": "2024-01-01T09:00:05Z",
      "openedAt": "2024-01-01T10:00:00Z",
      "clickedAt": null,
      "openCount": 3,
      "clickCount": 0
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/emails/:id

Get email details.

### Monitoring

#### GET /api/monitoring/stats

Get monitoring statistics (superadmin only).

**Query Parameters:**
- `accountId` (string): Filter by account
- `dateFrom` (date): Start date
- `dateTo` (date): End date

**Response:**
```json
{
  "totalDigests": 42,
  "activeDigests": 35,
  "totalAccounts": 10,
  "totalEmailsSent": 1500,
  "emailsSentLast24Hours": 120,
  "emailsSentLast7Days": 850,
  "averageOpenRate": 0.65,
  "averageClickRate": 0.23,
  "topDigestsByVolume": [ ... ],
  "statsByAccount": [ ... ]
}
```

#### GET /api/monitoring/export

Export statistics as XLSX (superadmin only).

**Query Parameters:**
- Same as /stats endpoint
- `format` (string): Export format (xlsx, csv, json)

**Response:**
Binary file download or JSON data.

### Webhooks

#### POST /api/webhooks/resend

Receive Resend webhook events.

**Headers:**
```
X-Resend-Signature: signature_value
```

**Request:**
```json
{
  "type": "email.delivered",
  "created_at": "2024-01-01T00:00:00Z",
  "data": {
    "email_id": "re_abc123",
    "to": ["recipient@example.com"],
    "subject": "Digest"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### Health

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "nats": "healthy",
    "resend": "healthy"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `INVALID_TOKEN` | Invalid or expired token |
| `PERMISSION_DENIED` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

## Pagination

All list endpoints support pagination:

```
GET /api/digests?limit=20&offset=40
```

Response includes pagination metadata:

```json
{
  "data": [ ... ],
  "total": 100,
  "limit": 20,
  "offset": 40,
  "hasMore": true
}
```

## Filtering

Most endpoints support filtering:

```
GET /api/digests?isActive=true&sortBy=createdAt&sortOrder=desc
```

## Rate Limiting

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704067200
```

## Webhooks

### Resend Events

The following events are supported:

- `email.sent` - Email was sent
- `email.delivered` - Email was delivered
- `email.opened` - Email was opened
- `email.clicked` - Link was clicked
- `email.bounced` - Email bounced
- `email.complained` - Marked as spam

### Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}
```

## SDKs

### JavaScript/TypeScript

```typescript
import { DigestClient } from '@gs-digest/sdk';

const client = new DigestClient({
  apiKey: 'sk_live_...',
  baseUrl: 'https://api.example.com'
});

// List digests
const digests = await client.digests.list();

// Create digest
const digest = await client.digests.create({
  name: 'My Digest',
  // ...
});
```

### cURL Examples

```bash
# List digests
curl -X GET https://api.example.com/api/digests \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create digest
curl -X POST https://api.example.com/api/digests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Digest",
    "filters": {...},
    "schedule": {...},
    "recipients": [...]
  }'

# Test digest
curl -X POST https://api.example.com/api/digests/dig_123/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "test@example.com"
  }'
```

---

*API Reference v1.0.0 - Last updated: 2024-11-26*