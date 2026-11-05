# Deliverable 7 — Requirements Traceability Matrix (RTM)

**Status:** New — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Purpose

Every feature in the AgencyOS master specification is mapped here to:
- **Module** — owning product module (A–F)
- **Phase** — implementation phase (0–6 or Later/Optional)
- **Dependencies** — preceding phases/features it relies on
- **Acceptance criteria reference** — where the testable criteria live
- **Status** — Initial / Later / Optional

**Nothing in the master specification is silently excluded or downgraded.** "Deferred" means scheduled for a later phase, not canceled. "Optional" means genuinely optional and requires separate approval.

Status legend:
- **Initial** — built in Phases 0–6 (MVP scope)
- **Later** — deferred to post-MVP; explicit, not canceled
- **Optional** — may never be built; requires separate approval

**Delivery mode** (distinct from status):
- **Working functionality** — fully implemented, tested, and usable in the phase it appears.
- **Interface-only** — an adapter/interface exists (e.g., email, WhatsApp, AI gateway, e-signature) but no real provider behavior is implemented in MVP; provider integration is wired only when credentials are approved. Never fakes delivery success.
- **Later** — deferred to post-MVP.

Some rows are "Initial" in status but "interface-only" in delivery mode; these are noted in the acceptance criteria column.

---

## 2. Module A — Business & CRM

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| A1 | Accounts and contacts | CRM & Sales | 1 | Phase 0 (auth, RBAC, org) | Create/read/update/delete contact & account; org-scoped; audit logged | Initial |
| A2 | Advanced CRM | CRM & Sales | 1 | Phase 0 | Pipeline/opportunity tracking, relationship history | Initial |
| A3 | Leads and opportunities | CRM & Sales | 1 | Phase 0 | Lead intake, conversion to opportunity, value + close date | Initial |
| A4 | Customizable sales pipelines | CRM & Sales | 1 | Phase 0 | Admin configures pipelines/stages; won/lost flags; stage transition validation | Initial |
| A5 | Client onboarding and offboarding | CRM & Sales | 3 | Phase 1 (contacts), Phase 3 (projects) | Onboarding checklist triggers project creation; offboarding checklist revokes access | Initial |
| A6 | Client relationship history | CRM & Sales | 1 | Phase 0 (audit log) | Communication + activity history per contact | Initial |
| A7 | Client portals | F. Admin & Platform | 5 | Phase 1 (contacts), Phase 2 (documents), Phase 4 (invoices) | Client authenticates; sees only own projects/invoices/documents; approves proofs | Initial |
| A8 | Service catalog | CRM & Sales | Later | Phase 1 | Billable services with rates; linkable to invoices/projects | Later |
| A9 | Marketing and sales operations | CRM & Sales | Later | Phase 1 | Lead sources, campaign tracking | Later |

---

## 3. Module B — Proposals, Documents & Agreements

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| B1 | Proposal builder | Proposals & Docs | 2 | Phase 1 (opportunities, contacts) | Build proposal from template; line items; client details; live preview | Initial |
| B2 | Quotation and estimate builder | Proposals & Docs | 2 | Phase 1 | Build quote; valid_until; convert to invoice (Phase 4) | Initial |
| B3 | Contract management | Proposals & Docs | 2 | Phase 2 (proposals) | Contract record linked to proposal; status tracking | Initial |
| B4 | Electronic signatures | Proposals & Docs | Later | Phase 2 (contracts) | **Interface-only** — provider-independent signature adapter interface; audit-trail signature recording in MVP | Later |
| B5 | Custom forms and creative briefs | Proposals & Docs | Later | Phase 2 | Form builder; submissions linked to projects/contacts | Later |
| B6 | Document templates | Proposals & Docs | 2 | Phase 0 (design system) | Template gallery; create/edit templates; use in proposals | Initial |
| B7 | Conditional approvals | Proposals & Docs | 3 | Phase 2 | Approval workflow on documents; approver roles; state transitions | Initial |
| B8 | Version control | Proposals & Docs | 2 | Phase 2 | Versioned snapshots on edit; version history viewable | Initial |
| B9 | Shareable document links | Proposals & Docs | 2 | Phase 2 | Token-based, time-bound links; access log; expiry enforcement | Initial |
| B10 | PDF generation | Proposals & Docs | 2 | Phase 2 | Server-side PDF render of proposals/quotes/invoices | Initial |
| B11 | Multilingual document support | Proposals & Docs | Later | Phase 2 | Locale per document; template translation | Later |

