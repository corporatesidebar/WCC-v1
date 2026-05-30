# WCC V1 — Phase 1 Complete

Communication Management Infrastructure — Phase 1 patch.

## Scope (this package)

- Comments (unlimited, chronological thread)
- Files (in-thread timeline with uploads)
- Downloads (real uploaded content)
- Complete → Archive (immediate, no refresh)

## Not included (Phase 2+)

- Search UX
- Recents cleanup
- Full Supabase persistence verification
- System Health panel consolidation
- Layout recap cards

## Quick start (local)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Serve `frontend/` with any static server and set API base if needed:

```js
localStorage.setItem('WCC_API_BASE', 'http://127.0.0.1:8000');
```

## QA

Run `TEST_CHECKLIST.md` before sign-off.

## Version

`wcc-v1.2.5-phase1`
