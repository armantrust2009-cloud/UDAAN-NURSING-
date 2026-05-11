from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# --------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --------- App ---------
app = FastAPI(title="Nursing College ERP")
api_router = APIRouter(prefix="/api")

# --------- Logging ---------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ===================== Auth helpers =====================
JWT_ALGORITHM = "HS256"
ACCESS_MIN = 60 * 24  # 1 day
REFRESH_DAYS = 7

ALLOWED_ROLES = {"admin", "principal", "faculty", "student", "parent"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=REFRESH_DAYS * 86400, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _dep


# ===================== Models =====================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: str = "student"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: datetime


class StudentIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    dob: Optional[str] = ""
    gender: Optional[str] = ""
    address: Optional[str] = ""
    parent_name: Optional[str] = ""
    parent_phone: Optional[str] = ""
    course_id: Optional[str] = ""
    batch_year: Optional[int] = 2025
    admission_no: Optional[str] = ""
    scholarship: Optional[float] = 0.0
    status: Optional[str] = "active"
    photo: Optional[str] = ""  # base64 data URL
    blood_group: Optional[str] = ""
    valid_until: Optional[str] = ""


class FacultyIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    department: Optional[str] = "Nursing"
    designation: Optional[str] = "Lecturer"
    qualification: Optional[str] = ""
    join_date: Optional[str] = ""
    salary: Optional[float] = 0.0
    status: Optional[str] = "active"


class CourseIn(BaseModel):
    code: str
    name: str
    duration_years: int = 4
    total_seats: int = 60
    fee_per_year: float = 0.0
    description: Optional[str] = ""


class FeeIn(BaseModel):
    student_id: str
    amount: float
    description: str = "Tuition Fee"
    due_date: Optional[str] = ""
    academic_year: Optional[str] = "2025-26"


class PayIn(BaseModel):
    method: str = "cash"
    note: Optional[str] = ""


class AttendanceIn(BaseModel):
    student_id: str
    date: str  # YYYY-MM-DD
    status: str  # present | absent | leave
    type: str = "class"  # class | clinical
    note: Optional[str] = ""


# ===================== Utilities =====================
def new_id() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def serialize_dt(doc: dict) -> dict:
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


# ===================== Auth Endpoints =====================
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(400, "Invalid role")
    exists = await db.users.find_one({"email": email})
    if exists:
        raise HTTPException(400, "Email already registered")
    user_doc = {
        "id": new_id(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_doc["id"], email, payload.role)
    refresh = create_refresh_token(user_doc["id"])
    set_auth_cookies(response, access, refresh)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"user": user_doc, "access_token": access}


@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    return {"user": user, "access_token": access}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(rt, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        access = create_access_token(user["id"], user["email"], user["role"])
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=ACCESS_MIN * 60, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ===================== Dashboard =====================
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    students_count = await db.students.count_documents({})
    faculty_count = await db.faculty.count_documents({})
    courses_count = await db.courses.count_documents({})
    # Fees collected
    pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    paid_agg = await db.fees.aggregate(pipeline).to_list(1)
    fees_collected = paid_agg[0]["total"] if paid_agg else 0
    pipeline2 = [{"$match": {"status": "pending"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    pending_agg = await db.fees.aggregate(pipeline2).to_list(1)
    fees_pending = pending_agg[0]["total"] if pending_agg else 0

    # Attendance % (last 30 days)
    att_total = await db.attendance.count_documents({})
    att_present = await db.attendance.count_documents({"status": "present"})
    attendance_pct = round((att_present / att_total * 100), 1) if att_total else 0

    # Enrollment by year
    enrollment = await db.students.aggregate(
        [{"$group": {"_id": "$batch_year", "count": {"$sum": 1}}}, {"$sort": {"_id": 1}}]
    ).to_list(20)
    enrollment_data = [{"year": str(e["_id"]), "students": e["count"]} for e in enrollment if e["_id"]]

    # Fee collection last 6 months
    six_mo_ago = (now_utc() - timedelta(days=180)).isoformat()
    fee_payments = await db.fees.find(
        {"status": "paid", "paid_at": {"$gte": six_mo_ago}}, {"_id": 0}
    ).to_list(2000)
    monthly = {}
    for f in fee_payments:
        if not f.get("paid_at"):
            continue
        month = f["paid_at"][:7]
        monthly[month] = monthly.get(month, 0) + f.get("amount", 0)
    fee_chart = [{"month": k, "amount": v} for k, v in sorted(monthly.items())]

    # Attendance distribution
    att_pipe = await db.attendance.aggregate(
        [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    ).to_list(10)
    attendance_dist = [{"name": a["_id"], "value": a["count"]} for a in att_pipe]

    return {
        "students_count": students_count,
        "faculty_count": faculty_count,
        "courses_count": courses_count,
        "fees_collected": fees_collected,
        "fees_pending": fees_pending,
        "attendance_pct": attendance_pct,
        "enrollment": enrollment_data,
        "fee_chart": fee_chart,
        "attendance_dist": attendance_dist,
    }


# ===================== Students =====================
@api_router.get("/students")
async def list_students(q: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"admission_no": {"$regex": q, "$options": "i"}},
        ]
    rows = await db.students.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return rows


@api_router.post("/students")
async def create_student(payload: StudentIn, user: dict = Depends(require_roles("admin", "principal"))):
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["email"] = doc["email"].lower()
    doc["created_at"] = now_utc().isoformat()
    if not doc.get("admission_no"):
        count = await db.students.count_documents({})
        doc["admission_no"] = f"NUR{datetime.now().year}{count + 1:04d}"
    await db.students.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/students/{sid}")
async def get_student(sid: str, user: dict = Depends(get_current_user)):
    s = await db.students.find_one({"id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Not found")
    return s


@api_router.put("/students/{sid}")
async def update_student(sid: str, payload: StudentIn, user: dict = Depends(require_roles("admin", "principal"))):
    update = payload.model_dump()
    update["email"] = update["email"].lower()
    res = await db.students.update_one({"id": sid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.students.find_one({"id": sid}, {"_id": 0})


@api_router.delete("/students/{sid}")
async def delete_student(sid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.students.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================== Faculty =====================
@api_router.get("/faculty")
async def list_faculty(q: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"department": {"$regex": q, "$options": "i"}},
        ]
    rows = await db.faculty.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return rows


@api_router.post("/faculty")
async def create_faculty(payload: FacultyIn, user: dict = Depends(require_roles("admin", "principal"))):
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["email"] = doc["email"].lower()
    doc["created_at"] = now_utc().isoformat()
    await db.faculty.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/faculty/{fid}")
async def update_faculty(fid: str, payload: FacultyIn, user: dict = Depends(require_roles("admin", "principal"))):
    update = payload.model_dump()
    update["email"] = update["email"].lower()
    res = await db.faculty.update_one({"id": fid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.faculty.find_one({"id": fid}, {"_id": 0})


@api_router.delete("/faculty/{fid}")
async def delete_faculty(fid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.faculty.delete_one({"id": fid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================== Courses =====================
@api_router.get("/courses")
async def list_courses(user: dict = Depends(get_current_user)):
    rows = await db.courses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api_router.post("/courses")
async def create_course(payload: CourseIn, user: dict = Depends(require_roles("admin", "principal"))):
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    await db.courses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/courses/{cid}")
async def update_course(cid: str, payload: CourseIn, user: dict = Depends(require_roles("admin", "principal"))):
    res = await db.courses.update_one({"id": cid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.courses.find_one({"id": cid}, {"_id": 0})


@api_router.delete("/courses/{cid}")
async def delete_course(cid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.courses.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================== Fees =====================
@api_router.get("/fees")
async def list_fees(student_id: Optional[str] = None, status_: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if student_id:
        q["student_id"] = student_id
    if status_:
        q["status"] = status_
    rows = await db.fees.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # attach student name
    student_ids = list({r["student_id"] for r in rows if r.get("student_id")})
    students = await db.students.find({"id": {"$in": student_ids}}, {"_id": 0, "id": 1, "name": 1, "admission_no": 1}).to_list(2000)
    smap = {s["id"]: s for s in students}
    for r in rows:
        sd = smap.get(r.get("student_id"))
        if sd:
            r["student_name"] = sd["name"]
            r["admission_no"] = sd.get("admission_no", "")
    return rows


@api_router.post("/fees")
async def create_fee(payload: FeeIn, user: dict = Depends(require_roles("admin", "principal"))):
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["status"] = "pending"
    doc["created_at"] = now_utc().isoformat()
    doc["paid_at"] = None
    await db.fees.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/fees/{fid}/pay")
async def pay_fee(fid: str, payload: PayIn, user: dict = Depends(require_roles("admin", "principal"))):
    fee = await db.fees.find_one({"id": fid}, {"_id": 0})
    if not fee:
        raise HTTPException(404, "Not found")
    if fee.get("status") == "paid":
        raise HTTPException(400, "Already paid")
    await db.fees.update_one(
        {"id": fid},
        {"$set": {
            "status": "paid",
            "paid_at": now_utc().isoformat(),
            "payment_method": payload.method,
            "payment_note": payload.note or "",
            "receipt_no": f"RCT{int(datetime.now().timestamp())}"
        }},
    )
    return await db.fees.find_one({"id": fid}, {"_id": 0})


@api_router.delete("/fees/{fid}")
async def delete_fee(fid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.fees.delete_one({"id": fid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================== Attendance =====================
@api_router.get("/attendance")
async def list_attendance(student_id: Optional[str] = None, date: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if student_id:
        q["student_id"] = student_id
    if date:
        q["date"] = date
    rows = await db.attendance.find(q, {"_id": 0}).sort("date", -1).to_list(2000)
    student_ids = list({r["student_id"] for r in rows if r.get("student_id")})
    students = await db.students.find({"id": {"$in": student_ids}}, {"_id": 0, "id": 1, "name": 1, "admission_no": 1}).to_list(2000)
    smap = {s["id"]: s for s in students}
    for r in rows:
        sd = smap.get(r.get("student_id"))
        if sd:
            r["student_name"] = sd["name"]
            r["admission_no"] = sd.get("admission_no", "")
    return rows


@api_router.post("/attendance")
async def mark_attendance(payload: AttendanceIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    # upsert by (student_id, date, type)
    doc = payload.model_dump()
    existing = await db.attendance.find_one(
        {"student_id": doc["student_id"], "date": doc["date"], "type": doc["type"]}
    )
    if existing:
        await db.attendance.update_one(
            {"id": existing["id"]},
            {"$set": {"status": doc["status"], "note": doc.get("note", "")}},
        )
        return await db.attendance.find_one({"id": existing["id"]}, {"_id": 0})
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    await db.attendance.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/attendance/summary/{student_id}")
async def attendance_summary(student_id: str, user: dict = Depends(get_current_user)):
    total = await db.attendance.count_documents({"student_id": student_id})
    present = await db.attendance.count_documents({"student_id": student_id, "status": "present"})
    absent = await db.attendance.count_documents({"student_id": student_id, "status": "absent"})
    leave = await db.attendance.count_documents({"student_id": student_id, "status": "leave"})
    pct = round((present / total * 100), 1) if total else 0
    return {"total": total, "present": present, "absent": absent, "leave": leave, "percentage": pct}


# ===================== Health =====================
@api_router.get("/")
async def root():
    return {"app": "Nursing College ERP", "status": "ok"}


# ===================== Startup seeding =====================
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.students.create_index("email", unique=True)
    await db.students.create_index("admission_no")
    await db.faculty.create_index("email", unique=True)
    await db.courses.create_index("code", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@nursingcollege.edu").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrator",
            "role": "admin",
            "created_at": now_utc().isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password for: {admin_email}")

    # Seed demo accounts (idempotent)
    demo_users = [
        ("principal@nursingcollege.edu", "principal123", "Dr. Principal", "principal"),
        ("faculty@nursingcollege.edu", "faculty123", "Prof. Faculty", "faculty"),
        ("student@nursingcollege.edu", "student123", "Test Student", "student"),
    ]
    for em, pw, nm, ro in demo_users:
        if not await db.users.find_one({"email": em}):
            await db.users.insert_one({
                "id": new_id(), "email": em, "password_hash": hash_password(pw),
                "name": nm, "role": ro, "created_at": now_utc().isoformat(),
            })

    # Seed default course if empty
    if await db.courses.count_documents({}) == 0:
        for c in [
            {"code": "BSC-NUR", "name": "B.Sc Nursing", "duration_years": 4, "total_seats": 60, "fee_per_year": 75000, "description": "Bachelor of Science in Nursing"},
            {"code": "GNM", "name": "GNM (General Nursing & Midwifery)", "duration_years": 3, "total_seats": 50, "fee_per_year": 45000, "description": "Diploma in General Nursing and Midwifery"},
            {"code": "MSC-NUR", "name": "M.Sc Nursing", "duration_years": 2, "total_seats": 30, "fee_per_year": 95000, "description": "Master of Science in Nursing"},
        ]:
            c["id"] = new_id()
            c["created_at"] = now_utc().isoformat()
            await db.courses.insert_one(c)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
