# Deliverable 3 — UI/UX Blueprint (Revised)

**Status:** Revised — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`  
**Supersedes:** Initial planning draft (PR #1)  
**Related:** ADR-0006 (UI Framework and Design System)

---

## 1. Design Direction

Benchmarked against HelloBonsai and HoneyBook for usability, information architecture, interaction quality, and workflow efficiency — not copied interfaces.

**Design tokens (confirmed from brief):**
- Main canvas: `#F8F9FA`
- Primary text: `#111827`
- Primary accent: `#047857` (emerald green)
- Light and dark themes supported

**Additional foundations (proposed, per ADR-0006):**
- Typography: system font stack with Inter for UI; clear hierarchy (h1–h6, body, label, caption, overline)
- Spacing: 4px-based scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
- Border radius: 6px default, 8px cards, 12px modals/dialogs
- Elevation: subtle shadows, hairline borders (`#E5E7EB`), elevated surfaces in dark theme
- Transitions: 150–250ms ease-out for hover/state changes; `prefers-reduced-motion` respected
- Iconography: Lucide React, consistent stroke weight, accessible labels

---

## 2. Design System & Reusable Component System

Per ADR-0006: Next.js App Router + Tailwind CSS + headless primitives (Radix UI) + Lucide React.

**Design token layer:** Centralized tokens in Tailwind config + a JavaScript theme object for JS access (canvas, text, accent, spacing, radius, elevation, transitions).

**Component library (built in-house, no paid component library):**
| Component | Description | Accessibility |
|---|---|---|
| Button | Primary, secondary, ghost, danger; loading state | Keyboard, focus, ARIA |
| Input | Text, email, number, password; validation states | Label, error messaging |
| Select | Single/multi, searchable | Keyboard, ARIA |
| Dialog | Modal, drawer variants | Focus trap, ESC close, ARIA |
| Dropdown | Menu, select trigger | Keyboard, ARIA |
| Table | Sorting, filtering, pagination | ARIA, header scope |
| Card | Elevated surface, padding variants | — |
| Badge | Status, category | Color + text contrast |
| Avatar | User initials / image | ARIA label |
| Tabs | Horizontal/vertical | Keyboard, ARIA |
| Skeleton | Page-level and inline loading | ARIA busy |
| Toast | Success/error/info, auto-dismiss, undo | ARIA live region |
| EmptyState | Icon + heading + CTA | Actionable |
| ConfirmationDialog | Destructive action confirm | Focus, ARIA |
| DataTable | Sorting/filtering/pagination with server-side | ARIA |
| Form | Zod-integrated, accessible error messaging, field descriptions | ARIA-invalid, described-by |
| Layout | Sidebar, TopNav, PageHeader, Breadcrumb, Container, Grid | Landmarks, skip-link |

**Theme system:** CSS variables for light/dark; theme switch persists preference; system default respected.

---

## 3. Screen Inventory

### Shell (all internal screens)
- Layout shell: collapsible sidebar + top header
- Global header: agency branding, global search (permission-aware), notifications bell, create (+) quick actions, user profile + theme switch
- Login / register / password reset / MFA setup pages

### Dashboard
- Dashboard home — role-specific overview cards (revenue, open opportunities, upcoming tasks, overdue invoices)

### CRM
- Contacts (list → detail → edit)
- Accounts (list → detail → edit)
- Leads (kanban by pipeline stage → detail → convert)
- Opportunities (list → detail → edit → pipeline/kanban view)
- Pipelines (stages configuration)

### Sales
- Proposals (list → builder → preview → send → track)
- Quotes (list → builder → PDF → send)
- Contracts (list → editor → versions → e-sign request)
- Templates (gallery → create/edit)
- Document links (shared links management)

### Projects
- Workspaces (list → project detail hub)
  - Overview (timeline, status, budget)
  - Tasks (list/board → task detail)
  - Milestones (timeline → detail)
  - Time (entries → approvals)
  - Files (folders → uploads → versions)
  - Approvals (client feedback → revisions)
  - Change orders (list → detail → approve)
- Templates (project templates)

### Finance
- Invoices (list → detail → editor → PDF → record payment)
- Estimates (list → convert to invoice)
- Payments (list → record manual payment)
- Expenses (list → categorize → link to project)
- Reports (revenue, profitability, forecasting)

