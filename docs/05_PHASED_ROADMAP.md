# Deliverable 5 — Phased Development Roadmap (Revised)

**Status:** Revised — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`  
**Supersedes:** Initial planning draft (PR #1)

---

## 1. Roadmap Philosophy

- Small, reviewable changes over enormous unverified implementations
- Each phase has objectives, scope, dependencies, database changes, API requirements, frontend components, security requirements, testing requirements, acceptance criteria, and a GitHub checkpoint
- Real functionality, not decorative mocks; temporary mocks documented and replaced before a feature is declared complete
- Implementation starts only after architecture review and explicit approval; no direct commits to `main`
- **The 22-week figure is a provisional planning estimate, not a guaranteed schedule.** Actual duration depends on review turnaround, complexity discovered during implementation, and staffing. Measurable milestones and quality gates (below) govern progress, not the calendar.

---

## 2. Phase Summary (provisional estimates)

| Phase | Focus | Est. Duration | Gate to next |
|---|---|---|---|
| 0 | Foundation & Infrastructure | 3 weeks | Phase 0 checkpoint passed |
| 1 | CRM & Sales | 3 weeks | Phase 1 acceptance criteria met |
| 2 | Proposals & Documents | 3 weeks | Phase 2 acceptance criteria met |
| 3 | Projects & Delivery | 4 weeks | Phase 3 acceptance criteria met |
| 4 | Finance | 3 weeks | Phase 4 acceptance criteria met |
| 5 | Automation & Communication | 3 weeks | Phase 5 acceptance criteria met |
| 6 | Administration & Platform | 3 weeks | Phase 6 acceptance criteria met |
| **Total** | **MVP feature-complete** | **~22 weeks (provisional)** | **Launch review** |

Revenue-critical workflows (CRM → proposals → projects → finance) are front-loaded so the agency can operate end-to-end as early as possible.

---

## 3. Measurable Milestones & Quality Gates

Each phase ends with a **quality gate** that must pass before the next phase begins:

| Gate | Criteria |
|---|---|
| Code quality | Lint clean, type-check clean, Prettier formatted; PR review completed |
| Testing | Unit + component tests pass; E2E critical-path tests pass; access-control matrix tests pass |
| Security | Auth/session review, input validation, file-upload validation, no secrets in code |
| Documentation | Phase deliverables updated; ADRs created/revised as needed |
| Acceptance | All phase acceptance criteria met and merged to `main` via PR |

---

## 4. Phase 0 — Foundation & Infrastructure

**Objectives:** Establish repo, tooling, database, auth core, design system; verified base for later phases.

**Scope:**
- Repo structure, TypeScript (strict), ESLint, Prettier, Husky pre-commit hooks
- Next.js (App Router) + Tailwind + design system tokens (`#F8F9FA`, `#111827`, `#047857`, dark theme)
- Docker Compose dev environment: Next.js server + PostgreSQL + pg-boss (local only; no cloud resources provisioned)
- No paid infrastructure assumed or provisioned in Phase 0; remote deployment decision deferred to post-Phase-0 stakeholder approval
- Prisma schema with core tables (organizations, users, roles, permissions, sessions, audit_logs, custom_fields, feature_flags)
- Authentication via maintained self-hosted library (ADR-0001): register, login, logout, password reset, MFA, httpOnly cookies
- RBAC middleware + permission guards (ADR-0004)
- CI: GitHub Actions (lint, type-check, tests, build)
- `/docs` deliverables reviewed; decision log (ADRs) started

**Dependencies:** None

**Database changes:** `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_sessions`, `audit_logs`, `custom_fields`, `custom_field_values`, `feature_flags`

**API requirements:** Auth endpoints (register/login/logout/me/reset-password), role/permission seed (admin only)

**Frontend components:** Login page, layout shell (sidebar, top nav), design token foundation, theme switch, loading/empty/error primitives

**Security:** Password hashing via library, session cookie attributes, CSRF protection, rate limiting on auth endpoints, no secrets in Git (`.env.example` only)

**Testing:** Unit tests for auth service and permission guards; E2E smoke test (register → login → protected page)

**Acceptance criteria:**
- [ ] New developer clones repo, runs `docker compose up`, accesses app locally
- [ ] No cloud/paid infrastructure provisioned; app runs entirely on local Docker
- [ ] Register/login/logout works with secure cookies
- [ ] Unauthenticated users cannot access protected routes
- [ ] CI passes on push; type-check and lint clean
- [ ] Design tokens render correctly in light and dark modes

**Checkpoint:** GitHub PR "Phase 0: Foundation & Infrastructure" — reviewed and merged before Phase 1.

---

## 5. Phase 1 — CRM & Sales

**Objectives:** Track leads and opportunities through customizable pipelines — first revenue workflow.

**Scope:** Contacts, accounts, leads, pipelines/stages, opportunities, stage transitions, lead→opportunity conversion, permission-aware search.

**Dependencies:** Phase 0

**Database changes:** `contacts`, `accounts`, `account_contacts`, `leads`, `pipelines`, `pipeline_stages`, `opportunities`

