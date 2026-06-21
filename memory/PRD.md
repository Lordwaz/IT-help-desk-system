# IT Help Desk - Product Requirements Document

## Original Problem Statement
Build a full-stack IT Help Desk ticketing system for a managed IT services provider. React + FastAPI + MongoDB + JWT auth. Three user roles (Requester, Technician, Admin). Features include ticket management with status workflow, SLA tracking, Knowledge Base, in-app notifications, dashboards with charts, and CSV export. Design: clean B2B dashboard, navy/slate/grey with blue accent, sidebar nav, data tables.

## User Personas
- **Requester** (end user): submits tickets, tracks own queue, browses KB
- **Technician**: works assigned queue, replies to requesters, posts internal notes, authors KB articles
- **Admin**: creates users, configures SLA rules, sees full reporting and CSV export

## Architecture
- **Backend**: FastAPI (single-file `server.py`), MongoDB via motor, bcrypt + PyJWT, Emergent Object Storage for attachments, Resend for transactional email
- **Frontend**: React 19 + react-router 7, shadcn UI + Tailwind, Recharts for charts, sonner toasts, axios with Bearer + cookie auth
- **Auth**: JWT in httpOnly cookie AND Authorization: Bearer (localStorage fallback)

## What's been implemented (2026-02-19)
- JWT auth with bcrypt; admin auto-seeded `admin@helpdesk.com / Admin123!`
- Forgot/reset password with Resend (mocked — placeholder API key)
- User management: admin CRUD, role + active toggle
- Ticket CRUD with auto-numbered TCK-XXXX, full status workflow, manual assignment
- Comments with internal-note visibility filter, ticket history/audit log
- File attachments via Emergent Object Storage
- SLA rules per priority (configurable), countdown + breach badges (visual)
- Knowledge Base CRUD with search, helpful/not-helpful feedback
- In-app notifications with bell + unread badge (assignment, status change, new comment)
- Admin dashboard with Recharts (bar/line/pie), KPI cards, technician workload, avg resolution time, SLA breach count
- CSV export of tickets (admin-only)
- Tested end-to-end via testing agent — all critical flows passing

## Prioritized Backlog
- **P1** Real Resend API key from user → enable transactional email delivery
- **P1** SLA "about-to-breach" automatic notification (1 hour before deadline, via scheduler)
- **P2** Bulk ticket actions (bulk assign/close)
- **P2** Link KB article to ticket resolution (UI selector on ticket detail)
- **P2** Date-range filter UI on dashboard (backend supports start/end already)
- **P3** Saved ticket views/filters per user
- **P3** Customer satisfaction survey on closed tickets
