# Deployment Notes

## Supabase
1. Open Supabase SQL Editor.
2. Run `supabase_schema.sql`.
3. Confirm table `wcc_tasks` exists.

## Backend on Render
1. Create Web Service.
2. Root directory: `backend`.
3. Build command: `pip install -r requirements.txt`.
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add Supabase environment variables.
6. Deploy.
7. Confirm `/health` returns `status: ok`.

## Frontend on Render
1. Deploy `frontend` as Static Site.
2. Update `API_BASE` in `app.js` to your backend URL.
3. Deploy.
