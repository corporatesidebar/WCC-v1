# WCC V1 Backend

Lean FastAPI backend for Workflow Command Center V1.

## Purpose

Adds real persistence for WCC items, channels, states, and activity logs.

No AI. No frontend redesign. No authentication yet.

## Files

```text
backend/main.py
backend/requirements.txt
backend/supabase_schema.sql
backend/README.md
```

## Required Environment Variables

Set these in Render:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ALLOWED_ORIGINS=*
```

`SUPABASE_SERVICE_ROLE_KEY` is preferred for backend-only server use. If needed for testing, `SUPABASE_ANON_KEY` is also supported.

## Supabase Setup

1. Open Supabase.
2. Go to SQL Editor.
3. Paste and run `backend/supabase_schema.sql`.
4. Confirm tables exist:
   - `wcc_items`
   - `wcc_activity`

## Render Setup

Create a new Web Service.

### Build Command

```bash
pip install -r backend/requirements.txt
```

### Start Command

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Endpoints

### GET /health

Returns service status and Supabase configuration state.

### GET /items

Returns persisted WCC items ordered by latest update.

Optional query:

```text
/items?limit=100
```

### POST /items

Creates a WCC item and writes activity.

Example body:

```json
{
  "title": "Column 4 refinement",
  "content": "Review the latest design upload.",
  "type": "upload",
  "channel": "Design",
  "state": "New",
  "short_version": "Review Column 4 changes.",
  "long_version": "The far-right oversight column needs refinement while preserving layout.",
  "must_read": "Do not redesign the page."
}
```

### PATCH /items/{id}

Updates a WCC item and writes activity.

Example body:

```json
{
  "state": "Approved",
  "channel": "Deployments"
}
```

### GET /activity

Returns latest activity logs.

Optional query:

```text
/activity?limit=100
```

### POST /activity

Creates an activity log manually.

Example body:

```json
{
  "item_id": "00000000-0000-0000-0000-000000000000",
  "action": "sent",
  "details": "Item sent to Deployments."
}
```

## Deployment Test Checklist

- `/health` returns `ok: true`
- `/health` shows `supabase_configured: true`
- Supabase tables exist
- `POST /items` creates an item
- `GET /items` returns created item
- `PATCH /items/{id}` updates state/channel
- `POST /activity` writes activity
- `GET /activity` returns latest activity