### Automation
- Workflows (rule builder: trigger → conditions → actions)
- Notifications (preferences, history)
- Scheduling (calendar view, reminders)

### Communication
- Inbox (shared, threads → detail)
- History (per-contact communication log)

### Settings
- Users & Roles
- Custom Roles & Permissions
- Client Access (portal configuration)
- Workspace & Branding (logo, colors, domain)
- Tax Settings
- Audit Log
- Integrations (email, WhatsApp, AI gateway)
- Feature Flags
- Secure Developer Workspace (admin-gated)

### Client Portal (separate layout, minimal chrome)
- Portal dashboard: active projects, open invoices, pending approvals
- Projects: view progress, download files, approve proofs, request changes
- Invoices: view, download PDF, confirm payment
- Documents: e-sign proposals and contracts
- Messages: threaded communication with agency

---

## 4. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Sidebar collapses to bottom-nav or left drawer; tables become stacked cards; global search in header modal; multi-step forms stack vertically |
| Tablet (768–1024px) | Sidebar collapses to icons-only; kanban boards scroll horizontally; detail views stack sections |
| Desktop (> 1024px) | Full sidebar + top nav; side-by-side panels (e.g., proposal builder + preview) |

**Universal:** touch targets ≥ 44px; keyboard-navigable; visible focus states; screen-reader labels on all icon buttons.

---

## 5. Screen-Level Workflows (Initial User Journeys)

**Journey 1 — Onboard a new client and win work**
1. Admin creates contact + account; logs first touch
2. Lead entered into pipeline; moved through stages by sales
3. Proposal built from template, sent via shareable link
4. Client receives link (portal), views proposal, accepts
5. Contract generated, e-signature requested
6. Onboarding checklist triggers project creation

**Journey 2 — Deliver a project and get paid**
1. Project workspace created from template with milestones and tasks
2. Team logs time; client reviews proofs and approves revisions
3. Invoice generated from approved milestone; sent to client
4. Client pays via bank transfer; admin records payment
5. Financial dashboard updates; profitability report reflects margin

**Journey 3 — Admin manages the platform**
1. Admin invites team member, assigns role/custom permissions
2. Admin configures tax settings (opt-in, not auto-enabled), branding, portal access
3. Audit log reviewed; backup verified

---

## 6. State & Status Handling (required on every screen)

- **Empty state:** icon + heading + actionable CTA ("Create your first invoice")
- **Loading:** skeleton (page-level and inline variants)
- **Error:** inline field errors + page-level error banner with retry action
- **Success:** toast confirmation; undo where destructive (e.g., delete invoice within 5 seconds)

---

## 7. Accessibility Standards

- WCAG 2.1 AA target
- Keyboard navigation on all interactive elements
- Visible focus outlines
- ARIA labels on icon buttons and custom widgets
- Color contrast ≥ 4.5:1 (text), ≥ 3:1 (large text/UI)
- `prefers-reduced-motion` respected (reduced/removed animations)
- Skip-to-content link on internal pages
- Form fields programmatically linked to labels and error messages

---

## 8. UI Review Checkpoints

| Checkpoint | When | Owner | Criteria |
|---|---|---|---|
| Design system sign-off | End of Phase 0 | UI/UX design director | Tokens render in light/dark; base components accessible |
| Component audit | End of each phase | Lead engineer + UI/UX | All new screens use design system; no one-off styles |
| Accessibility review | Before Phase 4 and Phase 6 gates | UI/UX + QA | Keyboard nav, ARIA, contrast verified on critical paths |
| Responsive review | Before each phase gate | UI/UX | Mobile/tablet/desktop verified on critical screens |
| Final UX review | Launch review (post-Phase 6) | UI/UX design director | Full journeys tested end-to-end |

---

## 9. Acceptance Criteria for This Deliverable

- [ ] Design tokens defined (colors, typography, spacing, dark theme)
- [ ] Reusable component system specified with accessibility notes
- [ ] Screen inventory documented (internal + client portal)
- [ ] Responsive breakpoints and behavior specified
- [ ] Initial user journeys mapped end-to-end
- [ ] Loading/empty/error/success state standards defined
- [ ] Accessibility standards (WCAG 2.1 AA) stated
- [ ] UI review checkpoints defined per phase
- [ ] Reviewed and approved before UI implementation begins