---

## 4. Module C — Projects & Delivery

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| C1 | Project workspaces | Projects & Delivery | 3 | Phase 1 (contacts), Phase 2 (contracts) | Create project from template or manually; client linked | Initial |
| C2 | Task management | Projects & Delivery | 3 | Phase 3 (projects) | Tasks: assignee, milestone, priority, due date, status | Initial |
| C3 | Milestones and timelines | Projects & Delivery | 3 | Phase 3 (projects) | Milestones with due dates; timeline view | Initial |
| C4 | Project templates | Projects & Delivery | 3 | Phase 3 | Reusable project skeletons with default tasks/milestones | Initial |
| C5 | File and asset management | Projects & Delivery | 3 | Phase 0 (storage) | Upload (validated type/size); versions; signed-URL download | Initial |
| C6 | Client feedback and approvals | Projects & Delivery | 3 | Phase 3 (projects, files) | Client reviews proofs; approve/request changes; timestamped | Initial |
| C7 | Revision management | Projects & Delivery | 3 | Phase 3 (files) | File versions; revision history; compare | Initial |
| C8 | Change orders | Projects & Delivery | 3 | Phase 3 (projects), Phase 4 (finance) | Change order: description, amount, status, approved_by; links to invoice | Initial |
| C9 | QA and issue tracking | Projects & Delivery | Later | Phase 3 | Issues/bugs linked to project/task; status workflow | Later |
| C10 | Time tracking | Projects & Delivery | 3 | Phase 3 (tasks) | Time entries: user, task, date, hours, billable flag; aggregates to project | Initial |
| C11 | Workload management | Projects & Delivery | 3 | Phase 3 (tasks) | Workload view: who is assigned what; capacity | Initial |
| C12 | Team collaboration | Projects & Delivery | 3 | Phase 3 | Task comments, mentions, assignment notifications | Initial |
| C13 | Knowledge management | Projects & Delivery | Later | Phase 3 | Internal wiki/knowledge base linked to projects | Later |

---

## 5. Module D — Finance

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| D1 | Invoicing | Finance | 4 | Phase 3 (projects, time) | Create invoice; line items; status draft/sent/paid/overdue/void | Initial |
| D2 | Flexible invoice numbering | Finance | 4 | Phase 4 (invoices) | Configurable series/prefix/next number; atomic next-number; no duplicates | Initial |
| D3 | Estimates and quotations | Finance | 4 | Phase 2 (quotes) | Estimate convertible to invoice | Initial |
| D4 | Partial payments and deposits | Finance | 4 | Phase 4 (invoices) | Record partial payment; balance and status update correctly | Initial |
| D5 | Expense management | Finance | 4 | Phase 3 (projects) | Expense: project, category, amount, date, receipt, billable flag | Initial |
| D6 | Payment tracking | Finance | 4 | Phase 4 (invoices) | Manual bank transfer recording; date, reference, recorded_by | Initial |
| D7 | Financial dashboards | Finance | 6 | Phase 4 | Revenue, outstanding, overdue, profitability by project | Initial |
| D8 | Revenue forecasting | Finance | Later | Phase 4 | Forecasting based on pipeline + invoices | Later |
| D9 | Profitability reporting | Finance | 6 | Phase 4 (expenses, time) | Project profitability: revenue vs costs/time | Initial |
| D10 | Multi-currency readiness | Finance | Later | Phase 4 | Currency per invoice; default currency config; exchange rates | Later |
| D11 | Configurable tax handling | Finance | 4 | Phase 0 | Tax NOT auto-enabled; explicit opt-in toggle with warning; tax rate config | Initial |
| D12 | PDF invoices and public preview links | Finance | 4 | Phase 4 (invoices), Phase 2 (PDF) | Server-side PDF invoice; time-bound public preview link | Initial |

