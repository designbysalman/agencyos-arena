# Deliverable 1 — Product Blueprint

**Status:** Proposed — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Product Vision

AgencyOS is a unified, modular operating system for a creative, design, and digital marketing agency. It combines CRM, sales, client management, project delivery, finance, automation, team operations, and business intelligence into a single platform.

**Primary user:** one agency's internal team, with controlled client and collaborator access through a client portal.

**Architectural stance:** single-tenant by design, built with strict module boundaries and permission-aware data access so the codebase can evolve toward multi-tenant SaaS without a rewrite. The first release must not include a commercial multi-tenant billing system.

**Success looks like:** a mature commercial SaaS experience — clean information hierarchy, polished empty/loading/error states, light and dark themes, responsive desktop/tablet/mobile layouts, and real functionality backed by a PostgreSQL database rather than decorative UI mockups.

---

## 2. User Types

| User type | Role in the platform | Typical capabilities |
|---|---|---|
| **Agency Owner / Admin** | Platform administrator | Full access: settings, users, roles, billing config, audit logs, all records, workspace branding |
| **Agency Manager** | Department lead (sales, delivery, operations) | Module-level access across their area: pipelines, projects, invoices, team workload, reports |
| **Team Member / Employee** | Designer, developer, marketer, account manager | Assigned projects, tasks, time tracking, client communication on owned records, own profile/settings |
| **Client** | External client via client portal | View own projects, proposals, invoices, documents; approve proofs; send messages; limited to own data |
| **Collaborator / Contractor** | Freelancer or partner with scoped access | Assigned tasks and files only; no access to financials or other clients' data |

**Authentication model:** internal users log in with email/password + session cookies; clients and collaborators authenticate through secure, scoped portal access (magic-link or password-based, masked contact data where configured).

---

## 3. Core Workflows

### Workflow A — Lead to Client (CRM & Sales)
1. Lead captured (form, import, or manual entry) → assigned to pipeline stage
2. Lead qualified → converted to opportunity with expected value and close date
3. Opportunity advanced through customizable pipeline stages
4. Won opportunity → account/contact created, project and onboarding kicked off

### Workflow B — Sale to Delivery (Proposals → Projects)
1. Proposal/quote built from template, sent to client via shareable link
2. Client reviews, accepts or requests changes (versioned)
3. Accepted proposal → contract generated → e-signature requested
4. Signed contract → project workspace created from template with milestones and tasks
5. Team delivers work; client reviews proofs, requests revisions, approves
6. Change orders recorded when scope changes

### Workflow C — Delivery to Cash (Finance)
1. Invoice generated (from estimate, project milestones, or manually), flexible numbering, tax configured per agency settings
2. Invoice sent to client with public preview link; manual bank transfer or payment recorded by admin
3. Partial payments and deposits supported; payment status tracked
4. Expenses logged and linked to projects for profitability reporting

### Workflow D — Operations & Automation
1. Workflow rules trigger on record changes (e.g., "when invoice is overdue 7 days → send reminder + notify owner")
2. Notifications dispatched (in-app, email)
3. Time tracked on tasks → feeds invoicing and workload reports
4. Audit log records every significant change

---

## 4. Module Relationships

```text
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   CRM &     │─────▶│  Proposals   │─────▶│   Projects  │
│   Sales     │      │   & Docs     │      │  & Delivery │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                                                   ▼
                                              ┌─────────────┐
                                              │   Finance   │◀──────┐
                                              └─────────────┘       │
                                                   ▲               │
                                                   │               │
┌─────────────┐      ┌──────────────┐             │               │
│ Automation  │─────▶│ Communication│─────────────┘               │
│  & Comms    │      │   (Inbox)    │                             │
└─────────────┘      └──────────────┘                             │
      ▲                                                           │
      │                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Administration & Platform (cross-cutting)              │
│  Auth · RBAC · Audit Logs · Settings · Branding · Search · Reporting   │
└─────────────────────────────────────────────────────────────────────────┘
```

- **CRM & Sales** feeds opportunities into Proposals and Projects.
- **Proposals & Docs** converts accepted proposals into contracts and project kickoff.
- **Projects & Delivery** produces time entries and change orders consumed by Finance.
- **Finance** consumes invoices/payments and produces revenue/profitability data for dashboards.
- **Automation & Communication** observes events across all modules and acts (notifications, reminders, rules).
- **Administration & Platform** is cross-cutting: every module depends on auth, permissions, and audit logging.

---

## 5. Key Functional Requirements (by module)

### A. Business & CRM
- Accounts and contacts with relationship history
- Leads and opportunities with customizable sales pipelines and stages
- Client onboarding/offboarding checklists
- Client portal access with scoped visibility
- Service catalog (billable services with rates)
- Marketing and sales operations basics (lead sources, campaigns tracking)

### B. Proposals, Documents & Agreements
- Proposal and quotation builder with templates
- Contract management with version control
- Shareable document links (public/protected)
- PDF generation; multilingual document support
- Electronic signature architecture (provider-independent)
- Conditional approvals

### C. Projects & Delivery
- Project workspaces from templates
- Task management, milestones, timelines
- File and asset management
- Client feedback, approvals, and revision management
- Change orders, QA and issue tracking
- Time tracking, workload management, team collaboration

### D. Finance
- Invoicing with flexible numbering; estimates/quotations
- Partial payments and deposits; payment tracking (manual bank transfer supported, no gateway required initially)
- Expense management linked to projects
- Financial dashboards, revenue forecasting, profitability reporting
- Multi-currency readiness; configurable tax handling (no auto-assumption of sales-tax registration)
- PDF invoices and public preview links

### E. Automation & Communication
- Workflow automation: trigger/action rules
- Notifications (in-app + email), reminders and follow-ups
- Email integration architecture; WhatsApp integration architecture
- Shared communication inbox; communication history per contact
- Contact information masking where configured
- Scheduling and calendars
- AI-assisted writing via provider-independent AI gateway

### F. Administration & Platform
- Advanced authentication and session management
- Role-based and custom permissions; flexible client access
- Customizable dashboards; settings and preferences
- Workspace and branding configuration; multi-brand readiness
- Security and audit logs; backups and recovery
- Import/export and data portability
- Permission-aware search across permitted records
- Feature management; secure developer access
- Usage and system health monitoring
- Extensible custom fields; reporting and analytics
- Data lifecycle and retention controls

---

## 6. Non-Functional Requirements (confirmed from brief)

- Excellent UI/UX, responsive desktop/tablet/mobile, accessible controls
- Light and dark themes; design tokens and reusable component library
- Modular architecture: updating one module minimizes impact on others
- Security from the start: least privilege, server-side authorization, input validation, secure uploads, secrets management, audit trails, rate limiting
- TypeScript-first; strong typing; clean architecture; automated testing
- Affordable initial hosting; Cloudflare preferred when suitable; deployment portability; no vendor lock-in claims without verification
- No committed credentials/tokens/secrets in Git
- Real functionality, no fake integrations; mocks documented and temporary

---

## 7. What is Out of Scope for Phase 1

- Commercial multi-tenant SaaS billing (tenant subscriptions, plans, metered billing)
- Integrated payment gateway (Stripe/PayPal processing) — manual bank transfer recording only initially
- Native mobile apps (responsive web covers mobile)
- AI model hosting (AI gateway architecture only; provider integration later)

---

## 8. Acceptance Criteria for This Deliverable

- [ ] Product vision, user types, core workflows, and module map documented
- [ ] Key functional requirements listed per module
- [ ] In-scope and out-of-scope items explicitly called out
- [ ] Reviewed and approved before architecture work is finalized
