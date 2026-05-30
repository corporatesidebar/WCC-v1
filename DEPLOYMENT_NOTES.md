# Deployment Notes

1. Run `supabase_schema.sql` in Supabase SQL editor.
2. Deploy `backend/` to Render as FastAPI.
3. Set backend environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
   - Optional: `SUPABASE_TASKS_TABLE=wcc_tasks`
4. Deploy `frontend/` to Render static site.
5. If backend URL changes, set `window.WCC_API_BASE` before loading `app.js` or update `API_BASE` in `frontend/app.js`.

No layout redesign was introduced. The implementation keeps the locked WCC structure and adds functional behavior to visible controls.
