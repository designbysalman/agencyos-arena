# Deliverable 2 — Architecture Proposal (Revised)

**Status:** Revised — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`  
**Supersedes:** Initial planning draft (PR #1)  
**Related:** ADR-0001…0006 (see `docs/ADR/`)

---

## 1. Summary Recommendation

**Architecture style:** Modular monolith (single deployable unit) with strict internal module boundaries. Each module owns its domain logic, data access, validation, and API surface. Modules communicate through an internal event bus (pg-boss-backed) and well-defined service interfaces — no shared database tables across module boundaries except shared core tables (users, org, audit log).

**Rationale:** The brief explicitly warns against unnecessary microservice complexity, requires affordable initial hosting, and wants a future upgrade path to independently deployable services. A modular monolith gives us:
- Single deployment, single database, lowest operational cost and complexity
- Clear module boundaries that can later be extracted into services if justified
- Easier refactoring and consistency (one type system, one ORM, one auth layer)

**Deployment target (Phase 0):** Local Docker Compose (Next.js server + PostgreSQL + pg-boss). No cloud resources are provisioned in Phase 0. Deployment architecture is portable (Docker Compose + PostgreSQL + S3-compatible storage) and can target a self-hosted VPS or Cloudflare-compatible deployment after stakeholder approval.

**Decision status:** ADR-0003 documents the VPS-vs-Cloudflare comparison; neither is approved for Phase 0. A product stakeholder must approve any paid infrastructure before provisioning. Cloudflare Pages cannot run background jobs/long-lived processes and Cloudflare D1 lacks full PostgreSQL transactional guarantees, so the Cloudflare path would require architectural rework.

---

## 2. Technology Stack

| Layer | Technology | Reasoning / Tradeoffs |
|---|---|---|
| Language | TypeScript (strict) | End-to-end type safety, shared types between API and frontend, strong maintainability |
| Frontend framework | Next.js (App Router), React | Production-grade SSR/SSG, routing, API routes; runs as Node server on VPS (ADR-0003) |
| Styling / UI | Tailwind CSS + in-house design system | Centralized design tokens, full control, no paid component-library lock-in, accessible primitives (ADR-0006) |
| UI primitives | Radix UI (headless) | Accessible, unstyled behavior; we apply our design tokens |
| Icons | Lucide React | Clean, consistent, tree-shakeable |
| Backend API | Next.js API routes (Route Handlers) organized by module | One deployable, co-located with frontend; module folders enforce boundaries |
| ORM / Database client | Prisma | Strong TypeScript generation, migrations, good DX; raw SQL escape hatch for complex queries |
| Database | PostgreSQL (self-hosted on VPS) | Relational integrity essential for invoices, payments, permissions; full transactions and FKs |
| Migrations | Prisma Migrate (dev), reviewed SQL migrations (prod) | Version-controlled schema; prod migrations reviewed in PR, never auto-applied |
| Auth | Maintained self-hosted library (BetterAuth/Lucia, ADR-0001) | MFA, password recovery, secure sessions out of the box; no per-user vendor cost; self-hosted/portable |
| Authorization | RBAC + resource-scoped (ABAC-lite) (ADR-0004) | Least privilege; server-side enforcement on every request; org-scoping |
| Validation | Zod | Input validation at API boundaries; shared schemas with frontend |
| Background jobs | pg-boss (PostgreSQL-backed queue, ADR-0002) | No extra infrastructure; runs on Postgres; Redis/BullMQ upgrade path documented |
| File storage | S3-compatible (Cloudflare R2 in prod; local disk in dev) | R2 no egress fees, cheap, portable S3 API; uploads validated for type/size |
| Email | SMTP provider adapter (Resend/SendGrid/SMTP relay) | Provider-independent architecture; one adapter interface |
| WhatsApp | Provider-independent adapter interface (Later phase) | No provider behavior in MVP |
| AI gateway | Provider-independent interface (Later phase) | No hardcoded provider behavior |
| Search | PostgreSQL full-text search | Permission-aware search; no Elasticsearch cost/complexity initially |
| Caching | None initially (database + HTTP caching headers) | Redis only added when profiling shows a need |
| Tests | Vitest + React Testing Library (unit/component), Playwright (E2E) | Fast unit tests, real-browser E2E for critical path |
| CI/CD | GitHub Actions | Free at needed scale; runs lint, type-check, tests, build |
| Observability | Structured logging (Pino) + health endpoints + uptime checks | No paid APM initially; upgrade path to OpenTelemetry-compatible tooling |

**Technologies deliberately avoided:** microservices, Kubernetes, Elasticsearch, managed auth vendors (per-user cost/lock-in), paid design systems, proprietary low-code platforms.

---

## 3. System Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────┐
│                     Clients (Browser / Portal)              │
│  Next.js frontend (App Router) — React + Tailwind + Design  │
│  System — accessible, responsive, light/dark themes         │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS (Cloudflare Tunnel / CDN)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application (VPS, Docker)       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐  │
│  │  CRM    │  │ Finance │  │ Projects│  │ Automation/   │  │
│  │ Module  │  │ Module  │  │ Module  │  │ Communication │  │
│  │(API +   │  │(API +   │  │(API +   │  │ Module        │  │
│  │  UI)    │  │  UI)    │  │  UI)    │  │               │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───────┬───────┘  │
│       │            │            │               │           │
│       └────────────┴────────────┴───────────────┘           │
│              Internal Event Bus (pg-boss, in-process)       │
│                    └──────────┬────────────┘                                     │
│              Shared Core: Auth, RBAC, Audit, Org, Custom Fields│                  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       ┌──────────────┐              ┌──────────────┐
       │ PostgreSQL   │              │ Object Store │
       │ (primary DB) │              │ (R2 / local) │
       └──────────────┘              └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ pg-boss jobs │ (tables inside PostgreSQL)
       └──────────────┘
```

