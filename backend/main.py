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

app = FastAPI(title="WCC Functional V1", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory: Dict[str, Dict[str, Any]] = {}

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

class TaskIn(BaseModel):
    title: str
    sender: Optional[str] = ""
    destination: Optional[str] = ""
    message: Optional[str] = ""
    notes: Optional[str] = ""
    status: Optional[str] = "New"
    files: List[FileRef] = []
    participants: List[Participant] = []
    activity: List[Activity] = []

class Task(TaskIn):
    id: str
    created_at: str
    updated_at: str

async def sb_get_all() -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{TABLE}?select=*&order=updated_at.desc", headers=headers())
        r.raise_for_status()
        return r.json()

async def sb_get(task_id: str) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{TABLE}?id=eq.{task_id}&select=*", headers=headers())
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None

async def sb_insert(task: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{SUPABASE_URL}/rest/v1/{TABLE}", headers=headers(), json=task)
        r.raise_for_status()
        return r.json()[0]

async def sb_update(task_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.patch(f"{SUPABASE_URL}/rest/v1/{TABLE}?id=eq.{task_id}", headers=headers(), json=task)
        r.raise_for_status()
        data = r.json()
        if not data:
            raise HTTPException(status_code=404, detail="Task not found")
        return data[0]

@app.get("/")
def root():
    return {"app": "WCC", "status": "running", "supabase": supabase_enabled()}

@app.get("/health")
def health():
    return {"status": "ok", "supabase_configured": supabase_enabled(), "version": "wcc-functional-v1"}

@app.get("/tasks")
async def list_tasks():
    if supabase_enabled():
        try:
            return {"tasks": await sb_get_all()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase read failed: {e}")
    return {"tasks": sorted(memory.values(), key=lambda x: x.get("updated_at", ""), reverse=True)}

@app.get("/tasks/{task_id}")
async def read_task(task_id: str):
    if supabase_enabled():
        task = await sb_get(task_id)
        if not task: raise HTTPException(status_code=404, detail="Task not found")
        return {"task": task}
    if task_id not in memory: raise HTTPException(status_code=404, detail="Task not found")
    return {"task": memory[task_id]}

@app.post("/tasks")
async def create_task(payload: TaskIn):
    t = payload.model_dump()
    timestamp = now()
    t.update({"id": str(uuid4()), "created_at": timestamp, "updated_at": timestamp})
    if not t.get("activity"):
        t["activity"] = [{"text": "task created", "created_at": timestamp}]
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
    if not existing: raise HTTPException(status_code=404, detail="Task not found")
    t = payload.model_dump()
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
