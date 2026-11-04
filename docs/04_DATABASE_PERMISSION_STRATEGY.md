# Deliverable 4 — Database & Permission Strategy

**Status:** Proposed — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Data Ownership Strategy

**Single agency, multi-tenant-ready:** Every business entity table carries an `organization_id` column from day one. The initial deployment has exactly one organization record; all users and data belong to it. This means:
- No schema rewrite is required to support multiple agencies later
- Future multi-tenancy is enforced by middleware scoping every query to the actor's `organization_id`, plus optional row-level security (RLS) at the database layer

**Ownership rules:**
- Every record has `created_by` and `updated_by` references to `users`
- Every record has `organization_id`
- Deletion is soft (`deleted_at`) where business meaning requires history (invoices, contracts, projects); hard delete only for transient data (upload sessions, temp tokens)

---

## 2. Core Entities & Relationships

### Core / Platform
- **organizations** — the agency (workspace) container
- **users** — internal team members (email, password hash, role, status, MFA flags)
- **roles** — named permission sets (Admin, Manager, Employee, Client, Collaborator) + custom roles
- **permissions** — atomic actions (e.g., `invoice.create`, `project.delete`, `user.manage`)
- **role_permissions** — join table
- **user_roles** — join table (user can have multiple roles within an org)
- **user_sessions** — session token, expiry, IP, user agent
- **audit_logs** — actor, action, entity_type, entity_id, before/after (PII-redacted), metadata, timestamp
- **custom_fields** — extensible field definitions per entity (JSON config)
- **custom_field_values** — values attached to entity records
- **feature_flags** — per-org feature gating
- **webhook_events** — outbound event log
- **file_assets** — metadata only (name, mime, size, storage path, uploaded_by)

### CRM
- **contacts** — people (name, email, phone, masked fields, organization-linked)
- **accounts** — companies/clients (name, website, address, status)
- **account_contacts** — join table (contact → account with role)
- **leads** — source, status, expected value, owner, pipeline entry point
- **pipelines** — named sales pipelines per org
- **pipeline_stages** — ordered stages within a pipeline (won/lost flags)
- **opportunities** — value, close date, stage, contact/account, owner

### Documents
- **proposals** — linked to opportunity/contact, status (draft/sent/accepted/rejected/expired), total
- **proposal_versions** — versioned snapshots
- **quotes** — estimate documents, status, valid_until
- **contracts** — linked to proposal/project, status, signature_request_id
- **documents** — generic document registry (title, type, folder, visibility)
- **document_versions** — file asset references per version
- **document_links** — shareable public/protected links with expiry and access log
- **signatures** — signer, signed_at, signature_method, audit reference

### Projects & Delivery
- **projects** — name, client, status, budget, start/end dates, template used
- **project_templates** — reusable project skeletons with default tasks/milestones
- **tasks** — project, assignee, milestone, status, priority, due date, estimated hours
- **task_time_entries** — user, task, date, hours, description, billable flag
- **milestones** — project, due date, status
- **project_files** — file_asset references linked to project/task
- **change_orders** — project, description, amount, status, approved_by
- **issues** — QA/bug tracking linked to project/task

### Finance
- **invoices** — number (flexible series), client, status (draft/sent/paid/overdue/void), subtotal, tax, total, currency, due_date
- **invoice_items** — description, quantity, unit_price, tax_rate, amount, linked task/milestone
- **payments** — invoice, amount, method (manual bank transfer / recorded), date, reference, recorded_by
- **estimates** — quote documents convertible to invoices
- **expense_items** — project, category, amount, date, receipt file, billable flag
- **tax_settings** — org-level: tax registered (boolean, default false), default rates, tax names
- **currency_config** — supported currencies, default currency, exchange rate source

### Automation & Communication
- **workflow_rules** — trigger, conditions, actions (JSON), enabled flag
- **workflow_executions** — rule, record, status, result log
- **notifications** — user, type, channel, read status, payload, sent_at
- **email_messages** — direction (in/out), contact, subject, body, status, message_id
- **scheduled_tasks** — run_at, handler, payload, status
- **communication_threads** — contact, channel, participants
- **messages** — thread, sender, body, read status