### Module boundary rules (enforced)
1. A module may only access another module's data through that module's public service API — never direct table access across modules.
2. Shared core (users, roles, org, audit log) is the only exception.
3. Each module folder contains: `api/` (route handlers), `services/` (business logic), `schema/` (Zod + Prisma models), `events/` (event definitions), `ui/` (React components).
4. Cross-module communication happens via typed events published on the internal bus.

---

## 4. Database Strategy

**Primary:** PostgreSQL, single instance, single schema initially (one agency). Multi-tenancy preparation: an `organizations` table and `organization_id` on every entity table from day one, so a future multi-tenant split is a matter of adding row-level security / middleware scoping, not a schema rewrite.

**Schema domains:**
- Core: organizations, users, roles, permissions, sessions, audit_logs, custom_fields, custom_field_values, feature_flags, webhook_events
- CRM: contacts, accounts, leads, opportunities, pipelines, stages, sources
- Documents: proposals, quotes, contracts, documents, versions, signatures, document_links
- Projects: projects, tasks, milestones, time_entries, project_files, change_orders, issues
- Finance: invoices, invoice_items, payments, estimates, expense_items, tax_settings, currency_config
- Automation: workflow_rules, workflow_executions, notifications, email_messages, scheduled_tasks
- Communication: communication_threads, messages
- Storage: file_assets (metadata only; binaries in object storage)

**Migrations:** Prisma schema is source of truth; migration SQL stored in `/prisma/migrations` and reviewed in PRs. No auto-migration on app startup in production. Seed scripts are development-only.

**Backups:** Daily `pg_dump` to object storage (R2) with 30-day retention; documented restore procedure; restore test before launch.

---

## 5. API Approach

- **Surface:** Next.js Route Handlers (`/api/v1/:module/*`), JSON over HTTPS.
- **Versioning:** `/api/v1/` prefix; breaking changes increment version, never silently change contracts.
- **Validation:** Zod schemas on every request body/query param; 400 responses with field-level errors.
- **Authentication:** Session validated on every API route via middleware; 401/403 returned consistently.
- **Authorization:** Service-layer guards check user role + resource ownership + client scoping before any mutation or read (ADR-0004).
- **Error handling:** Centralized error formatter; no stack traces leaked to clients.
- **Idempotency:** `Idempotency-Key` header supported on write endpoints (invoice creation, payments) to prevent duplicates on retry (ADR-0005).
- **Webhooks:** Outbound webhook adapter architecture for third-party integrations (future).

---

## 6. Security Model

