# WCC V1 Static Frontend — Routing Workflow Refinement

Static frontend only. No backend. No AI service.

## File Structure

```
frontend/index.html
frontend/styles.css
frontend/app.js
README.md
```

## Implemented Refinement

- Preserved approved 4-column governance layout.
- Added operational routing workflow for Upload, Note, Message, and Link.
- Suggested destination channels: Design, Governance, Deployments, EE Core, Documents, Archive.
- Review layer generates Short Version, Long Version, Must Read, and Recommended Action.
- Approval layer includes Approve, Edit, Hold, Send, and Archive.
- Required workflow states supported: New, Review, Approved, Sent, Blocked, Archived.
- All state changes are local/browser-only and reflected in Governance Notes, Speed Read, and Oversight panels.

## Deployment

Deploy `frontend/` as a static site.

Render static site settings:
- Root directory: `frontend`
- Build command: leave blank
- Publish directory: `.`
