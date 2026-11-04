# Deliverable 5 — Phased Development Roadmap

**Status:** Proposed — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Roadmap Philosophy

- Small, reviewable changes over enormous unverified implementations
- Each phase has defined objectives, scope, dependencies, database changes, API requirements, frontend components, security requirements, testing requirements, acceptance criteria, and a GitHub checkpoint
- Real functionality, not decorative mocks; temporary mocks are documented and replaced before a feature is declared complete
- No attempt to build all modules in one session; implementation starts only after architecture review and explicit approval
- Estimates are in working weeks for one full-time engineer; they are planning estimates, not commitments

---

## 2. Phase Summary

| Phase | Focus | Est. Duration | Gate to next |
|---|---|---|---|
| 0 | Foundation & Infrastructure | 3 weeks | Infra checkpoint passed |
| 1 | CRM & Sales (Contacts, Leads, Pipelines, Opportunities) | 3 weeks | Phase 1 acceptance criteria met |
| 2 | Proposals & Documents (Builder, Templates, PDF, Links) | 3 weeks | Phase 2 acceptance criteria met |
| 3 | Projects & Delivery (Workspaces, Tasks, Milestones, Time) | 4 weeks | Phase 3 acceptance criteria met |
| 4 | Finance (Invoices, Payments, Expenses, Tax, PDF invoices) | 3 weeks | Phase 4 acceptance criteria met |
| 5 | Automation & Communication (Workflows, Notifications, Email arch.) | 3 weeks | Phase 5 acceptance criteria met |
| 6 | Administration & Platform (RBAC, Audit, Settings, Reporting, BI) | 3 weeks | Phase 6 acceptance criteria met |
| **Total** | **MVP feature-complete** | **~22 weeks** | **Launch review** |

Effort is front-loaded toward revenue-critical workflows (CRM → proposals → projects → finance) so the agency can operate end-to-end as early as possible.

---

## 3. Phase 0 — Foundation & Infrastructure

**Objectives:** Establish the repo, tooling, database, auth core, and design system so later phases build on a verified base.

**Scope:**
- Repo structure, TypeScript config, ESLint, Prettier, Husky pre-commit hooks
- Next.js (App Router) + Tailwind + custom design system tokens (colors `#F8F9FA`, `#111827`, `#047857`, dark theme)
- Docker Compose dev environment: app + PostgreSQL
- Prisma schema with core tables (organizations, users, sessions, roles, permissions, audit_logs)
- Custom session-based auth (register, login, logout, password reset, httpOnly cookies)
- RBAC middleware + permission guards
- CI: GitHub Actions (lint, type-check, tests, build)
- `/docs` deliverables reviewed; decision log started

**Dependencies:** None (repository is empty)

**Database changes:** `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_sessions`, `audit_logs`

**API requirements:** `POST /api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/reset-password`, role/permission seed endpoints (admin only)

**Frontend components:** Login page, layout shell (sidebar, top nav), design token foundation, theme switch, loading/empty/error primitives

**Security:** bcrypt/argon2 password hashing, session cookie attributes (httpOnly/Secure/SameSite), CSRF double-submit, rate limit on auth endpoints, no secrets in Git (`.env.example` only)

**Testing:** Unit tests for auth service and permission guards; E2E smoke test for register → login → access protected page

**Acceptance criteria:**
- [ ] New developer can clone repo, run `docker compose up`, and access the app locally
- [ ] Register/login/logout works with secure cookies
- [ ] Unauthenticated users cannot access protected routes
- [ ] CI passes on push; type-check and lint clean
- [ ] Design tokens render correctly in light and dark modes

**Checkpoint:** GitHub PR titled "Phase 0: Foundation & Infrastructure" — reviewed and merged before Phase 1.

---

## 4. Phase 1 — CRM & Sales

**Objectives:** Enable the agency to track leads and opportunities through customizable pipelines — the first revenue workflow.

**Scope:**
- Contacts and accounts management
- Leads with source, status, owner
- Pipelines and pipeline stages (won/lost flags)
- Opportunities with value, close date, stage transitions
- Kanban view of opportunities by stage
- Lead → opportunity conversion
- Basic search across contacts/opportunities (permission-aware)

