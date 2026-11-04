# Deliverable 1 — Product Blueprint (Revised)

**Status:** Revised — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`  
**Supersedes:** Initial planning draft (PR #1)

---

## 1. Product Vision

AgencyOS is a unified, modular operating system for a creative, design, and digital marketing agency. It combines CRM, sales, client management, project delivery, finance, automation, team operations, and business intelligence into a single platform.

**Primary user:** one agency's internal team, with controlled client and collaborator access through a client portal.

**Architectural stance:** single-tenant by design, built with strict module boundaries and permission-aware data access so the codebase can evolve toward multi-tenant SaaS without a rewrite. The first release must not include a commercial multi-tenant billing system.

**Scope preservation:** This blueprint preserves the **full long-term product scope** from the AgencyOS master specification. Every feature is classified as one of:
- **Initial** — implemented in Phases 0–6 (MVP).
- **Later** — explicitly deferred to post-MVP phases; not canceled, not forgotten.
- **Optional** — genuinely optional; may never be implemented unless approved.

Nothing in the master specification is silently dropped. The Requirements Traceability Matrix (`docs/07_REQUIREMENTS_TRACEABILITY_MATRIX.md`) maps every feature to a module, phase, dependencies, acceptance criteria, and status.

---

## 2. User Types

| User type | Role in the platform | Typical capabilities |
|---|---|---|
| **Agency Owner / Admin** | Platform administrator | Full access: settings, users, roles, audit logs, all records, workspace branding, secure developer workspace |
| **Agency Manager** | Department lead (sales, delivery, operations) | Module-level access across their area: pipelines, projects, invoices, team workload, reports |
| **Team Member / Employee** | Designer, developer, marketer, account manager | Assigned projects, tasks, time tracking, client communication on owned records, own profile/settings |
| **Client** | External client via client portal | View own projects, proposals, invoices, documents; approve proofs; send messages; limited to own data; masked contact fields where configured |
| **Collaborator / Contractor** | Freelancer or partner with scoped access | Assigned tasks and files only; no access to financials or other clients' data |
| **Developer (platform)** | Internal platform engineer / secure developer access | Debugging, auditing, secure developer workspace; scoped by feature flags and audit; never bypasses RBAC |

**Authentication model:** internal users log in via a maintained authentication library (see ADR-0001); clients and collaborators authenticate through secure, scoped portal access.

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
3. Accepted proposal → contract generated → e-signature requested (ADR-0010 scope)
4. Signed contract → project workspace created from template with milestones and tasks
5. Team delivers work; client reviews proofs, requests revisions, approves
6. Change orders recorded when scope changes

### Workflow C — Delivery to Cash (Finance)
1. Invoice generated (from estimate, project milestones, or manually), flexible numbering, tax configured per agency settings
2. Invoice sent to client with public preview link; manual bank transfer or payment recorded by admin (no payment gateway in MVP)
3. Partial payments and deposits supported; payment status tracked
4. Expenses logged and linked to projects for profitability reporting

### Workflow D — Operations & Automation
1. Workflow rules trigger on record changes (e.g., "when invoice is overdue 7 days → send reminder + notify owner")
2. Notifications dispatched (in-app, email via ADR-0011 adapter)
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
                                              ┌─────────────┐◀──────┐
                                              │   Finance   │       │
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
│  Secure Developer Access · Feature Management · Retention Controls     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **CRM & Sales** feeds opportunities into Proposals and Projects.
- **Proposals & Docs** converts accepted proposals into contracts and project kickoff.
- **Projects & Delivery** produces time entries and change orders consumed by Finance.
- **Finance** consumes invoices/payments and produces revenue/profitability data for dashboards.
- **Automation & Communication** observes events across all modules and acts (notifications, reminders, rules).
- **Administration & Platform** is cross-cutting: every module depends on auth, permissions, and audit logging.

---

## 5. Scope Classification Summary

| Classification | Meaning | Examples |
|---|---|---|
| **Initial** | Built in Phases 0–6; part of MVP acceptance | Auth, RBAC, contacts, pipelines, proposals, invoices (manual payment), projects, tasks, time tracking |
| **Later** | Deferred post-MVP; explicitly not canceled | E-signature provider integration, WhatsApp integration, multi-currency, AI gateway, multi-brand, revenue forecasting |
| **Optional** | May never be built; requires separate approval | Native mobile apps, dedicated search engine, virus scanning on uploads, commercial multi-tenant billing |

---

## 6. Acceptance Criteria for This Deliverable

- [ ] Product vision, user types, core workflows, and module map documented
- [ ] Full master-spec scope preserved with Initial / Later / Optional classification
- [ ] Key functional requirements listed per module
- [ ] Cross-referenced to Requirements Traceability Matrix
- [ ] Reviewed and approved before architecture work is finalized
