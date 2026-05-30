# WCC V1 — Phase 1 Deployment Notes

**Package:** WCC_V1_PHASE1_COMPLETE  
**Backend version:** `wcc-v1.2.5-phase1`  
**Scope:** Comments, Files, Downloads, Complete → Archive only

---

## What this package contains

- `frontend/` — static WCC UI (index.html, app.js, styles.css)
- `backend/` — FastAPI task/thread API (main.py, requirements.txt)
- `supabase_schema.sql` — database schema (Phase 2 persistence)
- `TEST_CHECKLIST.md` — Phase 1 QA sign-off checklist
- `GITHUB_COMMIT_MESSAGE.txt` — suggested commit message

---

## Deploy steps (Render)

### 1. Backend

1. Deploy `backend/` to your existing Render web service (e.g. `executive-engine-os.onrender.com`).
2. Set environment variables if using Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`)
   - `SUPABASE_TASKS_TABLE` (optional, default: `wcc_tasks`)
3. Run `supabase_schema.sql` in Supabase SQL editor if not already applied.
4. Confirm health: `GET https://<your-backend>/health` returns `"version": "wcc-v1.2.5-phase1"`.

### 2. Frontend

1. Host `frontend/` as static files (Render static site, Netlify, or same service with static mount).
2. Default API target in `app.js`:
   - `https://executive-engine-os.onrender.com`
3. Override for local/staging:
   - Set `window.WCC_API_BASE` before app load, or
   - `localStorage.setItem('WCC_API_BASE', 'http://localhost:8000')`

### 3. Do not deploy

- `backend/__pycache__/`
- Any `.pyc` files

---

## Phase 1 changes summary

- Unlimited comments in task thread
- Files shown in chronological thread timeline with **Download File**
- Real file downloads from stored upload data (no empty placeholders)
- **In Progress** removed from thread; no auto status change on comment
- **Complete** → confirmation → immediate Archive (no refresh required)
- Backend preserves `data_url` on file save/load

---

## Post-deploy verification

Run every item in `TEST_CHECKLIST.md` on the **live** URL before marking Phase 1 QA complete.

Phase 2 (persistence, search, recents) is **not** included in this package scope.

---

## Rollback

Keep previous deploy artifact (`WCC_V1_2_QA_FIX_BATCH_4`) available. Redeploy prior frontend + backend if Phase 1 QA fails.