**Dependencies:** Phase 0 (auth, RBAC, DB, design system)

**Database changes:** `contacts`, `accounts`, `account_contacts`, `leads`, `pipelines`, `pipeline_stages`, `opportunities`

**API requirements:** CRUD for contacts, accounts, leads, pipelines, stages, opportunities; stage-transition validation (cannot skip required stages unless configured); search endpoint

**Frontend components:** Contact/account list + detail + edit; lead intake form; pipeline stage config; opportunity kanban board; opportunity detail with conversion action

**Security:** Organization-scoped queries; role-based access (Admin/Manager see all; Employee sees assigned); audit log on create/update/delete

**Testing:** Unit tests for pipeline transition rules; component tests for kanban; E2E for lead → opportunity → won

**Acceptance criteria:**
- [ ] Admin can configure pipelines and stages
- [ ] User can create a lead, convert to opportunity, move through stages, mark won/lost
- [ ] Users cannot see other organizations' data (N/A in single-tenant, but query scoping verified in tests)
- [ ] All mutations appear in audit log

**Checkpoint:** GitHub PR "Phase 1: CRM & Sales" — reviewed and merged.

---

## 5. Phase 2 — Proposals & Documents

**Objectives:** Turn won opportunities into proposals, quotes, and contracts with PDF generation and shareable links.

**Scope:**
- Proposal builder (line items, templates, client details)
- Quotation/estimate builder
- Document templates gallery
- PDF generation for proposals and quotes
- Shareable document links (public/protected, expiry, access log)
- Version control for proposals/contracts
- Contract records linked to proposals
- E-signature architecture (interface defined; provider integration deferred or configured later)

**Dependencies:** Phase 1 (opportunities, contacts)

**Database changes:** `proposals`, `proposal_versions`, `quotes`, `contracts`, `documents`, `document_versions`, `document_links`, `signatures`

**API requirements:** Proposal/quote CRUD, template CRUD, PDF generation endpoint, shareable link creation/verification, document download, signature request recording

**Frontend components:** Proposal builder (editor + live preview), quote builder, template gallery, document list, share-link management, PDF viewer

**Security:** Shareable links validated with tokens + expiry; document access scoped to client/org; PDFs generated server-side (no client-side secret exposure); e-signature provider config stored as encrypted secret (env)

**Testing:** Unit tests for PDF content, link expiry validation; E2E for create proposal → send link → client views → accept

**Acceptance criteria:**
- [ ] Proposal generated from template, PDF rendered correctly
- [ ] Shareable link works for unauthenticated client view within expiry window and rejects after expiry
- [ ] Proposal versions retained on edit
- [ ] E-signature adapter interface exists (no fake provider behavior)

**Checkpoint:** GitHub PR "Phase 2: Proposals & Documents" — reviewed and merged.

---

## 6. Phase 3 — Projects & Delivery

**Objectives:** Deliver work: project workspaces, tasks, milestones, time tracking, files, client approvals.

**Scope:**
- Project workspaces created from templates or manually
- Tasks with assignee, milestone, priority, due date, status
- Milestones and timeline view
- Project templates (default task/milestone skeletons)
- File and asset management (uploads to object storage, versions)
- Time tracking entries linked to tasks (billable flag)
- Client feedback and approvals on deliverables
- Revision management
- Change orders (scope, amount, approval)
- Workload view (who is assigned what)

**Dependencies:** Phase 1 (contacts), Phase 2 (contracts → project kickoff)

**Database changes:** `projects`, `project_templates`, `tasks`, `task_time_entries`, `milestones`, `project_files`, `change_orders`, `issues`

**API requirements:** Project CRUD, task CRUD, milestone CRUD, time entry CRUD, file upload (validated type/size, stored in object storage), file download via signed URL, change order CRUD, approval workflow

**Frontend components:** Project hub (overview, timeline, tasks, files, time), task board/list, time entry form, file upload with progress, client approval view, workload dashboard

