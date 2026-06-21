# IT Help Desk System

A full-stack IT operations help desk built to mirror the ticketing workflows used in MSP/field-service environments — designed around my contract field technician work with Quattris Global IT and general L1/L2 support patterns.

**Live preview:** `itops-hub.preview.emergentagent.com`
**Stack:** Built on Emergent (full-stack app generation), with a custom ticketing data model, SLA engine, and reporting dashboard.

---

## Overview

The system gives requesters a self-service portal to log issues and gives ops/support staff a single queue to triage, assign, and resolve tickets against SLA targets. It's built around four core entities: **Tickets, Priority, Status, SLA**.

![Ticket Queue](./screenshots/ticket-queue.png)

## Features

- **Ticket Queue** — searchable/filterable list (by title, description, ticket #, status, priority, category)
- **Priority taxonomy** — `Low`, `Medium`, `High`, `Critical`, each mapped to a distinct SLA window
- **Status workflow** — `New → In Progress → Resolved → Closed`
- **SLA countdown timer** — live remaining time per ticket, calculated from creation timestamp + priority-based SLA target
- **Assignment** — tickets can be claimed/assigned to a technician (currently supports unassigned queue view for triage)
- **Knowledge Base** — self-service article section to deflect repeat low-complexity tickets
- **Reporting dashboard** *(in progress)* — ticket volume, SLA compliance rate, average resolution time

## SLA Policy

| Priority | SLA Target | Example |
|----------|-----------|---------|
| Critical | 4 hours | Production server down, no network connectivity |
| Medium | 24 hours | VPN client failing for remote staff |
| Low | 72 hours | Printer unresponsive, cosmetic requests (e.g. wallpaper change) |

SLA countdowns are calculated server-side from ticket creation time and surfaced in the queue so technicians can sort by urgency at a glance, rather than relying on priority labels alone.

## Sample Ticket Queue

| Ticket | Title | Priority | Status | SLA Remaining |
|--------|-------|----------|--------|----------------|
| TCK-0002 | Production server down — no network connectivity | Critical | New | 3h 33m |
| TCK-0003 | VPN client failing to connect for remote staff | Medium | New | 23h 36m |
| TCK-0004 | Request to update desktop wallpaper to company branding | Low | New | 71h |
| TCK-0005 | Printer on 2nd floor not responding | Low | New | 71h |

## Why I Built This

As a field service technician working through a remote engineer/on-site hands model (Quattris Global IT), and aiming toward SOC/help desk roles, I wanted hands-on experience building — not just using — the kind of ticketing and SLA tooling that IT operations teams run on daily. This project demonstrates:

- Data modeling for ticket lifecycle and SLA enforcement
- Prioritization/triage logic relevant to MSP and internal IT support
- Full-stack delivery (frontend queue UI, backend SLA calculation, auth/session for requester identity)

## Roadmap

- [ ] Technician assignment workflow + auto-routing by category
- [ ] Reporting dashboard (SLA compliance %, MTTR, ticket volume trends)
- [ ] Email/notification integration for SLA breach warnings
- [ ] Role-based views (Requester vs Technician vs Admin)

## Screenshots

*(Add ticket queue, ticket detail view, and knowledge base screenshots here)*

---

**Author:** Wasiu Shittu
[LinkedIn](https://linkedin.com/in/wasiu-shittu) · [GitHub](https://github.com/Lordwaz)