---

## 6. Module E — Automation & Communication

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| E1 | Workflow automation | Automation & Comms | 5 | Phase 0 (pg-boss), Phase 4 (invoices example) | Trigger → conditions → actions rule builder; executes | Initial |
| E2 | Trigger/action rules | Automation & Comms | 5 | Phase 5 (workflow automation) | Example: invoice overdue 7 days → reminder + notify owner | Initial |
| E3 | Notifications | Automation & Comms | 5 | Phase 0 (auth/users) | In-app notifications; preferences; history; mark-read | Initial |
| E4 | Email integration architecture | Automation & Comms | 5 | Phase 5 (notifications) | Provider-independent email adapter; SMTP configured; **interface-only — no provider behavior or fake delivery success in MVP** | Initial |
| E5 | WhatsApp integration architecture | Automation & Comms | Later | Phase 5 | **Interface-only** — provider-independent WhatsApp adapter interface; no provider behavior in MVP | Later |
| E6 | Shared communication inbox | Automation & Comms | 5 | Phase 1 (contacts) | Inbox; threads per contact; shared team view | Initial |
| E7 | Communication history | Automation & Comms | 5 | Phase 6 (audit) | Per-contact communication log; email/message history | Initial |
| E8 | Contact information masking | Automation & Comms | 5 | Phase 1 (contacts) | Masking enforced at API serialization layer based on org/contact config | Initial |
| E9 | Scheduling and calendars | Automation & Comms | Later | Phase 5 | Calendar view; scheduling | Later |
| E10 | Reminders and follow-ups | Automation & Comms | 5 | Phase 5 (notifications) | Task/invoice reminders; follow-up scheduling | Initial |
| E11 | AI-assisted writing | Automation & Comms | Later | Phase 5 | AI writing assistance within documents | Later |
| E12 | Provider-independent AI gateway | Automation & Comms | Later | Phase 5 | **Interface-only** — gateway interface; provider swap without rewrite; no hardcoded provider behavior | Later |

---

## 7. Module F — Administration & Platform

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| F1 | Advanced authentication | Admin & Platform | 0 | Phase 0 | Maintained auth library (ADR-0001); sessions, MFA, password recovery | Initial |
| F2 | Role-based and custom permissions | Admin & Platform | 0 | Phase 0 | RBAC + resource-scoped; custom role builder | Initial |
| F3 | Flexible client access | Admin & Platform | 5 | Phase 1 (contacts), Phase 5 (communication/inbox) | Client access configuration; portal scoping | Initial |
| F4 | Customizable dashboards | Admin & Platform | 6 | Phase 0 (design system) | Widget configuration per role | Initial |
| F5 | Settings and preferences | Admin & Platform | 6 | Phase 0 | Org-level settings; user preferences | Initial |
| F6 | Workspace and branding configuration | Admin & Platform | 6 | Phase 0 (design tokens) | Logo, colors, domain; multi-brand readiness | Initial |
| F7 | Multi-brand readiness | Admin & Platform | Later | Phase 6 | Multiple brands per org | Later |
| F8 | Security and audit logs | Admin & Platform | 0 | Phase 0 | Append-only audit logs; actor, action, resource, timestamp, IP; PII redacted | Initial |
| F9 | Backups and recovery | Admin & Platform | 0 | ADR-0003 | Daily pg_dump to R2; documented restore; restore test | Initial |
| F10 | Import/export and data portability | Admin & Platform | 6 | Phase 0 | JSON/CSV export per org; background job | Initial |
| F11 | Search across permitted records | Admin & Platform | 6 | Phase 0–6 data | PostgreSQL full-text search; permission-filtered results | Initial |
| F12 | Feature management | Admin & Platform | 6 | Phase 0 | Feature flags per org; gate features | Initial |
| F13 | Secure developer access | Admin & Platform | 6 | Phase 0 (auth) | Admin-gated developer workspace; audited; no RBAC bypass | Initial |
| F14 | Usage and system health monitoring | Admin & Platform | 6 | Phase 0 | Health endpoint; DB/queue/storage status | Initial |
| F15 | Extensible custom fields | Admin & Platform | 6 | Phase 0 | custom_fields + custom_field_values JSONB | Initial |
| F16 | Reporting and analytics | Admin & Platform | 6 | Phase 4 (finance) | Revenue/profitability reports | Initial |
| F17 | Data lifecycle and retention controls | Admin & Platform | 6 | Phase 0 (audit) | Retention config; background job enforces retention | Initial |