---

## 3. Key Relationships (summary)

```
organizations 1──N users
organizations 1──N contacts
organizations 1──N accounts
organizations 1──N pipelines
organizations 1──N projects
organizations 1──N invoices
organizations 1──N audit_logs

accounts 1──N contacts (via account_contacts)
contacts 1──N leads
contacts 1──N opportunities
leads 1──N opportunities
pipelines 1──N pipeline_stages
opportunities 1──N proposals
proposals 1──N contracts
projects 1──N tasks
projects 1──N milestones
projects 1──N invoices (generated from)
projects 1──N time_entries (via tasks)
tasks 1──N time_entries
invoices 1──N invoice_items
invoices 1──N payments
```

---

## 4. Permission Model

### Role types (base roles, extensible via custom roles)
| Role | Scope | Typical permissions |
|---|---|---|
| Admin | Organization-wide | All permissions including user management, settings, audit log |
| Manager | Department or org-wide | Module-level read/write within scope; cannot manage users/settings |
| Employee | Own records + assigned | Read/write on assigned projects/tasks; limited finance visibility |
| Client | Portal only | Read own projects/invoices/documents; approve proofs; no internal data |
| Collaborator | Scoped | Read/write only on explicitly assigned tasks/files |

### Authorization rules (server-side enforced)
1. **Organization scoping:** every query includes `WHERE organization_id = actor.org_id`. No cross-organization data is ever returned.
2. **Role-based:** endpoint requires one or more permission codes (checked via `user_roles → role_permissions`).
3. **Resource ownership:** employees can mutate only records they own or are assigned to (creator, assignee, or project member), unless their role grants broader rights.
4. **Client scoping:** authenticated clients can only read records where `client_id` matches their linked contact/account; no writes except approvals/signatures on their own documents.
5. **Collaborator scoping:** collaborators see only tasks/files explicitly assigned to them.
6. **Sensitive field masking:** contact phone/email may be masked in client-facing views based on org/contact masking configuration. Masking is enforced at the API serialization layer, never leaked to the client.

### Permission checks location
- API route handlers: coarse permission (e.g., `invoice.create`)
- Service layer: fine-grained (ownership, client scoping, state transitions — e.g., only paid invoices can be voided)
- Frontend: UI hides unauthorized actions but never relies on frontend-only enforcement

---

## 5. Data Visibility by User Type

| Entity | Admin | Manager | Employee | Client | Collaborator |
|---|---|---|---|---|---|
| Contacts/Accounts | All | All | Assigned + own | Own linked only | None |
| Leads/Opportunities | All | All | Assigned | None | None |
| Projects | All | All | Assigned projects | Own projects | Assigned tasks |
| Tasks | All | All | Assigned | View own project tasks | Assigned tasks |
| Invoices | All | All | View only | Own invoices | None |
| Payments | All | All | View | Own invoice payments | None |
| Documents | All | All | Assigned | Own linked documents | Assigned files |
| Audit logs | All | None | None | None | None |
| Users/Settings | All | None | None | None | None |

---

## 6. Security Considerations for Data

- **PII in audit logs:** `before/after` payloads redact email, phone, and tax IDs before storage
- **No secrets in DB:** API tokens and encryption keys stored in environment variables / secret manager, never in database columns
- **File access:** file_assets served via signed URLs with expiry; direct bucket URLs never exposed
- **Retention:** data lifecycle settings control how long audit logs, communication history, and deleted records are retained (configurable per org)
- **Export/portability:** each org can export its data (JSON/CSV) via a background job; supports the data portability requirement

---

## 7. Acceptance Criteria for This Deliverable

- [ ] Core entities, attributes, and relationships defined
- [ ] `organization_id` on every entity table for future multi-tenancy
- [ ] Role and permission model with base roles and custom-role extensibility
- [ ] Client visibility rules and contact masking rules documented
- [ ] Server-side enforcement locations identified (route + service layer)
- [ ] Soft-delete and audit-log strategy documented
- [ ] Reviewed and approved before schema implementation
