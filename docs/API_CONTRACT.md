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