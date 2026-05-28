import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_VERSION = "wcc-v1-backend-setup"

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app = FastAPI(
    title="WCC Backend",
    version=APP_VERSION,
    description="Lean persistence backend for Workflow Command Center V1.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=180)
    content: str = Field(default="", max_length=12000)
    type: str = Field(default="note", max_length=40)
    channel: str = Field(default="Governance", max_length=80)
    state: str = Field(default="New", max_length=40)
    short_version: str = Field(default="", max_length=1200)
    long_version: str = Field(default="", max_length=12000)
    must_read: str = Field(default="", max_length=2000)


class ItemPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=180)
    content: Optional[str] = Field(default=None, max_length=12000)
    type: Optional[str] = Field(default=None, max_length=40)
    channel: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=40)
    short_version: Optional[str] = Field(default=None, max_length=1200)
    long_version: Optional[str] = Field(default=None, max_length=12000)
    must_read: Optional[str] = Field(default=None, max_length=2000)


class ActivityCreate(BaseModel):
    item_id: Optional[UUID] = None
    action: str = Field(..., min_length=1, max_length=80)
    details: str = Field(default="", max_length=4000)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_supabase() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.",
        )


def supabase_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def sb_get(table: str, query: str = "") -> List[Dict[str, Any]]:
    require_supabase()
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, headers=supabase_headers())
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


async def sb_insert(table: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    require_supabase()
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(url, headers=supabase_headers("return=representation"), json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    data = response.json()
    return data[0] if data else {}


async def sb_patch(table: str, row_id: UUID, payload: Dict[str, Any]) -> Dict[str, Any]:
    require_supabase()
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.patch(url, headers=supabase_headers("return=representation"), json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    data = response.json()
    if not data:
        raise HTTPException(status_code=404, detail="Item not found")
    return data[0]


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "service": "WCC Backend",
        "version": APP_VERSION,
        "status": "running",
        "endpoints": ["/health", "/items", "/activity"],
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "version": APP_VERSION,
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY),
        "time": utc_now_iso(),
    }


@app.get("/items")
async def get_items(limit: int = 100) -> List[Dict[str, Any]]:
    safe_limit = max(1, min(limit, 500))
    return await sb_get("wcc_items", f"?select=*&order=updated_at.desc&limit={safe_limit}")


@app.post("/items")
async def create_item(item: ItemCreate) -> Dict[str, Any]:
    payload = item.model_dump()
    created = await sb_insert("wcc_items", payload)
    await sb_insert(
        "wcc_activity",
        {
            "item_id": created.get("id"),
            "action": "item created",
            "details": f"Created item in {created.get('channel', item.channel)} with state {created.get('state', item.state)}.",
        },
    )
    return created


@app.patch("/items/{id}")
async def update_item(id: UUID = Path(...), patch: ItemPatch = None) -> Dict[str, Any]:
    payload = patch.model_dump(exclude_unset=True) if patch else {}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    payload["updated_at"] = utc_now_iso()
    updated = await sb_patch("wcc_items", id, payload)
    changed = ", ".join(payload.keys())
    await sb_insert(
        "wcc_activity",
        {
            "item_id": str(id),
            "action": "item updated",
            "details": f"Updated fields: {changed}.",
        },
    )
    return updated


@app.get("/activity")
async def get_activity(limit: int = 100) -> List[Dict[str, Any]]:
    safe_limit = max(1, min(limit, 500))
    return await sb_get("wcc_activity", f"?select=*&order=created_at.desc&limit={safe_limit}")


@app.post("/activity")
async def create_activity(activity: ActivityCreate) -> Dict[str, Any]:
    payload = activity.model_dump()
    if payload.get("item_id") is not None:
        payload["item_id"] = str(payload["item_id"])
    return await sb_insert("wcc_activity", payload)
