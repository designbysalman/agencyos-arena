# ADR-0004 — Permission Architecture

**Status:** Proposed  
**Deciders:** Lead architect  
**Date:** 2026-11-05

## Context

AgencyOS needs server-side authorization from Phase 0, covering organization ownership, resource-level authorization, custom roles, client isolation, developer-scoped access, secure document sharing, and automated access-control tests. The initial draft defined base roles but lacked enforcement detail, resource-level granularity, and test strategy.

## Decision

**Hybrid RBAC + resource-scoped (ABAC-lite) authorization**, enforced at three layers:

1. **Route/middleware layer** — coarse permission codes (e.g., `invoice.create`, `user.manage`).
2. **Service layer** — fine-grained resource-level checks (ownership, assignment, client scoping, state transitions).
3. **Serialization/API response layer** — field masking (contact PII masking where configured) and filtering so unauthorized data never reaches the client.

## Authorization Model

### Core principles
- **Organization scoping:** every business entity carries `organization_id`; every query filters `WHERE organization_id = actor.organization_id`.
- **Least privilege:** default deny; permissions granted explicitly.
- **Server-side enforcement only:** frontend hides unauthorized UI but never enforces authorization.
- **No cross-organization access:** impossible by query construction.

### Role types
| Role | Scope | Capabilities |
|---|---|---|
| Admin | Organization-wide | All permissions incl. user management, settings, audit log, developer workspace |
| Manager | Department or org-wide | Module-level read/write within scope; no user/settings management |
| Employee | Own + assigned records | Read/write on assigned projects/tasks; limited finance visibility |
| Client | Portal only | Read own projects/invoices/documents; approve proofs; no writes except approvals/signatures |
| Collaborator | Scoped | Read/write only on explicitly assigned tasks/files |
| Custom roles | Configurable | Any combination of atomic permissions |

### Atomic permissions (sample)
`contact.*`, `account.*`, `lead.*`, `opportunity.*`, `pipeline.*`, `proposal.*`, `contract.*`, `invoice.*`, `payment.*`, `project.*`, `task.*`, `time_entry.*`, `expense.*`, `user.manage`, `role.manage`, `settings.manage`, `audit.read`, `developer.access`, `document.share`, `export.data`

### Resource-level rules
- Employees mutate only records they own or are assigned to (creator, assignee, project member), unless role grants broader rights.
- Clients read only records where `client_id` matches their linked contact/account.
- Collaborators see only tasks/files explicitly assigned to them.
- Invoice/payment data: internal roles only; clients see their own invoices via portal.
- Secure document sharing: shareable links are token-based, time-bound, access-logged; link access does not authenticate the viewer as a system user.

### Developer-scoped access
- "Secure developer workspace" is an admin-gated feature for platform debugging/auditing.
- All developer actions are audited (actor, action, resource, timestamp, IP).
- Developer access never bypasses RBAC; impersonation, if ever added, requires MFA + audit + time-bound token.

## Enforcement Locations

| Layer | Responsibility |
|---|---|
| Next.js middleware | Session validation, org-scoping injection, route-level permission codes |
| API route handlers | Coarse permission check + input validation |
| Service layer | Fine-grained ownership/assignment/client-scope checks, state-transition rules |
| Serialization | PII masking, field filtering based on viewer role |

## Automated Access-Control Tests

- **Permission matrix test suite:** for every role × resource × action combination, assert allowed/denied (E2E + unit).
- **IDOR test:** assert that guessing another user's record ID returns 403/404, never 200 with data.
- **Client isolation test:** assert a client cannot access another client's invoice/project/contact.
- **Cross-org test:** assert queries are scoped to `organization_id` even if a user supplies another org's ID.
- **Masking test:** assert masked contact fields are redacted in client-facing responses.
- Run on every CI push; coverage report required.

## Tradeoffs Accepted

- Resource-level checks add service-layer complexity; mitigated by reusable authorization helpers.
- Automated matrix tests grow combinatorially; scoped to critical resources (invoices, projects, contacts) initially.