**API requirements:** CRUD for contacts/accounts/leads/pipelines/stages/opportunities; stage-transition validation; search endpoint

**Frontend components:** Contact/account list+detail+edit; lead intake form; pipeline stage config; opportunity kanban board; opportunity detail + conversion

**Security:** Org-scoped queries; role-based access; audit log on mutations

**Testing:** Unit tests for pipeline transition rules; E2E for lead → opportunity → won/lost

**Acceptance criteria:**
- [ ] Admin configures pipelines and stages
- [ ] User creates lead → converts to opportunity → moves stages → marks won/lost
- [ ] Org-scoping verified in tests
- [ ] All mutations appear in audit log

**Checkpoint:** GitHub PR "Phase 1: CRM & Sales" — reviewed and merged.

---

## 6. Phase 2 — Proposals & Documents

**Objectives:** Turn won opportunities into proposals, quotes, contracts with PDF generation and shareable links.

**Scope:** Proposal builder, quotation builder, document templates, PDF generation, shareable document links, version control, contract records, conditional approvals, e-signature architecture (interface only).

**Dependencies:** Phase 1

**Database changes:** `proposals`, `proposal_versions`, `quotes`, `contracts`, `documents`, `document_versions`, `document_links`, `signatures`

**API requirements:** Proposal/quote CRUD, template CRUD, PDF generation endpoint, shareable link creation/verification, document download, signature recording

**Frontend components:** Proposal builder (editor + live preview), quote builder, template gallery, document list, share-link management, PDF viewer

**Security:** Shareable links token-validated + expiry; document access scoped to client/org; PDFs server-side; e-signature adapter interface (no fake provider behavior)

**Testing:** Unit tests for PDF content, link expiry; E2E for create proposal → send link → client views → accept

**Acceptance criteria:**
- [ ] Proposal generated from template; PDF rendered correctly
- [ ] Shareable link works within expiry, rejects after expiry
- [ ] Proposal versions retained on edit
- [ ] E-signature adapter interface exists

**Checkpoint:** GitHub PR "Phase 2: Proposals & Documents" — reviewed and merged.

---

## 7. Phase 3 — Projects & Delivery

**Objectives:** Deliver work: project workspaces, tasks, milestones, time tracking, files, client approvals, change orders.

**Scope:** Project workspaces from templates/manual; tasks; milestones/timeline; project templates; file/asset management; time tracking; client feedback/approvals; revision management; change orders; workload view.

**Dependencies:** Phase 1, Phase 2

**Database changes:** `projects`, `project_templates`, `tasks`, `task_time_entries`, `milestones`, `project_files`, `change_orders`, `issues`

**API requirements:** Project/task/milestone CRUD, time entry CRUD, file upload (validated, object storage, signed URL download), change order CRUD, approval workflow

**Frontend components:** Project hub, task board/list, time entry form, file upload with progress, client approval view, workload dashboard

**Security:** File type/size validation; files outside web root, signed URLs; task access limited to project members/assignees; clients see only own project files

**Testing:** Unit tests for time-entry aggregation and change-order math; E2E for create project → complete task → log time → client approves

**Acceptance criteria:**
- [ ] Project from template populates default tasks/milestones
- [ ] Time entries aggregate to project totals
- [ ] Uploaded files downloadable only by authorized users via signed URLs
- [ ] Client approval flow records decision + timestamp

**Checkpoint:** GitHub PR "Phase 3: Projects & Delivery" — reviewed and merged.

---

## 8. Phase 4 — Finance

**Objectives:** Bill clients and track money manually (no payment gateway).

**Scope:** Invoicing with flexible numbering; line items; configurable tax (NOT auto-enabled — explicit opt-in); estimates convertible to invoices; partial payments/deposits; manual bank transfer recording; invoice status; PDF invoices + public preview links; expense management; financial dashboards; profitability reporting; multi-currency readiness.

**Dependencies:** Phase 3

**Database changes:** `invoices`, `invoice_items`, `payments`, `estimates`, `expense_items`, `tax_settings`, `currency_config`

**API requirements:** Invoice CRUD, atomic numbering service, payment recording, estimate→invoice conversion, expense CRUD, PDF invoice generation, financial report aggregates

**Frontend components:** Invoice list/detail/editor, payment record form, estimate list, expense tracker, financial dashboard, tax settings page (opt-in toggle with warning)

**Security:** Atomic invoice numbering (no duplicates); payment recording requires permission; financial data restricted to internal roles; tax zero unless `tax_settings.registered = true`; clients see only own invoices

**Testing:** Unit tests for invoice totals/tax math, numbering concurrency; E2E for create invoice → send → record partial payment → overdue → pay in full

**Acceptance criteria:**
- [ ] Invoice with flexible numbering generated; PDF rendered
- [ ] Partial payment recorded; balance/status update correctly
- [ ] Invoice marked overdue automatically by due date (background job)
- [ ] Tax excluded unless org explicitly opts in to tax registration
- [ ] Clients cannot view other clients' invoices

**Checkpoint:** GitHub PR "Phase 4: Finance" — reviewed and merged.

---

## 9. Phase 5 — Automation & Communication

