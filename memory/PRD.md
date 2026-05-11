# Nursing College Management ERP - PRD

## Original Problem Statement
Build a modern, scalable, cloud-based Nursing College Management ERP for nursing institutes and healthcare education campuses. Modules requested: Student Management, Academic Management, Faculty & Staff, Fee & Finance, Hostel & Transport, Library, Communication, Clinical & Hospital Training, Reports & Analytics, multi-role User Portals. Tech: React + FastAPI + MongoDB, healthcare blue/white theme.

## User-Selected MVP Scope
- Modules: Student Management, Academic (Courses), Fees, Faculty, Auth, Dashboard
- Auth: JWT-based custom auth with role-based access (admin, principal, faculty, student, parent)
- Payments: Skipped for v1
- AI: Skipped for v1
- Theme: Clean healthcare blue & white

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), all routes prefixed `/api`, MongoDB via motor.
- **Frontend**: React + Tailwind + shadcn/ui, Recharts for analytics, Work Sans (heading) + IBM Plex Sans (body).
- **Auth**: bcrypt password hashing + PyJWT, httpOnly cookies (access 1d, refresh 7d) with Bearer header fallback.
- **DB**: collections — users, students, faculty, courses, fees, attendance.

## User Personas
- **Admin** — Full access to all modules including delete.
- **Principal** — All modules except delete (read/write).
- **Faculty** — Mark attendance, view students/courses.
- **Student** — View own profile, fees, courses, attendance.
- **Parent** — View ward's fees & attendance.

## Implemented (2026-02)
- JWT auth: register, login, logout, refresh, me + role-based dependency.
- Admin auto-seeding + 3 demo accounts + 3 seed courses (BSC-NUR, GNM, MSC-NUR).
- Students CRUD with auto admission number generation, course assignment, scholarship.
- Faculty CRUD with department, designation, salary.
- Courses CRUD with seats and yearly fee.
- Fees: create invoice → mark paid → auto receipt no.
- Attendance: class & clinical tracking with upsert by (student_id, date, type).
- Dashboard: stats cards (students/faculty/courses/attendance%), fee collected/pending, enrollment bar chart, monthly fee line chart, attendance distribution donut.
- Role-aware sidebar navigation, sticky topbar with logout.
- Healthcare blue/white themed UI with hero login.

## Tested & Verified
- 20/20 backend pytest cases passed.
- Full frontend E2E flow verified (login, dashboard, sidebar, courses, students CRUD, role-based nav, logout).

## Backlog / Next Tasks (P0 → P2)
**P0**
- Tighten CORS (specific origin) in backend/.env when going to production.
- Add data-testid to remaining dialog form inputs (phone, dob, address, etc.) for better automation.

**P1**
- Hostel & Transport modules.
- Library module (book inventory + issue/return).
- Communication (SMS/Email/WhatsApp).
- Clinical training: hospital postings + case logs detailed.
- Razorpay/Stripe payment gateway integration.
- ID card generator + scholarship workflow + parent portal expansion.

**P2**
- AI chatbot (Claude/GPT) for student queries.
- AI performance prediction.
- NAAC/INC compliance report exports (PDF/Excel).
- LMS integration & online learning.
- Biometric attendance import.

## Test Credentials
See `/app/memory/test_credentials.md`.
