# WCC V1.2 — Core Product Build

WCC is Communication Management Infrastructure built around the core workflow:

Category / Digital Team Member → Task Thread → Comments / Replies → Files → Activity → Participants → Complete → Archive

## What this build fixes

- Task submission from the compact "Tell me..." input creates a task thread immediately.
- Task threads persist through backend/Supabase when configured, with local fallback.
- Unlimited comments/replies are supported inside the selected task thread.
- Files can be attached at task creation or inside a comment flow as file references.
- Participants are selected from the predefined digital team list and tied to the selected task.
- Task status supports New → In Progress → Archived.
- Complete confirmation automatically archives the task and removes it from active tasks.
- Archive remains retrievable from the left navigation.
- Search covers tasks, original messages, comments, files, category, and status.
- Right column is context-aware for activity, files, health, tests, and participants.

## Files

- frontend/index.html
- frontend/styles.css
- frontend/app.js
- backend/main.py
- backend/requirements.txt
- supabase_schema.sql


## V1.2 QA Fix Batch 3
- Search remains in the left navigation area with clean exit behavior.
- Task-thread files now support upload progress feedback, persisted file references/data URLs, task files, latest files, and downloads using readable WCC filenames.
- Comment filters were not added; thread comments remain full chronological conversation history.
- Right sidebar uses Task Files for selected task files and Latest Files for global recent files.
- System Health / TEST Environment now display operational status from /health and auto-refresh without manual test-note inputs.