**Objectives:** Reduce manual work with workflow rules; centralize client communication.

**Scope:** Workflow rule builder (trigger→conditions→actions); pg-boss job queue; in-app notifications; email integration architecture (adapter); WhatsApp integration architecture (adapter interface only); shared inbox; communication history; scheduling/calendars; reminders/follow-ups; AI gateway architecture (interface only).

**Dependencies:** Phase 4

**Database changes:** `workflow_rules`, `workflow_executions`, `notifications`, `email_messages`, `scheduled_tasks`, `communication_threads`, `messages`

**API requirements:** Workflow CRUD, execution log, notification CRUD + mark-read, email adapter endpoints, inbox thread/list, scheduled task management

**Frontend components:** Workflow rule builder, notification center, inbox, communication timeline per contact, calendar view, reminder form

**Security:** Outbound email/WhatsApp adapters validate destination against consent/opt-out; AI gateway sends only permitted data; no PII leaked without configuration

**Testing:** Unit tests for workflow condition evaluation; E2E for overdue invoice → reminder email queued → notification created

**Acceptance criteria:**
- [ ] Admin creates working trigger/action rule that executes
- [ ] Overdue invoices generate notifications automatically
- [ ] Inbox shows threads per contact with history
- [ ] AI gateway adapter interface exists (no hardcoded provider behavior)

**Checkpoint:** GitHub PR "Phase 5: Automation & Communication" — reviewed and merged.

---

## 10. Phase 6 — Administration & Platform

**Objectives:** Complete the OS: user management, permissions, settings, reporting, observability, export, developer workspace.

**Scope:** Advanced auth (MFA, session management UI), custom roles/permissions builder, customizable dashboards, workspace/branding, audit log viewer, backups/recovery verification, import/export, permission-aware search, feature flags, reporting/analytics, retention controls, health monitoring, secure developer workspace.

**Dependencies:** All prior phases

**Database changes:** Retention config tables; search/reporting indexes

**API requirements:** User/role management, custom role builder, export job trigger, search endpoint (permission-filtered), health/metrics endpoints

**Frontend components:** Users & roles UI, custom permission builder, settings pages, audit log viewer, export dialog, dashboard builder, reports, health dashboard

**Security:** Role changes audited; export admin-only; search filtered server-side; secrets never returned in API responses

**Testing:** Unit tests for permission resolution matrix; E2E for admin creates custom role → assigns user → user sees scoped UI; access-control E2E suite

**Acceptance criteria:**
- [ ] Admin creates custom role with granular permissions and assigns it
- [ ] Audit log viewer shows actor, action, resource, timestamp
- [ ] Full-org export produces usable JSON/CSV
- [ ] Search returns only permitted records per role
- [ ] Health endpoint reports DB, queue, storage status

**Checkpoint:** GitHub PR "Phase 6: Administration & Platform" — reviewed and merged.

---

## 11. Launch Review (Post-Phase 6)

Validation gate before declaring MVP complete:
- [ ] End-to-end critical path tested: lead → opportunity → proposal → contract → project → invoice → payment
- [ ] All phase acceptance criteria met and merged to `main`
- [ ] Load/smoke test on target hosting
- [ ] Backup restore test performed
- [ ] Security review of auth, authorization, file handling completed
- [ ] Documentation updated: user guide, admin guide, deployment runbook

---

## 12. Deferred Capabilities (Later — not canceled)

- Integrated payment gateway (Stripe/PayPal); manual bank transfer recording only in MVP
- E-signature provider integration; audit-trail signature recording in MVP
- WhatsApp integration; architecture-only in MVP
- Multi-currency; single currency in MVP
- Revenue forecasting; dashboards in MVP
- AI gateway/provider integration; architecture-only in MVP
- Multi-brand readiness; single brand in MVP
- Native mobile apps; responsive web covers mobile
- Dedicated search engine; PostgreSQL full-text in MVP
- Virus scanning on uploads; noted as future hardening
- Commercial multi-tenant billing; explicitly excluded from MVP

---

## 13. Risks by Phase

| Phase | Key risks | Mitigation |
|---|---|---|
| 0 | Environment setup delays; auth security errors | Strict acceptance criteria; security review before launch |
| 1–3 | Scope creep in Kanban/timeline UI | Fixed scope per phase; defer polish |
| 4 | Invoice numbering concurrency; tax misconfiguration | Atomic numbering; tax opt-in with explicit warning |
| 5 | Third-party provider delays; untested adapters | Adapter interface first; no fake success; integrate when credentials available |
| 6 | Permission matrix complexity | Automated matrix tests; scoped to critical resources |

---

## 14. Acceptance Criteria for This Deliverable

- [ ] All seven phases defined with objectives, scope, dependencies, DB changes, APIs, frontend, security, testing, acceptance criteria, checkpoints
- [ ] Measurable milestones and quality gates defined per phase
- [ ] Provisional 22-week estimate labeled as non-guaranteed
- [ ] Risks and deferred capabilities listed
- [ ] Launch review criteria defined
- [ ] Reviewed and approved before Phase 0 work begins
