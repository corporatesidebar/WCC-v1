# WCC V1.1 — QA Round 3

Functional patch only. Locked layout preserved. Task thread/forum model preserved.

## Model
Category / Digital Team Member → Task Thread → Comments / Replies → Files → Activity → Participants → Complete → Archive.

## QA Round 3 Fixes
- Removed backend cache files from package.
- WCC logo routes to Home.
- Search opens in the left navigation area and results are clickable.
- Quick task bar creates a thread directly with no overlay.
- New tasks default to `New`; workflow is `New → In Progress → Complete → Archive view`.
- Complete confirms before completion, marks task `Complete`, and removes it from Today.
- Comments support unlimited additions and persist after refresh.
- Files can be attached from task creation and comment flow; Files panels populate.
- Participants use predefined team members and allow multiple selections.
- System Health represents backend/database/Supabase health.
- Test Environment supports selected-task QA notes.
- Visible doc/download/share controls now perform safe local exports instead of dead clicks.

## Deploy
Upload `frontend/` to the static Render service and `backend/` to the FastAPI Render service. Apply `supabase_schema.sql` if the table does not exist.
