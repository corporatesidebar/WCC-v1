# Deployment Notes

## Frontend
Deploy the `frontend/` folder as the static site.

## Backend
Deploy the `backend/` folder to Render as a FastAPI service.

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Environment variables

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_TASKS_TABLE=wcc_tasks
```

## Cache cleanup

No `backend/__pycache__` or `main.cpython-313.pyc` files are included.


## V1.2 QA Fix Batch 3
- Search remains in the left navigation area with clean exit behavior.
- Task-thread files now support upload progress feedback, persisted file references/data URLs, task files, latest files, and downloads using readable WCC filenames.
- Comment filters were not added; thread comments remain full chronological conversation history.
- Right sidebar uses Task Files for selected task files and Latest Files for global recent files.
- System Health / TEST Environment now display operational status from /health and auto-refresh without manual test-note inputs.