| Control | Implementation |
|---|---|
| Authentication | Maintained self-hosted library (ADR-0001): secure session cookies (httpOnly, Secure, SameSite), argon2id/scrypt hashing, MFA, password recovery |
| Authorization | RBAC + resource-scoped checks enforced server-side on every route; client users can only read their own org's linked records |
| Input validation | Zod on all API inputs; file type/size validation on uploads |
| Secure uploads | Files stored outside web root in object storage; served via signed/short-lived URLs; no executable serving from bucket |
| Secrets | Environment variables only; `.env.example` committed without values; real secrets never in Git |
| Audit logging | Append-only audit_logs table: actor, action, resource type/id, before/after (PII-redacted), timestamp, IP |
| Rate limiting | Per-IP and per-user rate limiting on auth and write endpoints |
| Data isolation | Every query scoped by `organization_id` and permission checks; no cross-tenant leakage |
| Client visibility | Clients see only their own projects, invoices, proposals, documents; masked contact fields where configured |
| Headers | CSP, HSTS, X-Content-Type-Options, X-Frame-Options via Next.js headers config |

---

## 7. Hosting Strategy (see ADR-0003)

**Phase 0:** Local Docker Compose (Next.js server + PostgreSQL + pg-boss). **No cloud resources are provisioned and no paid infrastructure is assumed or approved for Phase 0.**

The deployment architecture is portable (Docker Compose + PostgreSQL + S3-compatible storage) and can target either a self-hosted VPS or a Cloudflare-compatible deployment after stakeholder approval. Two documented options exist; neither is selected for Phase 0:

- **Option A (self-hosted VPS):** ~€5/month (e.g., Hetzner CX11). Requires stakeholder approval before provisioning. Full relational control; team manages backups, upgrades, security patching. Single point of failure mitigated by documented pg_dump backups and restore procedure.
- **Option B (Cloudflare Pages + Workers + D1 + R2 + Queues):** ~$0–10 within free tiers. Not chosen for Phase 0 because Pages cannot run background jobs and D1 lacks full PostgreSQL transactional guarantees; would require architectural rework.

**Portability:** Docker Compose + Prisma migrations + S3-compatible storage means the stack can move to any VPS/provider with minimal rework. No proprietary platform lock-in in application code.

**Do not claim "free" or "scalable" without verification:** All cited costs are approximate and unverified until a host is selected; Cloudflare free tiers have documented limits (D1 storage, Worker execution time, Pages build minutes). Backups and recovery remain the team's responsibility on any self-hosted option.

---

## 8. Major Tradeoffs (Honest Assessment)

| Decision | Benefit | Cost / Risk |
|---|---|---|
| Modular monolith | Cheap, simple, fast to build, easy refactor | No independent scaling of modules; acceptable for single-agency scale |
| Next.js API routes (no separate API service) | One deployable, shared types | Frontend and API deploy together; extractable later |
| Prisma ORM | Great DX, type-safe, migrations | Abstraction leaks for complex queries; raw SQL escape hatch |
| pg-boss over Redis | No extra infra to operate/pay | Slightly lower throughput than Redis; fine for agency-scale |
| Maintained auth library (not fully custom) | MFA/recovery/sessions maintained by community | We operate and patch the library; CVE monitoring required |
| Self-hosted PostgreSQL (portable) | Full relational control; deployable to VPS or managed host after approval | We manage backups, upgrades, security patching on whichever host is approved |
| PostgreSQL full-text search | No Elasticsearch cost/ops | Limited vs dedicated search; adequate initially |
| Local Docker dev in Phase 0 | Zero infrastructure cost; immediate start | Remote deployment is a post-Phase-0 decision requiring stakeholder approval |

---

## 9. Acceptance Criteria for This Deliverable

- [ ] Technology stack justified with tradeoffs (no fashion-driven choices)
- [ ] System architecture, module boundaries, database strategy, API approach, and hosting strategy documented
- [ ] Hosting contradictions resolved (local Docker dev for Phase 0; VPS and Cloudflare alternatives documented; neither approved for Phase 0)
- [ ] Security model covers authentication, authorization, input validation, audit logging, secrets management, rate limiting
- [ ] Hosting cost realism acknowledged; no unverified "free/scalable" claims
- [ ] Cross-referenced to ADR-0001…0006
- [ ] Reviewed and approved before implementation begins
