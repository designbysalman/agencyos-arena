# Deliverable 3 — UI/UX Blueprint

**Status:** Proposed — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Design Direction

Inspired by HelloBonsai and HoneyBook for usability, information architecture, and workflow quality — not copied interfaces.

**Design tokens (confirmed from brief):**
- Main canvas: `#F8F9FA`
- Primary text: `#111827`
- Primary accent: `#047857` (emerald green)
- Light and dark themes supported
- Clean, sophisticated, modern SaaS aesthetic

**Additional foundations (proposed):**
- Typography: system font stack with optional Inter for UI; clear hierarchy (h1–h6, body, label, caption, overline)
- Spacing: 4px-based scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
- Border radius: 6px default, 8px for cards, 12px for modals/dialogs
- Elevation: subtle shadows, hairline borders (`#E5E7EB`), elevated surfaces in dark theme
- Transitions: 150–250ms ease-out for hover/state changes; motion reduced per user preference
- Iconography: Lucide React, consistent stroke weight, accessible labels

**Design system deliverables (built in-house, no paid component library):**
- Centralized design tokens (CSS variables via Tailwind config + theme object for JS access)
- Reusable component library: Button, Input, Select, Dialog, Dropdown, Table, Card, Badge, Avatar, Tabs, Skeleton, Toast, EmptyState, ConfirmationDialog, DataTable with sorting/filtering/pagination
- Form system with Zod integration and accessible error messaging
- Layout primitives: Sidebar, TopNav, PageHeader, Breadcrumb, Container, Grid

---

## 2. Information Architecture

Top-level navigation (sidebar, collapsible):

1. **Dashboard** — Home; role-specific overview cards (revenue, open opportunities, upcoming tasks, overdue invoices)
2. **CRM** — Contacts, Accounts, Leads, Opportunities, Pipelines, Service Catalog
3. **Sales** — Proposals, Quotes, Contracts, Document Templates, E-Signatures
4. **Projects** — Project Workspaces, Tasks, Milestones, Time Tracking, Files, Approvals
5. **Finance** — Invoices, Estimates, Payments, Expenses, Financial Reports
6. **Automation** — Workflows, Notifications, Templates, Scheduling
7. **Communication** — Shared Inbox, Message History, Email/WhatsApp architecture
8. **Settings** — Users, Roles & Permissions, Client Access, Workspace & Branding, Tax, Audit Log, Integrations, Feature Flags

**Global header:** agency branding, global search (permission-aware), notifications bell, create (+) quick actions, user profile + theme switch.

**Client portal (separate layout, minimal chrome):**
- Dashboard: active projects, open invoices, pending approvals
- Projects: view progress, download files, approve proofs, request changes
- Invoices: view, download PDF, record/confirm payment
- Documents: e-sign proposals and contracts
- Messages: threaded communication with agency

---

## 3. Screen Hierarchy

```
App
├── Dashboard (role-based widgets)
├── CRM
│   ├── Contacts (list → detail → edit)
│   ├── Accounts (list → detail → edit)
│   ├── Leads (kanban by pipeline stage → detail → convert)
│   ├── Opportunities (list → detail → edit → pipeline view)
│   └── Pipelines (stages configuration)
├── Sales
│   ├── Proposals (list → builder → preview → send → track)
│   ├── Quotes (list → builder → PDF → send)
│   ├── Contracts (list → editor → versions → e-sign request)
│   ├── Templates (gallery → create/edit)
│   └── Document Links (shared links management)
├── Projects
│   ├── Workspaces (list → project detail hub)
│   │     ├── Overview (timeline, status, budget)
│   │     ├── Tasks (list/board → task detail)
│   │     ├── Milestones (timeline → detail)
│   │     ├── Time (entries → approvals)
│   │     ├── Files (folders → uploads → versions)
│   │     ├── Approvals (client feedback → revisions)
│   │     └── Change Orders (list → detail → approve)
│   └── Templates (project templates)
├── Finance
│   ├── Invoices (list → detail → PDF → record payment)
│   ├── Estimates (list → convert to invoice)
│   ├── Payments (list → record manual payment)
│   ├── Expenses (list → categorize → link to project)
│   └── Reports (revenue, profitability, forecasting)
├── Automation
│   ├── Workflows (rule builder: trigger → conditions → actions)
│   ├── Notifications (preferences, history)
│   └── Scheduling (calendar view, reminders)
├── Communication
│   ├── Inbox (shared, threads → detail)
│   └── History (per-contact communication log)
└── Settings
    ├── Users & Roles
    ├── Client Access (portal configuration)
    ├── Workspace & Branding (logo, colors, domain)
    ├── Tax Settings
    ├── Audit Log
    ├── Integrations (email, WhatsApp, AI gateway)
    └── Feature Flags
```

**Common patterns across all screens:** list view with empty state, detail view with actions, edit view with validation, delete confirmation, toast notifications for success/error, skeleton loaders while fetching.

---

## 4. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Sidebar collapses to bottom-nav or left drawer; tables become stacked cards; global search in header modal; multi-step forms stack vertically |
| Tablet (768–1024px) | Sidebar collapses to icons-only; kanban boards scroll horizontally; detail views stack sections |
| Desktop (> 1024px) | Full sidebar + top nav; side-by-side panels where useful (e.g., proposal builder + preview) |

Touch targets ≥ 44px; navigation accessible via keyboard; focus states visible; screen-reader labels on icon buttons.

---

## 5. Initial User Journeys

**Journey 1 — Onboard a new client and win work**
1. Admin creates contact + account; logs first touch
2. Lead entered into pipeline; moved through stages by sales
3. Proposal built from template, sent via shareable link
4. Client receives link, views proposal, accepts
5. Contract generated, e-signed
6. Onboarding checklist triggers project creation

**Journey 2 — Deliver a project and get paid**
1. Project workspace created from template with milestones and tasks
2. Team logs time; client reviews proofs and approves revisions
3. Invoice generated from approved milestone; sent to client
4. Client pays via bank transfer; admin records payment
5. Financial dashboard updates; profitability report reflects project margin

**Journey 3 — Admin manages the platform**
1. Admin invites team member, assigns role
2. Role permissions limit access to assigned modules
3. Admin configures tax settings (not auto-enabled), branding, and portal access
4. Audit log reviewed monthly; backup verified

---

## 6. State & Status Handling (required on every screen)

- **Empty state:** illustration-free illustration (icon + heading + CTA), actionable ("Create your first invoice")
- **Loading:** skeleton or spinner; page-level and inline variants
- **Error:** inline field errors + page-level error banner with retry action
- **Success:** toast confirmation; undo where destructive (e.g., delete invoice within 5 seconds)

---

## 7. Acceptance Criteria for This Deliverable

- [ ] Design tokens defined (colors, typography, spacing, dark theme)
- [ ] Information architecture and navigation map documented
- [ ] Screen hierarchy and responsive breakpoints specified
- [ ] Initial user journeys mapped end-to-end
- [ ] Loading/empty/error/success state standards defined
- [ ] Reviewed and approved before UI implementation begins
