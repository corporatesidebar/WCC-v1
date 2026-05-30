# WCC Functional V1

Locked-layout implementation for WCC Communication Management Infrastructure.

## Frontend
- `frontend/index.html`
- `frontend/styles.css`
- `frontend/app.js`

Set the backend URL in `frontend/app.js`:

```js
const API_BASE = window.WCC_API_BASE || 'https://your-wcc-backend.onrender.com';
```

## Backend
- FastAPI
- Supabase REST persistence
- Local in-memory fallback if Supabase env vars are not set

Required Render environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TASKS_TABLE=wcc_tasks
```

Start locally:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
