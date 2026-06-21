from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import csv
import uuid
import secrets
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import requests
import resend
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form, Query, Header
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# --- Config ---
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
APP_NAME = os.environ.get("APP_NAME", "ithelpdesk")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
resend.api_key = RESEND_API_KEY

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="IT Help Desk API")
api = APIRouter(prefix="/api")

# --- Helpers ---
def now_utc():
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, email: str, role: str, ttl_minutes: int = 60 * 24) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": now_utc() + timedelta(minutes=ttl_minutes), "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "requester"),
        "is_active": u.get("is_active", True),
        "created_at": u.get("created_at"),
    }

# --- Storage ---
storage_key = None
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        storage_key = r.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    r = requests.put(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    r.raise_for_status()
    return r.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    r = requests.get(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

# --- Auth dependencies ---
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or not user.get("is_active", True):
        raise HTTPException(401, "User not found or inactive")
    return user

def require_roles(*roles):
    async def checker(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return checker

# --- Pydantic Models ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["admin", "technician", "requester"] = "requester"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "technician", "requester"]] = None
    is_active: Optional[bool] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ForgotReq(BaseModel):
    email: EmailStr

class ResetReq(BaseModel):
    token: str
    new_password: str

class TicketCreate(BaseModel):
    title: str
    description: str
    category: Literal["Hardware", "Software", "Network", "Account Access", "Other"]
    priority: Literal["Low", "Medium", "High", "Critical"] = "Medium"
    attachment_ids: List[str] = []

class TicketUpdate(BaseModel):
    status: Optional[Literal["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed"]] = None
    assignee_id: Optional[str] = None
    priority: Optional[Literal["Low", "Medium", "High", "Critical"]] = None
    category: Optional[Literal["Hardware", "Software", "Network", "Account Access", "Other"]] = None
    kb_article_id: Optional[str] = None

class CommentCreate(BaseModel):
    body: str
    internal: bool = False

class SlaRule(BaseModel):
    priority: Literal["Low", "Medium", "High", "Critical"]
    response_minutes: int
    resolution_minutes: int

class KbArticleIn(BaseModel):
    title: str
    body: str
    category: str
    tags: List[str] = []
    published: bool = True

# --- Email ---
async def send_email_async(to: str, subject: str, html: str):
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_placeholder"):
        logger.info(f"[EMAIL MOCK] to={to} subject={subject}")
        return
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logger.error(f"Email send failed: {e}")

# --- Notifications ---
async def create_notification(user_id: str, ticket_id: Optional[str], kind: str, message: str):
    await db.notifications.insert_one({
        "user_id": user_id, "ticket_id": ticket_id, "kind": kind,
        "message": message, "read": False, "created_at": iso(now_utc())
    })

# --- SLA ---
DEFAULT_SLA = [
    {"priority": "Critical", "response_minutes": 60, "resolution_minutes": 240},
    {"priority": "High", "response_minutes": 240, "resolution_minutes": 480},
    {"priority": "Medium", "response_minutes": 480, "resolution_minutes": 1440},
    {"priority": "Low", "response_minutes": 1440, "resolution_minutes": 4320},
]

async def get_sla_for(priority: str) -> dict:
    rule = await db.sla_rules.find_one({"priority": priority})
    if not rule:
        return next(r for r in DEFAULT_SLA if r["priority"] == priority)
    return rule

async def next_ticket_number() -> str:
    res = await db.counters.find_one_and_update(
        {"_id": "ticket"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    seq = res["seq"] if res else 1
    return f"TCK-{seq:04d}"

async def serialize_ticket(t: dict, with_sla=True) -> dict:
    assignee = None
    if t.get("assignee_id"):
        u = await db.users.find_one({"_id": ObjectId(t["assignee_id"])})
        if u:
            assignee = {"id": str(u["_id"]), "name": u.get("name"), "email": u["email"]}
    requester = None
    if t.get("requester_id"):
        u = await db.users.find_one({"_id": ObjectId(t["requester_id"])})
        if u:
            requester = {"id": str(u["_id"]), "name": u.get("name"), "email": u["email"]}
    out = {
        "id": str(t["_id"]),
        "ticket_number": t["ticket_number"],
        "title": t["title"],
        "description": t["description"],
        "category": t["category"],
        "priority": t["priority"],
        "status": t["status"],
        "assignee": assignee,
        "requester": requester,
        "attachments": t.get("attachments", []),
        "created_at": t.get("created_at"),
        "updated_at": t.get("updated_at"),
        "resolved_at": t.get("resolved_at"),
        "first_response_at": t.get("first_response_at"),
        "kb_article_id": t.get("kb_article_id"),
    }
    if with_sla:
        rule = await get_sla_for(t["priority"])
        created = datetime.fromisoformat(t["created_at"])
        response_due = created + timedelta(minutes=rule["response_minutes"])
        resolution_due = created + timedelta(minutes=rule["resolution_minutes"])
        out["sla"] = {
            "response_due": iso(response_due),
            "resolution_due": iso(resolution_due),
            "response_minutes": rule["response_minutes"],
            "resolution_minutes": rule["resolution_minutes"],
        }
    return out

# ===========================
# AUTH ROUTES
# ===========================
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=60 * 60 * 24, path="/"
    )

@api.post("/auth/register")
async def register(payload: UserCreate, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    # First public registration is requester only; admin must create techs/admins
    doc = {
        "email": email, "password_hash": hash_password(payload.password),
        "name": payload.name, "role": "requester",
        "is_active": True, "created_at": iso(now_utc())
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = make_token(str(res.inserted_id), email, "requester")
    set_auth_cookie(response, token)
    return {"user": serialize_user(doc), "token": token}

@api.post("/auth/login")
async def login(payload: LoginReq, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account deactivated")
    token = make_token(str(user["_id"]), email, user.get("role", "requester"))
    set_auth_cookie(response, token)
    return {"user": serialize_user(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return serialize_user(user)

@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotReq):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "user_id": str(user["_id"]), "token": token,
            "expires_at": iso(now_utc() + timedelta(hours=1)),
            "used": False, "created_at": iso(now_utc())
        })
        link = f"{FRONTEND_URL}/reset-password?token={token}"
        html = f"<p>Hi {user.get('name','')},</p><p>Reset your password: <a href='{link}'>{link}</a></p><p>Link expires in 1 hour.</p>"
        await send_email_async(email, "Reset your IT Help Desk password", html)
        logger.info(f"[PASSWORD RESET] {email} -> {link}")
    return {"ok": True}

@api.post("/auth/reset-password")
async def reset_password(payload: ResetReq):
    record = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not record:
        raise HTTPException(400, "Invalid or used token")
    if datetime.fromisoformat(record["expires_at"]) < now_utc():
        raise HTTPException(400, "Token expired")
    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    await db.password_reset_tokens.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    return {"ok": True}

# ===========================
# USERS (admin only)
# ===========================
@api.get("/users")
async def list_users(user=Depends(get_current_user)):
    # Admins see all, technicians see all techs for assignment ref
    cursor = db.users.find({})
    out = []
    async for u in cursor:
        out.append(serialize_user(u))
    return out

@api.get("/users/technicians")
async def list_techs(user=Depends(get_current_user)):
    cursor = db.users.find({"role": "technician", "is_active": True})
    return [serialize_user(u) async for u in cursor]

@api.post("/users")
async def create_user(payload: UserCreate, user=Depends(require_roles("admin"))):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already exists")
    doc = {
        "email": email, "password_hash": hash_password(payload.password),
        "name": payload.name, "role": payload.role,
        "is_active": True, "created_at": iso(now_utc())
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_user(doc)

@api.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, user=Depends(require_roles("admin"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_user(u)

# ===========================
# FILE ATTACHMENTS
# ===========================
@api.post("/attachments")
async def upload_attachment(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{str(user['_id'])}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    att_id = str(uuid.uuid4())
    rec = {
        "id": att_id, "storage_path": result["path"],
        "original_filename": file.filename, "content_type": file.content_type,
        "size": result.get("size", len(data)), "uploader_id": str(user["_id"]),
        "is_deleted": False, "created_at": iso(now_utc())
    }
    await db.attachments.insert_one(rec)
    rec.pop("_id", None)
    return rec

@api.get("/attachments/{att_id}/download")
async def download_attachment(att_id: str, request: Request, auth: Optional[str] = Query(None)):
    # support query-param token
    if auth and "access_token" not in request.cookies:
        request.cookies.__dict__.setdefault('_dict', {})
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        if auth:
            try:
                payload = jwt.decode(auth, JWT_SECRET, algorithms=[JWT_ALG])
                user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
            except Exception:
                pass
    if not user:
        raise HTTPException(401, "Not authenticated")
    rec = await db.attachments.find_one({"id": att_id, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "Not found")
    data, ct = get_object(rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type") or ct,
                    headers={"Content-Disposition": f'inline; filename="{rec["original_filename"]}"'})

# ===========================
# TICKETS
# ===========================
async def add_history(ticket_id: str, actor_id: str, action: str, detail: str = ""):
    await db.ticket_history.insert_one({
        "ticket_id": ticket_id, "actor_id": actor_id,
        "action": action, "detail": detail, "at": iso(now_utc())
    })

@api.post("/tickets")
async def create_ticket(payload: TicketCreate, user=Depends(get_current_user)):
    number = await next_ticket_number()
    attachments = []
    for aid in payload.attachment_ids:
        rec = await db.attachments.find_one({"id": aid})
        if rec:
            attachments.append({
                "id": rec["id"], "filename": rec["original_filename"],
                "content_type": rec["content_type"], "size": rec["size"]
            })
    doc = {
        "ticket_number": number,
        "title": payload.title, "description": payload.description,
        "category": payload.category, "priority": payload.priority,
        "status": "New", "requester_id": str(user["_id"]),
        "assignee_id": None, "attachments": attachments,
        "created_at": iso(now_utc()), "updated_at": iso(now_utc()),
        "resolved_at": None, "first_response_at": None, "kb_article_id": None,
    }
    res = await db.tickets.insert_one(doc)
    doc["_id"] = res.inserted_id
    await add_history(str(res.inserted_id), str(user["_id"]), "created", f"Ticket {number} created")
    return await serialize_ticket(doc)

@api.get("/tickets")
async def list_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assignee_id: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    q = {}
    if user["role"] == "requester":
        q["requester_id"] = str(user["_id"])
    elif user["role"] == "technician":
        # Technician sees tickets assigned to them + unassigned
        pass  # show all so they can pick
    if status: q["status"] = status
    if priority: q["priority"] = priority
    if category: q["category"] = category
    if assignee_id: q["assignee_id"] = assignee_id
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"ticket_number": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.tickets.find(q).sort("created_at", -1)
    out = []
    async for t in cursor:
        out.append(await serialize_ticket(t))
    return out

@api.get("/tickets/{tid}")
async def get_ticket(tid: str, user=Depends(get_current_user)):
    t = await db.tickets.find_one({"_id": ObjectId(tid)})
    if not t:
        raise HTTPException(404, "Not found")
    if user["role"] == "requester" and t.get("requester_id") != str(user["_id"]):
        raise HTTPException(403, "Forbidden")
    return await serialize_ticket(t)

@api.patch("/tickets/{tid}")
async def update_ticket(tid: str, payload: TicketUpdate, user=Depends(get_current_user)):
    t = await db.tickets.find_one({"_id": ObjectId(tid)})
    if not t:
        raise HTTPException(404, "Not found")
    if user["role"] == "requester":
        raise HTTPException(403, "Requesters cannot update tickets")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    # Status side-effects
    if "status" in updates:
        if updates["status"] in ("Resolved", "Closed") and not t.get("resolved_at"):
            updates["resolved_at"] = iso(now_utc())
        await add_history(tid, str(user["_id"]), "status_changed",
                          f"{t.get('status')} -> {updates['status']}")
    if "assignee_id" in updates and updates["assignee_id"]:
        assignee = await db.users.find_one({"_id": ObjectId(updates["assignee_id"])})
        if assignee:
            await add_history(tid, str(user["_id"]), "assigned", f"to {assignee.get('name')}")
            await create_notification(updates["assignee_id"], tid, "assigned",
                                      f"You have been assigned ticket {t['ticket_number']}")
            if t.get("status") == "New":
                updates["status"] = "Assigned"
    if "priority" in updates:
        await add_history(tid, str(user["_id"]), "priority_changed",
                          f"{t.get('priority')} -> {updates['priority']}")
    updates["updated_at"] = iso(now_utc())
    await db.tickets.update_one({"_id": ObjectId(tid)}, {"$set": updates})
    # Notify requester of status change
    if "status" in updates and t.get("requester_id"):
        await create_notification(t["requester_id"], tid, "status_changed",
                                  f"Ticket {t['ticket_number']} status: {updates['status']}")
    nt = await db.tickets.find_one({"_id": ObjectId(tid)})
    return await serialize_ticket(nt)

# Comments
@api.get("/tickets/{tid}/comments")
async def list_comments(tid: str, user=Depends(get_current_user)):
    t = await db.tickets.find_one({"_id": ObjectId(tid)})
    if not t:
        raise HTTPException(404, "Not found")
    if user["role"] == "requester" and t.get("requester_id") != str(user["_id"]):
        raise HTTPException(403, "Forbidden")
    q = {"ticket_id": tid}
    if user["role"] == "requester":
        q["internal"] = False
    cursor = db.comments.find(q).sort("created_at", 1)
    out = []
    async for c in cursor:
        author = await db.users.find_one({"_id": ObjectId(c["author_id"])})
        out.append({
            "id": str(c["_id"]), "body": c["body"], "internal": c.get("internal", False),
            "author": {"id": str(author["_id"]), "name": author.get("name"), "role": author.get("role")} if author else None,
            "created_at": c["created_at"]
        })
    return out

@api.post("/tickets/{tid}/comments")
async def add_comment(tid: str, payload: CommentCreate, user=Depends(get_current_user)):
    t = await db.tickets.find_one({"_id": ObjectId(tid)})
    if not t:
        raise HTTPException(404, "Not found")
    if user["role"] == "requester":
        if t.get("requester_id") != str(user["_id"]):
            raise HTTPException(403, "Forbidden")
        if payload.internal:
            raise HTTPException(403, "Requesters cannot post internal notes")
    doc = {
        "ticket_id": tid, "author_id": str(user["_id"]),
        "body": payload.body, "internal": payload.internal,
        "created_at": iso(now_utc())
    }
    res = await db.comments.insert_one(doc)
    # First response tracking (tech replying for first time)
    if user["role"] in ("technician", "admin") and not t.get("first_response_at") and not payload.internal:
        await db.tickets.update_one({"_id": ObjectId(tid)},
                                    {"$set": {"first_response_at": iso(now_utc()),
                                              "updated_at": iso(now_utc())}})
    await add_history(tid, str(user["_id"]),
                      "internal_note" if payload.internal else "comment", "")
    # Notify other party
    if not payload.internal:
        other = t["requester_id"] if str(user["_id"]) != t.get("requester_id") else t.get("assignee_id")
        if other:
            await create_notification(other, tid, "new_comment",
                                      f"New comment on {t['ticket_number']}")
    return {"id": str(res.inserted_id)}

# History
@api.get("/tickets/{tid}/history")
async def ticket_history(tid: str, user=Depends(get_current_user)):
    t = await db.tickets.find_one({"_id": ObjectId(tid)})
    if not t:
        raise HTTPException(404, "Not found")
    if user["role"] == "requester" and t.get("requester_id") != str(user["_id"]):
        raise HTTPException(403, "Forbidden")
    cursor = db.ticket_history.find({"ticket_id": tid}).sort("at", 1)
    out = []
    async for h in cursor:
        actor = await db.users.find_one({"_id": ObjectId(h["actor_id"])})
        out.append({
            "action": h["action"], "detail": h.get("detail", ""),
            "at": h["at"],
            "actor": {"id": str(actor["_id"]), "name": actor.get("name"), "role": actor.get("role")} if actor else None
        })
    return out

# CSV Export
@api.get("/tickets/export.csv")
async def export_tickets_csv(user=Depends(require_roles("admin"))):
    cursor = db.tickets.find({}).sort("created_at", -1)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Ticket #", "Title", "Category", "Priority", "Status",
                "Requester", "Assignee", "Created", "Resolved"])
    async for t in cursor:
        req = await db.users.find_one({"_id": ObjectId(t["requester_id"])}) if t.get("requester_id") else None
        asg = await db.users.find_one({"_id": ObjectId(t["assignee_id"])}) if t.get("assignee_id") else None
        w.writerow([t["ticket_number"], t["title"], t["category"], t["priority"], t["status"],
                    (req or {}).get("name", ""), (asg or {}).get("name", ""),
                    t.get("created_at", ""), t.get("resolved_at", "") or ""])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=tickets.csv"})

# ===========================
# SLA RULES
# ===========================
@api.get("/sla")
async def list_sla(user=Depends(get_current_user)):
    rules = []
    for default in DEFAULT_SLA:
        existing = await db.sla_rules.find_one({"priority": default["priority"]})
        rules.append(existing or default)
    return [{"priority": r["priority"],
             "response_minutes": r["response_minutes"],
             "resolution_minutes": r["resolution_minutes"]} for r in rules]

@api.put("/sla")
async def upsert_sla(rules: List[SlaRule], user=Depends(require_roles("admin"))):
    for r in rules:
        await db.sla_rules.update_one(
            {"priority": r.priority},
            {"$set": {"priority": r.priority,
                      "response_minutes": r.response_minutes,
                      "resolution_minutes": r.resolution_minutes}},
            upsert=True
        )
    return {"ok": True}

# ===========================
# KNOWLEDGE BASE
# ===========================
@api.get("/kb")
async def list_kb(search: Optional[str] = None, category: Optional[str] = None):
    q = {"published": True}
    if category: q["category"] = category
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"body": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.kb_articles.find(q).sort("created_at", -1)
    out = []
    async for a in cursor:
        out.append({
            "id": str(a["_id"]), "title": a["title"], "category": a["category"],
            "tags": a.get("tags", []), "helpful": a.get("helpful", 0),
            "not_helpful": a.get("not_helpful", 0),
            "created_at": a.get("created_at"),
            "excerpt": (a["body"][:200] + "...") if len(a["body"]) > 200 else a["body"]
        })
    return out

@api.get("/kb/{aid}")
async def get_kb(aid: str):
    a = await db.kb_articles.find_one({"_id": ObjectId(aid)})
    if not a:
        raise HTTPException(404, "Not found")
    return {
        "id": str(a["_id"]), "title": a["title"], "body": a["body"],
        "category": a["category"], "tags": a.get("tags", []),
        "helpful": a.get("helpful", 0), "not_helpful": a.get("not_helpful", 0),
        "published": a.get("published", True), "created_at": a.get("created_at")
    }

@api.post("/kb")
async def create_kb(payload: KbArticleIn, user=Depends(require_roles("admin", "technician"))):
    doc = {**payload.model_dump(), "helpful": 0, "not_helpful": 0,
           "author_id": str(user["_id"]), "created_at": iso(now_utc())}
    res = await db.kb_articles.insert_one(doc)
    return {"id": str(res.inserted_id)}

@api.patch("/kb/{aid}")
async def update_kb(aid: str, payload: KbArticleIn, user=Depends(require_roles("admin", "technician"))):
    await db.kb_articles.update_one({"_id": ObjectId(aid)}, {"$set": payload.model_dump()})
    return {"ok": True}

@api.delete("/kb/{aid}")
async def delete_kb(aid: str, user=Depends(require_roles("admin"))):
    await db.kb_articles.delete_one({"_id": ObjectId(aid)})
    return {"ok": True}

@api.post("/kb/{aid}/feedback")
async def kb_feedback(aid: str, helpful: bool = Query(...)):
    field = "helpful" if helpful else "not_helpful"
    await db.kb_articles.update_one({"_id": ObjectId(aid)}, {"$inc": {field: 1}})
    return {"ok": True}

# ===========================
# NOTIFICATIONS
# ===========================
@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    cursor = db.notifications.find({"user_id": str(user["_id"])}).sort("created_at", -1).limit(50)
    out = []
    async for n in cursor:
        out.append({
            "id": str(n["_id"]), "kind": n["kind"], "message": n["message"],
            "ticket_id": n.get("ticket_id"), "read": n.get("read", False),
            "created_at": n["created_at"]
        })
    return out

@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"_id": ObjectId(nid), "user_id": str(user["_id"])},
        {"$set": {"read": True}}
    )
    return {"ok": True}

@api.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": str(user["_id"]), "read": False},
        {"$set": {"read": True}}
    )
    return {"ok": True}

# ===========================
# DASHBOARD / REPORTS
# ===========================
@api.get("/dashboard/stats")
async def dashboard_stats(
    start: Optional[str] = None, end: Optional[str] = None,
    user=Depends(require_roles("admin", "technician"))
):
    q = {}
    if start or end:
        q["created_at"] = {}
        if start: q["created_at"]["$gte"] = start
        if end: q["created_at"]["$lte"] = end

    total = await db.tickets.count_documents(q)
    open_count = await db.tickets.count_documents({**q, "status": {"$nin": ["Resolved", "Closed"]}})
    resolved_count = await db.tickets.count_documents({**q, "status": {"$in": ["Resolved", "Closed"]}})

    # By status
    by_status = {}
    for s in ["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed"]:
        by_status[s] = await db.tickets.count_documents({**q, "status": s})

    # By priority
    by_priority = {}
    for p in ["Low", "Medium", "High", "Critical"]:
        by_priority[p] = await db.tickets.count_documents({**q, "priority": p})

    # By category
    by_category = {}
    for c in ["Hardware", "Software", "Network", "Account Access", "Other"]:
        by_category[c] = await db.tickets.count_documents({**q, "category": c})

    # Avg resolution
    cursor = db.tickets.find({**q, "resolved_at": {"$ne": None}})
    deltas = []
    sla_breach = 0
    async for t in cursor:
        try:
            ca = datetime.fromisoformat(t["created_at"])
            ra = datetime.fromisoformat(t["resolved_at"])
            deltas.append((ra - ca).total_seconds())
            rule = await get_sla_for(t["priority"])
            if (ra - ca).total_seconds() / 60 > rule["resolution_minutes"]:
                sla_breach += 1
        except Exception:
            continue
    avg_resolution_hours = (sum(deltas) / len(deltas) / 3600) if deltas else 0

    # Open ticket breaches (still unresolved past due)
    cursor = db.tickets.find({**q, "status": {"$nin": ["Resolved", "Closed"]}})
    async for t in cursor:
        try:
            ca = datetime.fromisoformat(t["created_at"])
            rule = await get_sla_for(t["priority"])
            due = ca + timedelta(minutes=rule["resolution_minutes"])
            if now_utc() > due:
                sla_breach += 1
        except Exception:
            continue

    # By technician
    techs = db.users.find({"role": "technician"})
    by_tech = []
    async for tch in techs:
        c = await db.tickets.count_documents({**q, "assignee_id": str(tch["_id"]),
                                              "status": {"$nin": ["Resolved", "Closed"]}})
        by_tech.append({"name": tch.get("name"), "id": str(tch["_id"]), "open_count": c})

    # Tickets per day (last 14 days)
    timeline = []
    today = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        cnt = await db.tickets.count_documents({
            "created_at": {"$gte": iso(day), "$lt": iso(next_day)}
        })
        timeline.append({"date": day.strftime("%Y-%m-%d"), "count": cnt})

    return {
        "total": total, "open": open_count, "resolved": resolved_count,
        "by_status": by_status, "by_priority": by_priority, "by_category": by_category,
        "avg_resolution_hours": round(avg_resolution_hours, 2),
        "sla_breach_count": sla_breach,
        "by_tech": by_tech, "timeline": timeline
    }

# ===========================
# Startup
# ===========================
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tickets.create_index("ticket_number", unique=True)
    await db.tickets.create_index("requester_id")
    await db.tickets.create_index("assignee_id")
    await db.tickets.create_index("status")
    await db.notifications.create_index("user_id")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@helpdesk.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Administrator", "role": "admin", "is_active": True,
            "created_at": iso(now_utc())
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pw)}})
    # Seed SLA defaults
    for rule in DEFAULT_SLA:
        await db.sla_rules.update_one(
            {"priority": rule["priority"]},
            {"$setOnInsert": rule}, upsert=True
        )
    # Init storage
    init_storage()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
