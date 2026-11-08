# AgencyOS Gap Analysis & Implementation Order

Generated from: docs/07_REQUIREMENTS_TRACEABILITY_MATRIX.md, docs/05_PHASED_ROADMAP.md, docs/01_PRODUCT_BLUEPRINT.md
Current branch: arena/cb71dc2e-agencyos-arena (PR #31, latest commit 241fa57)

## Summary

| Module                                | Phase | Status                 | Implemented                       | Missing                             | Later/Optional   |
| ------------------------------------- | ----- | ---------------------- | --------------------------------- | ----------------------------------- | ---------------- |
| A — Business & CRM                    | 1     | Substantially complete | A1-A6                             | A5 (onboarding/offboarding)         | A7-A9            |
| B — Proposals, Documents & Agreements | 2     | Partial                | B1, B2, B10                       | B3, B6, B7, B8, B9                  | B4, B5, B11      |
| C — Projects & Delivery               | 3     | Partial                | C1-C3, C8 (model only)            | C4, C5, C6, C7, C10, C11, C12       | C9, C13          |
| D — Finance                           | 4     | Partial                | D1, D2, D4, D6                    | D3 (convert), D5, D7, D9, D11, D12  | D8, D10          |
| E — Automation & Communication        | 5     | Minimal                | E3 (model only)                   | E1, E2, E3, E4, E6, E7, E10         | E5, E9, E11, E12 |
| F — Administration & Platform         | 6     | Partial                | F1, F2, F5, F6, F8, F12, F14, F15 | F3, F4, F9, F10, F11, F13, F16, F17 | F7               |
| Cross-cutting                         | 0-6   | Partial                | NF1, NF5, NF8, NF9, NF10          | NF2, NF3, NF4, NF6, NF7             | —                |

---

## Detailed Gap Analysis

### Module A — Business & CRM (Phase 1)

| ID  | Feature                           | Status         | Gap Detail                                                                 |
| --- | --------------------------------- | -------------- | -------------------------------------------------------------------------- |
| A1  | Accounts and contacts             | ✅ Implemented | Full CRUD, org-scoped, audit logged                                        |
| A2  | Advanced CRM                      | ✅ Implemented | Pipeline/opportunity tracking                                              |
| A3  | Leads and opportunities           | ✅ Implemented | Lead intake, conversion                                                    |
| A4  | Customizable sales pipelines      | ✅ Implemented | Admin configures pipelines/stages                                          |
| A5  | Client onboarding and offboarding | ❌ Missing     | Onboarding checklist triggers project creation; offboarding revokes access |
| A6  | Client relationship history       | ⚠️ Partial     | Audit log exists; no dedicated communication history UI                    |
| A7  | Client portals                    | ❌ Missing     | Deferred to Phase 5                                                        |
| A8  | Service catalog                   | Later          | Deferred                                                                   |
| A9  | Marketing/sales ops               | Later          | Deferred                                                                   |

### Module B — Proposals, Documents & Agreements (Phase 2)

| ID  | Feature                  | Status         | Gap Detail                                                |
| --- | ------------------------ | -------------- | --------------------------------------------------------- |
| B1  | Proposal builder         | ✅ Implemented | Builder, line items, client details, live preview         |
| B2  | Quotation builder        | ✅ Implemented | Builder, valid_until                                      |
| B3  | Contract management      | ❌ Missing     | Contract record linked to proposal; status tracking       |
| B4  | E-signatures             | Later          | Interface-only adapter                                    |
| B5  | Custom forms             | Later          | Deferred                                                  |
| B6  | Document templates       | ❌ Missing     | Template gallery; create/edit templates; use in proposals |
| B7  | Conditional approvals    | ❌ Missing     | Approval workflow on documents; approver roles            |
| B8  | Version control          | ❌ Missing     | Versioned snapshots on edit; version history              |
| B9  | Shareable document links | ❌ Missing     | Token-based, time-bound links; access log; expiry         |
| B10 | PDF generation           | ✅ Implemented | Invoice PDF; needs proposal/quote PDF                     |
| B11 | Multilingual             | Later          | Deferred                                                  |

### Module C — Projects & Delivery (Phase 3)

| ID  | Feature                   | Status         | Gap Detail                                                  |
| --- | ------------------------- | -------------- | ----------------------------------------------------------- |
| C1  | Project workspaces        | ✅ Implemented | Create project; client linked                               |
| C2  | Task management           | ✅ Implemented | Tasks: assignee, milestone, priority, due date, status      |
| C3  | Milestones/timelines      | ✅ Implemented | Milestones with due dates                                   |
| C4  | Project templates         | ❌ Missing     | Reusable project skeletons with default tasks/milestones    |
| C5  | File/asset management     | ❌ Missing     | Upload (validated type/size); versions; signed-URL download |
| C6  | Client feedback/approvals | ❌ Missing     | Client reviews proofs; approve/request changes; timestamped |
| C7  | Revision management       | ❌ Missing     | File versions; revision history; compare                    |
| C8  | Change orders             | ⚠️ Model only  | Model exists; no API, UI, or workflow                       |
| C9  | QA/issue tracking         | Later          | Deferred                                                    |
| C10 | Time tracking             | ❌ Missing     | Time entries: user, task, date, hours, billable flag        |
| C11 | Workload management       | ❌ Missing     | Workload view: who is assigned what; capacity               |
| C12 | Team collaboration        | ❌ Missing     | Task comments, mentions, assignment notifications           |
| C13 | Knowledge management      | Later          | Deferred                                                    |

### Module D — Finance (Phase 4)

| ID  | Feature                       | Status         | Gap Detail                                                  |
| --- | ----------------------------- | -------------- | ----------------------------------------------------------- |
| D1  | Invoicing                     | ✅ Implemented | CRUD, line items, status draft/sent/paid/void               |
| D2  | Flexible invoice numbering    | ✅ Implemented | Prefix/next number; atomic                                  |
| D3  | Estimates/quotations          | ⚠️ Partial     | Quotations exist; convert-to-invoice missing                |
| D4  | Partial payments/deposits     | ✅ Implemented | Payment recording; balance/status update                    |
| D5  | Expense management            | ❌ Missing     | Expense: project, category, amount, date, receipt, billable |
| D6  | Payment tracking              | ✅ Implemented | Manual bank transfer recording                              |
| D7  | Financial dashboards          | ❌ Missing     | Revenue, outstanding, overdue, profitability by project     |
| D8  | Revenue forecasting           | Later          | Deferred                                                    |
| D9  | Profitability reporting       | ❌ Missing     | Project profitability: revenue vs costs/time                |
| D10 | Multi-currency                | Later          | Deferred                                                    |
| D11 | Configurable tax              | ❌ Missing     | Tax NOT auto-enabled; explicit opt-in toggle with warning   |
| D12 | PDF invoices + public preview | ⚠️ Partial     | PDF exists; public preview links missing                    |

### Module E — Automation & Communication (Phase 5)

| ID  | Feature                    | Status        | Gap Detail                                                  |
| --- | -------------------------- | ------------- | ----------------------------------------------------------- |
| E1  | Workflow automation        | ❌ Missing    | Trigger → conditions → actions rule builder; executes       |
| E2  | Trigger/action rules       | ❌ Missing    | Example: invoice overdue → reminder + notify owner          |
| E3  | Notifications              | ⚠️ Model only | Notification model exists; no API, UI, preferences, history |
| E4  | Email integration          | ❌ Missing    | Provider-independent email adapter; interface-only          |
| E5  | WhatsApp                   | Later         | Interface-only                                              |
| E6  | Shared communication inbox | ❌ Missing    | Inbox; threads per contact; shared team view                |
| E7  | Communication history      | ❌ Missing    | Per-contact communication log                               |
| E8  | Contact masking            | ⚠️ Partial    | Model fields exist; serialization masking not enforced      |
| E9  | Scheduling                 | Later         | Deferred                                                    |
| E10 | Reminders/follow-ups       | ❌ Missing    | Task/invoice reminders; follow-up scheduling                |
| E11 | AI writing                 | Later         | Deferred                                                    |
| E12 | AI gateway                 | Later         | Interface-only                                              |

### Module F — Administration & Platform (Phase 6)

| ID  | Feature                       | Status         | Gap Detail                                                 |
| --- | ----------------------------- | -------------- | ---------------------------------------------------------- |
| F1  | Advanced authentication       | ⚠️ Partial     | BetterAuth chosen (ADR-0001); MFA/recovery not implemented |
| F2  | Role-based/custom permissions | ✅ Implemented | RBAC + resource-scoped; custom role builder missing        |
| F3  | Flexible client access        | ❌ Missing     | Client access configuration; portal scoping                |
| F4  | Customizable dashboards       | ❌ Missing     | Widget configuration per role                              |
| F5  | Settings/preferences          | ✅ Implemented | Org settings + user preferences                            |
| F6  | Workspace/branding            | ⚠️ Partial     | Settings page exists; logo/colors/domain config missing    |
| F7  | Multi-brand                   | Later          | Deferred                                                   |
| F8  | Security/audit logs           | ⚠️ Partial     | AuditLog model exists; viewer UI missing                   |
| F9  | Backups/recovery              | ❌ Missing     | pg_dump to R2; documented restore                          |
| F10 | Import/export                 | ❌ Missing     | JSON/CSV export per org                                    |
| F11 | Search                        | ❌ Missing     | PostgreSQL full-text; permission-filtered                  |
| F12 | Feature management            | ⚠️ Partial     | FeatureFlag model exists; no UI or gating                  |
| F13 | Secure developer access       | ❌ Missing     | Admin-gated developer workspace                            |
| F14 | Health monitoring             | ⚠️ Partial     | Health endpoint exists                                     |
| F15 | Custom fields                 | ⚠️ Partial     | CustomField model exists; no UI or usage                   |
| F16 | Reporting/analytics           | ❌ Missing     | Revenue/profitability reports                              |
| F17 | Data lifecycle/retention      | ❌ Missing     | Retention config; background enforcement                   |

### Cross-Cutting Non-Functional

| ID   | Feature                     | Status         | Gap Detail                           |
| ---- | --------------------------- | -------------- | ------------------------------------ |
| NF1  | Light/dark themes           | ⚠️ Partial     | Theme provider exists                |
| NF2  | Responsive                  | ⚠️ Partial     | Basic responsive classes             |
| NF3  | Accessibility               | ⚠️ Partial     | Basic ARIA                           |
| NF4  | Loading/empty/error/success | ⚠️ Partial     | Some states exist; not comprehensive |
| NF5  | Input validation            | ✅ Implemented | Zod on all API inputs                |
| NF6  | Rate limiting               | ❌ Missing     | Per-IP + per-user on auth/write      |
| NF7  | Secure upload handling      | ❌ Missing     | Type/size validation; signed URLs    |
| NF8  | Secrets management          | ✅ Implemented | .env.example without values          |
| NF9  | Audit trails                | ⚠️ Partial     | AuditLog model; no viewer            |
| NF10 | Data isolation              | ✅ Implemented | Org-scoped queries                   |

---

## Implementation Order (Milestones)

### Milestone 1 — Phase 2 Completion: Documents & Agreements

**Dependencies:** Phase 1 (complete)
**Items:** B3 (Contract management), B6 (Document templates), B7 (Conditional approvals), B8 (Version control), B9 (Shareable document links), B10 (PDF for proposals/quotes)

### Milestone 2 — Phase 3 Completion: Projects & Delivery

**Dependencies:** Phase 1, Phase 2
**Items:** C4 (Project templates), C5 (File/asset management), C6 (Client feedback/approvals), C7 (Revision management), C8 (Change orders API+UI), C10 (Time tracking), C11 (Workload management), C12 (Team collaboration)

### Milestone 3 — Phase 4 Completion: Finance

**Dependencies:** Phase 3
**Items:** D3 (Estimate→invoice conversion), D5 (Expense management), D7 (Financial dashboards), D9 (Profitability reporting), D11 (Configurable tax handling), D12 (Public preview links)

### Milestone 4 — Phase 5 Completion: Automation & Communication

**Dependencies:** Phase 4
**Items:** E1 (Workflow automation), E2 (Trigger/action rules), E3 (Notifications API+UI), E4 (Email integration architecture), E6 (Shared communication inbox), E7 (Communication history), E10 (Reminders/follow-ups)

### Milestone 5 — Phase 6 Completion: Administration & Platform

**Dependencies:** All prior phases
**Items:** F3 (Client access/portal), F4 (Customizable dashboards), F9 (Backups/recovery), F10 (Import/export), F11 (Search), F13 (Secure developer access), F16 (Reporting), F17 (Data lifecycle/retention)

### Milestone 6 — Cross-Cutting Polish

**Items:** NF2 (Responsive), NF3 (Accessibility), NF4 (States), NF6 (Rate limiting), NF7 (Secure uploads)

---

## Database Changes Required by Milestone

### Milestone 1 (Phase 2 documents):

- `proposal_versions` — versioned snapshots
- `contracts` — contract records linked to proposals/projects
- `documents` — generic document registry
- `document_versions` — file_asset references per version
- `document_links` — shareable links with expiry
- `signatures` — signature recording (interface-only)

### Milestone 2 (Phase 3 projects):

- `project_templates` — reusable project skeletons
- `task_time_entries` — time tracking entries
- `project_files` — file assets linked to project/task
- `change_orders` — change order records (model exists, needs migration)
- `issues` — QA/bug tracking (Later, skip for now)
- `project_approvals` — client feedback/approval records

### Milestone 3 (Phase 4 finance):

- `expense_items` — expense records
- `tax_settings` — org-level tax configuration
- `currency_config` — currency configuration
- `estimates` — convertible estimate documents

### Milestone 4 (Phase 5 automation):

- `workflow_rules` — trigger/conditions/actions
- `workflow_executions` — execution log
- `notifications` — in-app notifications (model exists)
- `email_messages` — email integration
- `scheduled_tasks` — scheduled tasks
- `communication_threads` — communication threads
- `messages` — messages

### Milestone 5 (Phase 6 admin):

- Retention config tables
- Search indexes
- Custom role definitions (extend roles table)

---

## Verification Approach

- Unit tests (Vitest) for service logic
- Integration tests for API routes (require DATABASE_URL — skip in sandbox)
- TypeScript strict check
- ESLint
- Prisma schema validation (blocked by sandbox TLS for `prisma validate`)
- No `next build` (blocked by missing Prisma client binary in sandbox)
- Commit and push to PR #31 after each milestone