**Security:** File type/size validation; files outside web root, served via signed URLs; task access limited to project members/assignees; client can only see own project files

**Testing:** Unit tests for time-entry aggregation and change-order amount math; E2E for create project → complete task → log time → client approves

**Acceptance criteria:**
- [ ] Project created from template populates default tasks/milestones
- [ ] Time entries aggregate to project totals and feed finance readiness
- [ ] Uploaded files downloadable only by authorized users via signed URLs
- [ ] Client approval flow records decision and timestamp

**Checkpoint:** GitHub PR "Phase 3: Projects & Delivery" — reviewed and merged.

---

## 7. Phase 4 — Finance

**Objectives:** Bill clients and track money — manually, without a payment gateway initially.

**Scope:**
- Invoicing with flexible numbering (series, prefix, next number config)
- Line items, tax handling (configurable; NOT auto-enabled — agency must opt into sales tax registration)
- Estimates convertible to invoices
- Partial payments and deposits
- Payment recording (manual bank transfer reference + date + recorded_by); no gateway integration
- Invoice status: draft/sent/paid/overdue/void
- Public preview links for invoices; PDF invoices
- Expense management linked to projects (billable flag)
- Financial dashboards: revenue, outstanding, overdue, profitability by project
- Multi-currency readiness (currency on invoice, default currency config)

**Dependencies:** Phase 3 (projects, time entries for billable hours)

**Database changes:** `invoices`, `invoice_items`, `payments`, `estimates`, `expense_items`, `tax_settings`, `currency_config`

**API requirements:** Invoice CRUD, numbering service (atomic next-number), payment recording, estimate→invoice conversion, expense CRUD, PDF invoice generation, financial report aggregates

**Frontend components:** Invoice list + detail + editor, payment record form, estimate list, expense tracker, financial dashboard charts, tax settings page (opt-in toggle, explicit wording)

**Security:** Invoice numbering atomicity (no duplicates); payment recording requires permission; financial data restricted to internal roles (clients see only their own invoices); tax not calculated unless `tax_settings.registered = true`

**Testing:** Unit tests for invoice totals/tax math, numbering concurrency; E2E for create invoice → send → record partial payment → mark overdue → pay in full

**Acceptance criteria:**
- [ ] Invoice with flexible numbering generated and PDF rendered
- [ ] Partial payment recorded correctly; balance and status update
- [ ] Invoice marked overdue automatically by due date (via background job)
- [ ] Tax is zero/excluded unless org explicitly opts in to tax registration
- [ ] Clients cannot view other clients' invoices

**Checkpoint:** GitHub PR "Phase 4: Finance" — reviewed and merged.

---

## 8. Phase 5 — Automation & Communication

**Objectives:** Reduce manual work with workflow rules and centralize client communication.

**Scope:**
- Workflow rule builder (trigger → conditions → actions), e.g., "invoice overdue 7 days → send reminder email + notify owner"
- pg-boss job queue for scheduled and triggered actions
- In-app notifications with preferences and history
- Email integration architecture (adapter interface; SMTP provider configured)
- WhatsApp integration architecture (adapter interface; no provider behavior implemented yet)
- Shared communication inbox; per-contact communication history
- Scheduling and calendars; reminders and follow-ups
- AI-assisted writing via provider-independent AI gateway (architecture only)

**Dependencies:** Phase 4 (invoices for overdue trigger example), Phase 2 (templates for email content)

**Database changes:** `workflow_rules`, `workflow_executions`, `notifications`, `email_messages`, `scheduled_tasks`, `communication_threads`, `messages`

**API requirements:** Workflow CRUD, execution log, notification CRUD + mark-read, email send/receive adapter endpoints, inbox thread/list view, scheduled task management

**Frontend components:** Workflow rule builder, notification center, inbox, communication timeline per contact, calendar view, reminder form

**Security:** Outbound email/WhatsApp adapters validate destination against opt-out/consent flags; AI gateway sends only permitted data; no PII leaked to third-party adapters without configuration

**Testing:** Unit tests for workflow condition evaluation; E2E for overdue invoice → reminder email queued → notification created

