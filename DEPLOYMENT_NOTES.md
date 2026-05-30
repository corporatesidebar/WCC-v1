# Deployment Notes — WCC V1.1 QA Round 3

1. Confirm `backend/__pycache__/` is not included.
2. Deploy backend files: `backend/main.py`, `backend/requirements.txt`.
3. Deploy frontend files: `frontend/index.html`, `frontend/styles.css`, `frontend/app.js`.
4. Backend environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
   - optional `SUPABASE_TASKS_TABLE=wcc_tasks`
5. Run `/health`. Expected: backend connected, Supabase configured when env vars are present.
6. QA the full task-thread flow before additional refinements.
