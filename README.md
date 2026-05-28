# WCC V1 Frontend/Backend Connection

Static frontend wired to the WCC FastAPI backend.

## Files

```text
frontend/index.html
frontend/styles.css
frontend/app.js
README.md
```

## What changed

- Existing four-column WCC governance UI preserved.
- Add Item / Suggest Destination now creates or updates backend records.
- Approve, Hold, Send, Archive, and state changes persist through `PATCH /items/{id}`.
- Activity feed loads from `GET /activity`.
- User actions create activity entries through `POST /activity`.
- Items reload from `GET /items` and survive refresh once backend URL is configured.

## Backend URL configuration

In `frontend/app.js`, the frontend reads the backend URL from:

```js
window.WCC_API_BASE_URL
```

or:

```js
localStorage.WCC_API_BASE_URL
```

For Render static deployment, set it before loading `app.js` in `index.html` if desired:

```html
<script>
  window.WCC_API_BASE_URL = "https://wcc-backend.onrender.com";
</script>
<script src="app.js"></script>
```

Alternative browser console setup for testing:

```js
localStorage.setItem("WCC_API_BASE_URL", "https://wcc-backend.onrender.com");
location.reload();
```

## Required backend endpoints

```text
GET /items
POST /items
PATCH /items/{id}
GET /activity
POST /activity
```

## Deployment test checklist

1. Deploy backend to Render.
2. Run Supabase schema.
3. Confirm backend `/health` returns `ok: true` and `supabase_configured: true`.
4. Configure frontend backend URL.
5. Open frontend.
6. Add item.
7. Suggest destination.
8. Approve.
9. Send.
10. Refresh page.
11. Confirm item, state, channel, and activity persist.
