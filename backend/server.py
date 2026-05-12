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


class BookIn(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = ""
    category: Optional[str] = "Nursing"
    publisher: Optional[str] = ""
    edition: Optional[str] = ""
    total_copies: int = 1
    cover_url: Optional[str] = ""
    description: Optional[str] = ""


class IssueIn(BaseModel):
    student_id: str
    book_id: str
    due_date: str  # YYYY-MM-DD


class InquiryIn(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    course_interest: Optional[str] = ""
    source: Optional[str] = "walk-in"  # walk-in | website | referral | social | call
    notes: Optional[str] = ""
    status: Optional[str] = "new"  # new | contacted | visited | admitted | lost
    follow_up_date: Optional[str] = ""
    assigned_to: Optional[str] = ""
    address: Optional[str] = ""


class InquiryStatusIn(BaseModel):
    status: str
    notes: Optional[str] = ""


class SubjectIn(BaseModel):
    name: str
    code: str
    course_id: str
    faculty_id: Optional[str] = ""
    semester: int = 1
    total_hours: int = 60
    credits: int = 4
    description: Optional[str] = ""


class SyllabusUnitIn(BaseModel):
    subject_id: str
    unit_no: int = 1
    title: str
    topics: List[str] = Field(default_factory=list)
    hours: int = 8
    status: str = "planned"  # planned | in-progress | completed
    notes: Optional[str] = ""


class UnitStatusIn(BaseModel):
    status: str  # planned | in-progress | completed


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

    # Inquiry pipeline + recent
    inq_pipe = await db.inquiries.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(20)
    inq_by_status = {"new": 0, "contacted": 0, "visited": 0, "admitted": 0, "lost": 0}
    inq_total = 0
    for r in inq_pipe:
        inq_by_status[r["_id"]] = r["count"]
        inq_total += r["count"]
    inq_open = inq_by_status["new"] + inq_by_status["contacted"] + inq_by_status["visited"]
    conv_rate = round((inq_by_status["admitted"] / inq_total * 100), 1) if inq_total else 0
    recent_inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)

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
        "inquiries": {
            "total": inq_total,
            "open": inq_open,
            "conversion_rate": conv_rate,
            "by_status": inq_by_status,
            "recent": recent_inquiries,
        },
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


# ===================== Library =====================
FINE_PER_DAY = 2.0


async def _book_available_count(book_id: str, total_copies: int) -> int:
    issued = await db.book_issues.count_documents({"book_id": book_id, "status": "issued"})
    return max(0, total_copies - issued)


@api_router.get("/library/books")
async def list_books(q: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"author": {"$regex": q, "$options": "i"}},
            {"isbn": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
        ]
    rows = await db.books.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    book_ids = [r["id"] for r in rows]
    if book_ids:
        issued_agg = await db.book_issues.aggregate([
            {"$match": {"book_id": {"$in": book_ids}, "status": "issued"}},
            {"$group": {"_id": "$book_id", "count": {"$sum": 1}}},
        ]).to_list(len(book_ids))
        issued_map = {a["_id"]: a["count"] for a in issued_agg}
    else:
        issued_map = {}
    for r in rows:
        r["available_copies"] = max(0, r.get("total_copies", 0) - issued_map.get(r["id"], 0))
    return rows


@api_router.post("/library/books")
async def create_book(payload: BookIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    await db.books.insert_one(doc)
    doc.pop("_id", None)
    doc["available_copies"] = doc["total_copies"]
    return doc


@api_router.put("/library/books/{bid}")
async def update_book(bid: str, payload: BookIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    res = await db.books.update_one({"id": bid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    book = await db.books.find_one({"id": bid}, {"_id": 0})
    book["available_copies"] = await _book_available_count(bid, book.get("total_copies", 0))
    return book


@api_router.delete("/library/books/{bid}")
async def delete_book(bid: str, user: dict = Depends(require_roles("admin"))):
    issued = await db.book_issues.count_documents({"book_id": bid, "status": "issued"})
    if issued > 0:
        raise HTTPException(400, f"Cannot delete — {issued} copy(s) currently issued")
    res = await db.books.delete_one({"id": bid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api_router.get("/library/issues")
async def list_issues(status_: Optional[str] = None, student_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if status_:
        q["status"] = status_
    if student_id:
        q["student_id"] = student_id
    rows = await db.book_issues.find(q, {"_id": 0}).sort("issue_date", -1).to_list(2000)

    # enrich + compute live fine
    book_ids = list({r["book_id"] for r in rows if r.get("book_id")})
    student_ids = list({r["student_id"] for r in rows if r.get("student_id")})
    books = await db.books.find({"id": {"$in": book_ids}}, {"_id": 0, "id": 1, "title": 1, "author": 1}).to_list(2000)
    students = await db.students.find({"id": {"$in": student_ids}}, {"_id": 0, "id": 1, "name": 1, "admission_no": 1}).to_list(2000)
    bmap = {b["id"]: b for b in books}
    smap = {s["id"]: s for s in students}
    today = datetime.now(timezone.utc).date()
    for r in rows:
        b = bmap.get(r.get("book_id"))
        s = smap.get(r.get("student_id"))
        if b:
            r["book_title"] = b.get("title", "")
            r["book_author"] = b.get("author", "")
        if s:
            r["student_name"] = s.get("name", "")
            r["admission_no"] = s.get("admission_no", "")
        if r.get("status") == "issued" and r.get("due_date"):
            try:
                due = datetime.fromisoformat(r["due_date"]).date()
                overdue_days = (today - due).days
                r["overdue_days"] = max(0, overdue_days)
                r["current_fine"] = round(max(0, overdue_days) * FINE_PER_DAY, 2)
            except Exception:
                r["overdue_days"] = 0
                r["current_fine"] = 0.0
    return rows


@api_router.post("/library/issues")
async def issue_book(payload: IssueIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    book = await db.books.find_one({"id": payload.book_id}, {"_id": 0})
    if not book:
        raise HTTPException(404, "Book not found")
    available = await _book_available_count(payload.book_id, book.get("total_copies", 0))
    if available <= 0:
        raise HTTPException(400, "No copies available")
    student = await db.students.find_one({"id": payload.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    doc = {
        "id": new_id(),
        "student_id": payload.student_id,
        "book_id": payload.book_id,
        "issue_date": now_utc().date().isoformat(),
        "due_date": payload.due_date,
        "return_date": None,
        "fine": 0.0,
        "status": "issued",
        "created_at": now_utc().isoformat(),
    }
    await db.book_issues.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/library/issues/{iid}/return")
async def return_book(iid: str, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    issue = await db.book_issues.find_one({"id": iid}, {"_id": 0})
    if not issue:
        raise HTTPException(404, "Not found")
    if issue.get("status") == "returned":
        raise HTTPException(400, "Already returned")
    today = datetime.now(timezone.utc).date()
    fine = 0.0
    try:
        due = datetime.fromisoformat(issue["due_date"]).date()
        overdue = (today - due).days
        if overdue > 0:
            fine = round(overdue * FINE_PER_DAY, 2)
    except Exception:
        pass
    await db.book_issues.update_one(
        {"id": iid},
        {"$set": {"status": "returned", "return_date": today.isoformat(), "fine": fine}},
    )
    return await db.book_issues.find_one({"id": iid}, {"_id": 0})


@api_router.delete("/library/issues/{iid}")
async def delete_issue(iid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.book_issues.delete_one({"id": iid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================== Inquiries (Admission Leads) =====================
INQUIRY_STATUSES = {"new", "contacted", "visited", "admitted", "lost"}


@api_router.get("/inquiries")
async def list_inquiries(status_: Optional[str] = None, q: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status_:
        query["status"] = status_
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    rows = await db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return rows


@api_router.get("/inquiries/stats")
async def inquiry_stats(user: dict = Depends(get_current_user)):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    rows = await db.inquiries.aggregate(pipeline).to_list(20)
    out = {s: 0 for s in INQUIRY_STATUSES}
    out["total"] = 0
    for r in rows:
        out[r["_id"]] = r["count"]
        out["total"] += r["count"]
    # conversion rate
    out["conversion_rate"] = round((out["admitted"] / out["total"] * 100), 1) if out["total"] else 0
    return out


@api_router.post("/inquiries")
async def create_inquiry(payload: InquiryIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    if payload.status not in INQUIRY_STATUSES:
        raise HTTPException(400, "Invalid status")
    doc = payload.model_dump()
    doc["id"] = new_id()
    if doc.get("email"):
        doc["email"] = doc["email"].lower()
    doc["created_at"] = now_utc().isoformat()
    doc["updated_at"] = now_utc().isoformat()
    doc["history"] = [{"status": doc["status"], "at": doc["created_at"], "by": user.get("name", ""), "note": "Inquiry created"}]
    await db.inquiries.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/inquiries/{iid}")
async def update_inquiry(iid: str, payload: InquiryIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    if payload.status not in INQUIRY_STATUSES:
        raise HTTPException(400, "Invalid status")
    update = payload.model_dump()
    if update.get("email"):
        update["email"] = update["email"].lower()
    update["updated_at"] = now_utc().isoformat()
    res = await db.inquiries.update_one({"id": iid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.inquiries.find_one({"id": iid}, {"_id": 0})


@api_router.post("/inquiries/{iid}/status")
async def change_inquiry_status(iid: str, payload: InquiryStatusIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    if payload.status not in INQUIRY_STATUSES:
        raise HTTPException(400, "Invalid status")
    inq = await db.inquiries.find_one({"id": iid}, {"_id": 0})
    if not inq:
        raise HTTPException(404, "Not found")
    entry = {"status": payload.status, "at": now_utc().isoformat(), "by": user.get("name", ""), "note": payload.notes or ""}
    await db.inquiries.update_one(
        {"id": iid},
        {"$set": {"status": payload.status, "updated_at": now_utc().isoformat()},
         "$push": {"history": entry}},
    )
    return await db.inquiries.find_one({"id": iid}, {"_id": 0})


@api_router.post("/inquiries/{iid}/convert")
async def convert_inquiry(iid: str, user: dict = Depends(require_roles("admin", "principal"))):
    inq = await db.inquiries.find_one({"id": iid}, {"_id": 0})
    if not inq:
        raise HTTPException(404, "Inquiry not found")
    if inq.get("converted_student_id"):
        raise HTTPException(400, "Already converted")

    email = (inq.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "Cannot convert — inquiry has no email. Edit inquiry to add an email first.")
    if await db.students.find_one({"email": email}):
        raise HTTPException(400, "A student with this email already exists")

    course_id = ""
    if inq.get("course_interest"):
        c = await db.courses.find_one({"$or": [{"id": inq["course_interest"]}, {"name": {"$regex": inq["course_interest"], "$options": "i"}}, {"code": inq["course_interest"]}]}, {"_id": 0, "id": 1})
        if c:
            course_id = c["id"]

    count = await db.students.count_documents({})
    student_doc = {
        "id": new_id(),
        "name": inq["name"],
        "email": email,
        "phone": inq.get("phone", ""),
        "dob": "",
        "gender": "",
        "address": inq.get("address", ""),
        "parent_name": "",
        "parent_phone": "",
        "course_id": course_id,
        "batch_year": datetime.now().year,
        "admission_no": f"NUR{datetime.now().year}{count + 1:04d}",
        "scholarship": 0.0,
        "status": "active",
        "photo": "",
        "blood_group": "",
        "valid_until": "",
        "created_at": now_utc().isoformat(),
    }
    await db.students.insert_one(student_doc)

    entry = {"status": "admitted", "at": now_utc().isoformat(), "by": user.get("name", ""), "note": f"Converted to student {student_doc['admission_no']}"}
    await db.inquiries.update_one(
        {"id": iid},
        {"$set": {"status": "admitted", "converted_student_id": student_doc["id"], "updated_at": now_utc().isoformat()},
         "$push": {"history": entry}},
    )
    student_doc.pop("_id", None)
    return {"inquiry_id": iid, "student": student_doc}


@api_router.delete("/inquiries/{iid}")
async def delete_inquiry(iid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.inquiries.delete_one({"id": iid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ===================== Syllabus & Subjects =====================
UNIT_STATUSES = {"planned", "in-progress", "completed"}


def _unit_progress(units: list) -> dict:
    total = len(units)
    completed = sum(1 for u in units if u.get("status") == "completed")
    in_progress = sum(1 for u in units if u.get("status") == "in-progress")
    pct = round((completed / total * 100), 1) if total else 0
    return {"total_units": total, "completed_units": completed, "in_progress_units": in_progress, "progress_pct": pct}


async def _enrich_subjects(rows: list) -> list:
    course_ids = list({r["course_id"] for r in rows if r.get("course_id")})
    faculty_ids = list({r.get("faculty_id") for r in rows if r.get("faculty_id")})
    subject_ids = [r["id"] for r in rows]

    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0, "id": 1, "name": 1, "code": 1}).to_list(500)
    faculty = await db.faculty.find({"id": {"$in": faculty_ids}}, {"_id": 0, "id": 1, "name": 1, "designation": 1}).to_list(500)
    cmap = {c["id"]: c for c in courses}
    fmap = {f["id"]: f for f in faculty}

    if subject_ids:
        units_agg = await db.syllabus_units.aggregate([
            {"$match": {"subject_id": {"$in": subject_ids}}},
            {"$group": {"_id": "$subject_id", "units": {"$push": {"status": "$status"}}}},
        ]).to_list(len(subject_ids))
        umap = {u["_id"]: u["units"] for u in units_agg}
    else:
        umap = {}

    for r in rows:
        c = cmap.get(r.get("course_id"))
        f = fmap.get(r.get("faculty_id"))
        if c:
            r["course_name"] = c["name"]
            r["course_code"] = c["code"]
        if f:
            r["faculty_name"] = f["name"]
            r["faculty_designation"] = f["designation"]
        r.update(_unit_progress(umap.get(r["id"], [])))
    return rows


@api_router.get("/subjects")
async def list_subjects(course_id: Optional[str] = None, faculty_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if course_id:
        q["course_id"] = course_id
    if faculty_id is not None:
        q["faculty_id"] = faculty_id
    rows = await db.subjects.find(q, {"_id": 0}).sort([("course_id", 1), ("semester", 1)]).to_list(2000)
    return await _enrich_subjects(rows)


@api_router.post("/subjects")
async def create_subject(payload: SubjectIn, user: dict = Depends(require_roles("admin", "principal"))):
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return (await _enrich_subjects([doc]))[0]


@api_router.put("/subjects/{sid}")
async def update_subject(sid: str, payload: SubjectIn, user: dict = Depends(require_roles("admin", "principal"))):
    res = await db.subjects.update_one({"id": sid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    doc = await db.subjects.find_one({"id": sid}, {"_id": 0})
    return (await _enrich_subjects([doc]))[0]


@api_router.delete("/subjects/{sid}")
async def delete_subject(sid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.subjects.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    await db.syllabus_units.delete_many({"subject_id": sid})
    return {"ok": True}


@api_router.get("/subjects/{sid}/units")
async def list_units(sid: str, user: dict = Depends(get_current_user)):
    rows = await db.syllabus_units.find({"subject_id": sid}, {"_id": 0}).sort("unit_no", 1).to_list(500)
    return rows


@api_router.post("/subjects/{sid}/units")
async def create_unit(sid: str, payload: SyllabusUnitIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    if payload.status not in UNIT_STATUSES:
        raise HTTPException(400, "Invalid status")
    subject = await db.subjects.find_one({"id": sid}, {"_id": 0})
    if not subject:
        raise HTTPException(404, "Subject not found")
    doc = payload.model_dump()
    doc["subject_id"] = sid
    doc["id"] = new_id()
    doc["created_at"] = now_utc().isoformat()
    doc["completed_at"] = now_utc().isoformat() if doc["status"] == "completed" else None
    await db.syllabus_units.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/units/{uid}")
async def update_unit(uid: str, payload: SyllabusUnitIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    if payload.status not in UNIT_STATUSES:
        raise HTTPException(400, "Invalid status")
    update = payload.model_dump()
    if update["status"] == "completed":
        existing = await db.syllabus_units.find_one({"id": uid}, {"_id": 0})
        if not existing or existing.get("status") != "completed":
            update["completed_at"] = now_utc().isoformat()
    else:
        update["completed_at"] = None
    res = await db.syllabus_units.update_one({"id": uid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.syllabus_units.find_one({"id": uid}, {"_id": 0})


@api_router.post("/units/{uid}/status")
async def change_unit_status(uid: str, payload: UnitStatusIn, user: dict = Depends(require_roles("admin", "principal", "faculty"))):
    if payload.status not in UNIT_STATUSES:
        raise HTTPException(400, "Invalid status")
    update = {"status": payload.status, "completed_at": now_utc().isoformat() if payload.status == "completed" else None}
    res = await db.syllabus_units.update_one({"id": uid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.syllabus_units.find_one({"id": uid}, {"_id": 0})


@api_router.delete("/units/{uid}")
async def delete_unit(uid: str, user: dict = Depends(require_roles("admin", "principal"))):
    res = await db.syllabus_units.delete_one({"id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


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

    # Seed library books if empty
    if await db.books.count_documents({}) == 0:
        seed_books = [
            {"title": "Brunner & Suddarth's Textbook of Medical-Surgical Nursing", "author": "Janice L. Hinkle", "isbn": "978-1496347992", "category": "Medical-Surgical", "publisher": "Wolters Kluwer", "edition": "14th", "total_copies": 5},
            {"title": "Fundamentals of Nursing", "author": "Patricia A. Potter", "isbn": "978-0323677721", "category": "Fundamentals", "publisher": "Elsevier", "edition": "10th", "total_copies": 8},
            {"title": "Maternal & Child Health Nursing", "author": "Adele Pillitteri", "isbn": "978-1496348135", "category": "Maternal Health", "publisher": "Wolters Kluwer", "edition": "8th", "total_copies": 4},
            {"title": "Psychiatric Mental Health Nursing", "author": "Mary C. Townsend", "isbn": "978-0803669130", "category": "Mental Health", "publisher": "F.A. Davis", "edition": "9th", "total_copies": 3},
            {"title": "Lehne's Pharmacology for Nursing Care", "author": "Jacqueline Burchum", "isbn": "978-0323512275", "category": "Pharmacology", "publisher": "Elsevier", "edition": "10th", "total_copies": 6},
            {"title": "Anatomy & Physiology for Nurses", "author": "Roger Watson", "isbn": "978-0702083280", "category": "Anatomy", "publisher": "Elsevier", "edition": "14th", "total_copies": 5},
        ]
        for b in seed_books:
            b["id"] = new_id()
            b["created_at"] = now_utc().isoformat()
            await db.books.insert_one(b)


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

