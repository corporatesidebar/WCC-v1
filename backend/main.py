import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
TABLE = os.getenv("SUPABASE_TASKS_TABLE", "wcc_tasks")

app = FastAPI(title="WCC Thread Model V1", version="1.1.3")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory: Dict[str, Dict[str, Any]] = {}

STATUSES = {"New", "In Progress", "Complete", "Archived", "Done"}

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

def supabase_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

def headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

class Activity(BaseModel):
    text: str
    created_at: str = Field(default_factory=now)

class FileRef(BaseModel):
    filename: str
    type: Optional[str] = ""
    note: Optional[str] = ""

class Participant(BaseModel):
    name: str
    role: Optional[str] = ""

class TestEntry(BaseModel):
    label: str
    note: Optional[str] = ""
    status: Optional[str] = "GOOD"
    created_at: str = Field(default_factory=now)

class Comment(BaseModel):
    text: str
    author: Optional[str] = "WW"
    created_at: str = Field(default_factory=now)

class TaskIn(BaseModel):
    title: str
    category: Optional[str] = "Commander / Governance"
    sender: Optional[str] = "WW - Governance"
    destination: Optional[str] = ""
    message: Optional[str] = ""
    notes: Optional[str] = ""
    status: Optional[str] = "New"
    comments: List[Comment] = []
    files: List[FileRef] = []
    participants: List[Participant] = []
    activity: List[Activity] = []
    test_entries: List[TestEntry] = []

class Task(TaskIn):
    id: str
    created_at: str
    updated_at: str

def normalize_task(t: Dict[str, Any]) -> Dict[str, Any]:
    timestamp = now()
    t.setdefault("id", str(uuid4()))
    t.setdefault("created_at", timestamp)
    t["updated_at"] = t.get("updated_at") or timestamp
    t["category"] = t.get("category") or t.get("destination") or "Commander / Governance"
    t["sender"] = t.get("sender") or "WW - Governance"
    t["destination"] = t.get("destination") or t["category"]
    t["message"] = t.get("message") or t.get("title") or ""
    t["notes"] = t.get("notes") or ""
    if t.get("status") == "Done":
        t["status"] = "Complete"
    t["status"] = t.get("status") if t.get("status") in STATUSES else "New"
    t["comments"] = t.get("comments") or []
    t["files"] = t.get("files") or []
    t["participants"] = t.get("participants") or []
    t["activity"] = t.get("activity") or []
    t["test_entries"] = t.get("test_entries") or []
    return t

async def sb_get_all() -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{TABLE}?select=*&order=updated_at.desc", headers=headers())
        r.raise_for_status()
        return [normalize_task(x) for x in r.json()]

async def sb_get(task_id: str) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{TABLE}?id=eq.{task_id}&select=*", headers=headers())
        r.raise_for_status()
        data = r.json()
        return normalize_task(data[0]) if data else None

async def sb_insert(task: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{SUPABASE_URL}/rest/v1/{TABLE}", headers=headers(), json=task)
        r.raise_for_status()
        return normalize_task(r.json()[0])

async def sb_update(task_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.patch(f"{SUPABASE_URL}/rest/v1/{TABLE}?id=eq.{task_id}", headers=headers(), json=task)
        r.raise_for_status()
        data = r.json()
        if not data:
            raise HTTPException(status_code=404, detail="Task thread not found")
        return normalize_task(data[0])

@app.get("/")
def root():
    return {"app": "WCC", "status": "running", "model": "task-thread-forum", "supabase": supabase_enabled()}

@app.get("/health")
def health():
    return {"status": "ok", "supabase_configured": supabase_enabled(), "version": "wcc-v1.1-qa-round-3", "backend_status": "connected", "database_status": "supabase" if supabase_enabled() else "memory-fallback"}

@app.get("/tasks")
async def list_tasks():
    if supabase_enabled():
        try:
            return {"tasks": await sb_get_all()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase read failed: {e}")
    return {"tasks": sorted([normalize_task(x) for x in memory.values()], key=lambda x: x.get("updated_at", ""), reverse=True)}

@app.get("/tasks/{task_id}")
async def read_task(task_id: str):
    if supabase_enabled():
        task = await sb_get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task thread not found")
        return {"task": task}
    if task_id not in memory:
        raise HTTPException(status_code=404, detail="Task thread not found")
    return {"task": normalize_task(memory[task_id])}

@app.post("/tasks")
async def create_task(payload: TaskIn):
    t = normalize_task(payload.model_dump())
    timestamp = now()
    t.update({"id": str(uuid4()), "created_at": timestamp, "updated_at": timestamp})
    t["destination"] = t.get("destination") or t.get("category") or "Commander / Governance"
    t["activity"] = t.get("activity") or [{"text": "task thread created", "created_at": timestamp}]
    if supabase_enabled():
        try:
            return {"task": await sb_insert(t)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase insert failed: {e}")
    memory[t["id"]] = t
    return {"task": t}

@app.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskIn):
    existing = await sb_get(task_id) if supabase_enabled() else memory.get(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task thread not found")
    t = normalize_task(payload.model_dump())
    t["id"] = task_id
    t["created_at"] = existing.get("created_at", now())
    t["updated_at"] = now()
    if supabase_enabled():
        try:
            return {"task": await sb_update(task_id, t)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase update failed: {e}")
    memory[task_id] = t
    return {"task": t}

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    if supabase_enabled():
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.delete(f"{SUPABASE_URL}/rest/v1/{TABLE}?id=eq.{task_id}", headers=headers())
            r.raise_for_status()
        return {"deleted": True}
    memory.pop(task_id, None)
    return {"deleted": True}