---

## 8. Cross-Cutting / Non-Functional Requirements

| # | Feature | Module | Phase | Dependencies | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| NF1 | Light and dark themes | UI/UX | 0 | ADR-0006 | Theme switch; CSS variables | Initial |
| NF2 | Responsive desktop/tablet/mobile | UI/UX | 0–6 | ADR-0006 | Breakpoints; touch targets ≥44px | Initial |
| NF3 | Accessibility (WCAG) | UI/UX | 0–6 | ADR-0006 | Keyboard nav, focus states, ARIA, reduced motion | Initial |
| NF4 | Loading/empty/error/success states | UI/UX | 0–6 | ADR-0006 | Every screen has all four states | Initial |
| NF5 | Input validation | All | 0–6 | Zod | Zod schemas on every API input | Initial |
| NF6 | Rate limiting | All | 0 | Phase 0 | Per-IP + per-user on auth/write endpoints | Initial |
| NF7 | Secure upload handling | C5 / D5 | 3/4 | ADR-0003 | Type/size validation; outside web root; signed URLs | Initial |
| NF8 | Secrets management | All | 0 | ADR-0001 | Env vars only; .env.example without values | Initial |
| NF9 | Audit trails | F8 | 0 | ADR-0005 | Append-only audit logs | Initial |
| NF10 | Data isolation | All | 0–6 | ADR-0004 | Org-scoped queries; no cross-org leakage | Initial |

---

## 9. Status Summary & Audit Note

The matrix above represents every requirement drawn from the AgencyOS master specification sections A–F (Business & CRM, Proposals/Documents/Agreements, Projects/Delivery, Finance, Automation/Communication, Administration/Platform) plus the cross-cutting non-functional requirements. Each requirement is assigned a status:

- **Initial** — built in Phases 0–6 (MVP scope)
- **Later** — deferred to post-MVP; explicit, not canceled
- **Optional** — may never be built; requires separate approval

**I have not run an automated line-by-line diff against the original PRD, so I do not claim machine-verified exhaustive coverage.** Every row above was checked manually against the source specification during this revision. If any source requirement is missing from this matrix, it should be raised as a blocking item before Phase 0 begins. Counts per status are approximate and are not a substitute for reviewing the table itself.

The RTM is the source of truth for scope; the phased roadmap (`docs/05_PHASED_ROADMAP.md`) sequences the Initial items.

---

## 10. Acceptance Criteria for This Deliverable

- [ ] Every feature from the master specification appears in the matrix
- [ ] Each row has module, phase, dependencies, acceptance criteria reference, and status
- [ ] No feature is silently excluded; Later/Optional distinctions are explicit
- [ ] Matrix cross-referenced to ADRs and roadmap
- [ ] Reviewed and approved before Phase 0 implementation
