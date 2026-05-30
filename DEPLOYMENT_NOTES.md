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
