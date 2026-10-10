# Maple — API Response Contract

Every endpoint in this API MUST follow these conventions.

## Base URL
- Local: http://localhost:8000/api/v1
- Angular dev proxy: /api/v1

## Content Type
application/json; charset=utf-8

## Success
- 200 OK      { "resource": {...} }
- 201 Created { "resource": {...} }
- 204 No Content (empty body)

## Errors
{ "error": "message" }
Optional: { "error": "message", "field": "email" }

## Status Codes
400 Malformed | 401 Not authenticated | 403 Not allowed
404 Not found | 409 Conflict | 422 Validation | 500 Server

## Conventions
- JSON keys: snake_case
- Dates: ISO 8601; dates only: YYYY-MM-DD
- Booleans: true / false
- IDs: integers
- Null: explicit null
 
## Endpoints
 
### Auth: GET /api/v1/auth/me
Returns the authenticated user and their primary household (if any).
 
**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "alex@maple.test",
    "display_name": "Alex",
    "avatar_url": null,
    "created_at": "2026-10-01T12:00:00Z"
  },
  "household": {
    "id": 1,
    "name": "The Demo Family",
    "role": "parent"
  }
}
```
If the user is not a member of any household, `"household"` is `null`:
```json
{
  "user": {
    "id": 1,
    "email": "alex@maple.test",
    "display_name": "Alex",
    "avatar_url": null,
    "created_at": "2026-10-01T12:00:00Z"
  },
  "household": null
}
```