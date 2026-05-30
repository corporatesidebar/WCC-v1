# Deployment Notes

1. Run `supabase_schema.sql` in Supabase SQL editor before deploying this version.
2. Backend environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
   - optional `SUPABASE_TASKS_TABLE=wcc_tasks`
3. Deploy backend to Render.
4. Deploy frontend static files to Render.
5. If backend URL differs, set `window.WCC_API_BASE` before loading `app.js` or update `API_BASE` in `frontend/app.js`.

The existing locked page layout is preserved. The modal is used only for task-thread creation/editing and file/participant additions.
