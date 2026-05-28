# WCC V1 Static Frontend

Static frontend build for WCC — Workflow Command Center.

## Scope

- Frontend only
- No backend
- No AI layer
- Preserves the approved four-column governance layout
- Implements a push-based routing workflow in local browser state

## Files

```text
frontend/index.html
frontend/styles.css
frontend/app.js
README.md
```

## Core Workflow

1. User adds an upload, message, note, deployment item, or approval item.
2. System suggests a destination channel using local keyword routing rules.
3. User reviews the short version and long version.
4. User clicks Approve / Send.
5. Item moves into the correct channel/state.

## Required States

- New
- Review
- Approved
- Sent
- Blocked
- Archived

## Run Locally

Open `frontend/index.html` in a browser.

For a local static server:

```bash
cd frontend
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deployment

This can be deployed as a static site on Render, Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

For Render Static Site:

- Root directory: `frontend`
- Build command: leave blank
- Publish directory: `.`