**Acceptance criteria:**
- [ ] Admin can create a working trigger/action rule that executes
- [ ] Overdue invoices generate notifications automatically
- [ ] Inbox shows threads per contact with history
- [ ] AI gateway adapter interface exists with no hardcoded provider behavior

**Checkpoint:** GitHub PR "Phase 5: Automation & Communication" — reviewed and merged.

---

## 9. Phase 6 — Administration & Platform

**Objectives:** Complete the operating system: user management, permissions, settings, reporting, observability.

**Scope:**
- Advanced auth: password policy, MFA preparation, session management UI
- Custom roles and permissions builder; flexible client access configuration
- Customizable dashboards (widget configuration per role)
- Workspace and branding configuration (logo, colors, domain); multi-brand readiness
- Security and audit log viewer
- Backups and recovery documentation verification
- Import/export (CSV/JSON) and data portability
- Permission-aware search across permitted records
- Feature management (feature flags per org)
- Reporting and analytics (revenue forecasting, profitability)
- Data lifecycle and retention controls
- Usage and system health monitoring endpoints

**Dependencies:** All prior phases

**Database changes:** `feature_flags`, retention config tables; indexes for search/reporting

**API requirements:** User/role management, custom role builder, export job trigger, search endpoint with permission filtering, health/metrics endpoints

**Frontend components:** Users & roles UI, custom permission builder, settings pages, audit log viewer, export dialog, dashboard builder, reports, health dashboard

**Security:** Role changes audited; export job accessible to admins only; search results filtered by permissions server-side; secrets never returned in API responses

**Testing:** Unit tests for permission resolution matrix; E2E for admin creates custom role → assigns user → user sees scoped UI; access-control E2E suite

**Acceptance criteria:**
- [ ] Admin can create a custom role with granular permissions and assign it
- [ ] Audit log viewer shows actor, action, resource, timestamp
- [ ] Full-org export produces usable JSON/CSV
- [ ] Search returns only permitted records for each role
- [ ] Health endpoint reports DB, queue, storage status

**Checkpoint:** GitHub PR "Phase 6: Administration & Platform" — reviewed and merged.

---

## 10. Launch Review (Post-Phase 6)

Validation gate before declaring MVP complete:
- [ ] End-to-end critical path tested: lead → opportunity → proposal → contract → project → invoice → payment
- [ ] All phase acceptance criteria met and merged to main
- [ ] Load/smoke test on target hosting
- [ ] Backup restore test performed
- [ ] Security review of auth, authorization, and file handling completed
- [ ] Documentation updated: user guide, admin guide, deployment runbook

---

## 11. Deferred Capabilities (explicitly not in MVP)

- Integrated payment gateway (Stripe/PayPal processing); manual bank transfer recording only
- Commercial multi-tenant billing (subscriptions, plans, metered usage)
- Native mobile applications
- AI model hosting or fine-tuning (AI gateway architecture only)
- Dedicated search engine (Elasticsearch/Algolia); PostgreSQL full-text used initially
- Virus scanning on uploads (noted as future hardening)
- Recurring/subscription invoicing

---

## 12. Risks by Phase (summary; full detail in Deliverable 6)

- Phase 0: environment setup delays; auth security implementation errors
- Phase 1–3: scope creep in Kanban/timeline UI complexity
- Phase 4: invoice numbering concurrency, tax misconfiguration risk
- Phase 5: third-party provider delays (email/WhatsApp); adapters remain untested without provider accounts
- Phase 6: permission matrix complexity grows combinatorially

**Mitigation:** strict acceptance criteria per phase, small PRs, E2E tests for critical paths, defer provider integrations until architecture validated.

---

## 13. Acceptance Criteria for This Deliverable

- [ ] All seven phases defined with objectives, scope, dependencies, DB changes, APIs, frontend, security, testing, acceptance criteria, checkpoints
- [ ] Critical milestones and validation gates identified
- [ ] Risks and deferred capabilities listed
- [ ] Effort estimates labeled as planning estimates
- [ ] Reviewed and approved before Phase 0 work begins
