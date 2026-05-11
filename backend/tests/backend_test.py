"""Backend API tests for Nursing College ERP."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nursing-hub-24.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@nursingcollege.edu", "password": "admin123"}
PRINCIPAL = {"email": "principal@nursingcollege.edu", "password": "principal123"}
FACULTY = {"email": "faculty@nursingcollege.edu", "password": "faculty123"}
STUDENT = {"email": "student@nursingcollege.edu", "password": "student123"}


def _session(creds=None):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if creds:
        r = s.post(f"{API}/auth/login", json=creds, timeout=15)
        assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin_sess():
    return _session(ADMIN)


@pytest.fixture(scope="module")
def student_sess():
    return _session(STUDENT)


# ---------------- Auth ----------------
class TestAuth:
    def test_health(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_login_admin_sets_cookies(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "user" in data and data["user"]["email"] == ADMIN["email"]
        assert data["user"]["role"] == "admin"
        # httpOnly cookies
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies

    def test_login_invalid_credentials(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_cookies(self, admin_sess):
        r = admin_sess.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]
        assert "password_hash" not in r.json()

    def test_me_without_cookies(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_register_new_user_and_duplicate(self):
        suffix = str(int(time.time()))
        email = f"TEST_reg_{suffix}@example.com"
        body = {"email": email, "password": "pass1234", "name": "Test Reg", "role": "student"}
        r = requests.post(f"{API}/auth/register", json=body, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email.lower()
        assert data["user"]["role"] == "student"
        # duplicate
        r2 = requests.post(f"{API}/auth/register", json=body, timeout=15)
        assert r2.status_code == 400

    def test_logout(self):
        s = _session(ADMIN)
        r = s.post(f"{API}/auth/logout", timeout=15)
        assert r.status_code == 200
        # /me must fail with cleared cookies in new session
        s2 = requests.Session()
        r2 = s2.get(f"{API}/auth/me", timeout=15)
        assert r2.status_code == 401

    def test_demo_logins(self):
        for creds in [PRINCIPAL, FACULTY, STUDENT]:
            r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
            assert r.status_code == 200, f"login failed for {creds['email']}: {r.text}"


# ---------------- RBAC ----------------
class TestRBAC:
    def test_student_cannot_create_student(self, student_sess):
        r = student_sess.post(f"{API}/students", json={"name": "X", "email": "x@x.com"}, timeout=15)
        assert r.status_code == 403


# ---------------- Students CRUD ----------------
class TestStudents:
    created_id = None

    def test_create_student(self, admin_sess):
        suffix = str(int(time.time()))
        body = {"name": "TEST_Student", "email": f"test_stu_{suffix}@example.com", "phone": "999"}
        r = admin_sess.post(f"{API}/students", json=body, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Student"
        assert d["admission_no"].startswith("NUR")
        assert "id" in d
        TestStudents.created_id = d["id"]

    def test_list_and_get_student(self, admin_sess):
        r = admin_sess.get(f"{API}/students", timeout=15)
        assert r.status_code == 200
        assert any(s["id"] == TestStudents.created_id for s in r.json())
        r2 = admin_sess.get(f"{API}/students/{TestStudents.created_id}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["id"] == TestStudents.created_id

    def test_update_student(self, admin_sess):
        body = {"name": "TEST_Student_Updated", "email": "updated_stu@example.com"}
        r = admin_sess.put(f"{API}/students/{TestStudents.created_id}", json=body, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Student_Updated"

    def test_delete_student(self, admin_sess):
        r = admin_sess.delete(f"{API}/students/{TestStudents.created_id}", timeout=15)
        assert r.status_code == 200
        r2 = admin_sess.get(f"{API}/students/{TestStudents.created_id}", timeout=15)
        assert r2.status_code == 404


# ---------------- Faculty CRUD ----------------
class TestFaculty:
    fid = None

    def test_create_faculty(self, admin_sess):
        suffix = str(int(time.time()))
        body = {"name": "TEST_Faculty", "email": f"test_fac_{suffix}@example.com",
                "department": "Nursing", "designation": "Lecturer"}
        r = admin_sess.post(f"{API}/faculty", json=body, timeout=15)
        assert r.status_code == 200, r.text
        TestFaculty.fid = r.json()["id"]

    def test_list_update_delete_faculty(self, admin_sess):
        r = admin_sess.get(f"{API}/faculty", timeout=15)
        assert r.status_code == 200
        assert any(f["id"] == TestFaculty.fid for f in r.json())
        upd = admin_sess.put(f"{API}/faculty/{TestFaculty.fid}", json={
            "name": "TEST_Faculty_U", "email": "fac_u@example.com",
            "department": "Nursing", "designation": "Senior Lecturer"
        }, timeout=15)
        assert upd.status_code == 200
        assert upd.json()["designation"] == "Senior Lecturer"
        d = admin_sess.delete(f"{API}/faculty/{TestFaculty.fid}", timeout=15)
        assert d.status_code == 200


# ---------------- Courses ----------------
class TestCourses:
    def test_seeded_courses(self, admin_sess):
        r = admin_sess.get(f"{API}/courses", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        codes = {c["code"] for c in rows}
        assert {"BSC-NUR", "GNM", "MSC-NUR"}.issubset(codes), f"Got: {codes}"

    def test_create_course(self, admin_sess):
        suffix = str(int(time.time()))
        body = {"code": f"TEST{suffix}", "name": "TEST Course", "duration_years": 2,
                "total_seats": 30, "fee_per_year": 10000}
        r = admin_sess.post(f"{API}/courses", json=body, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        admin_sess.delete(f"{API}/courses/{cid}", timeout=15)


# ---------------- Fees ----------------
class TestFees:
    def test_create_and_pay_fee(self, admin_sess):
        # Need a student
        suffix = str(int(time.time()))
        st = admin_sess.post(f"{API}/students",
                             json={"name": "TEST_FeeStu", "email": f"feestu_{suffix}@example.com"}, timeout=15)
        assert st.status_code == 200
        sid = st.json()["id"]
        # create fee
        r = admin_sess.post(f"{API}/fees", json={"student_id": sid, "amount": 5000.0,
                                                  "description": "TEST Tuition"}, timeout=15)
        assert r.status_code == 200
        fee = r.json()
        assert fee["status"] == "pending"
        fid = fee["id"]
        # pay
        pay = admin_sess.post(f"{API}/fees/{fid}/pay", json={"method": "cash", "note": "test"}, timeout=15)
        assert pay.status_code == 200
        p = pay.json()
        assert p["status"] == "paid"
        assert p.get("receipt_no", "").startswith("RCT")
        # list enriched
        ls = admin_sess.get(f"{API}/fees", timeout=15)
        assert ls.status_code == 200
        match = [f for f in ls.json() if f["id"] == fid]
        assert match and match[0].get("student_name") == "TEST_FeeStu"
        # cleanup
        admin_sess.delete(f"{API}/fees/{fid}", timeout=15)
        admin_sess.delete(f"{API}/students/{sid}", timeout=15)


# ---------------- Attendance ----------------
class TestAttendance:
    def test_attendance_upsert(self, admin_sess):
        suffix = str(int(time.time()))
        st = admin_sess.post(f"{API}/students",
                             json={"name": "TEST_AttStu", "email": f"attstu_{suffix}@example.com"}, timeout=15)
        sid = st.json()["id"]
        date = "2026-01-15"
        r1 = admin_sess.post(f"{API}/attendance",
                             json={"student_id": sid, "date": date, "status": "absent", "type": "class"}, timeout=15)
        assert r1.status_code == 200
        first_id = r1.json()["id"]
        # second call upserts
        r2 = admin_sess.post(f"{API}/attendance",
                             json={"student_id": sid, "date": date, "status": "present", "type": "class"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["id"] == first_id  # updated, not duplicated
        assert r2.json()["status"] == "present"
        # listing
        ls = admin_sess.get(f"{API}/attendance?date={date}", timeout=15)
        assert ls.status_code == 200
        m = [a for a in ls.json() if a["id"] == first_id]
        assert m and m[0].get("student_name") == "TEST_AttStu"
        admin_sess.delete(f"{API}/students/{sid}", timeout=15)


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard_stats(self, admin_sess):
        r = admin_sess.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in ["students_count", "faculty_count", "courses_count",
                    "fees_collected", "fees_pending", "attendance_pct",
                    "enrollment", "fee_chart", "attendance_dist"]:
            assert key in d, f"missing {key}"
        assert isinstance(d["enrollment"], list)
        assert isinstance(d["fee_chart"], list)
        assert isinstance(d["attendance_dist"], list)
        assert d["courses_count"] >= 3
