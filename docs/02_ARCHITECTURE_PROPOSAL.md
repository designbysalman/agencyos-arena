# Deliverable 2 — Architecture Proposal

**Status:** Proposed — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Summary Recommendation

**Architecture style:** Modular monolith (single deployable unit) with strict internal module boundaries. Each module owns its domain logic, data access, validation, and API surface. Modules communicate through an internal event bus and well-defined service interfaces — no shared database tables across module boundaries except shared core tables (users, org, audit log).

**Rationale:** The brief explicitly warns against unnecessary microservice complexity, requires affordable initial hosting, and wants a future upgrade path to independently deployable services. A modular monolith gives us:
- Single deployment, single database, lowest operational cost and complexity
- Clear module boundaries that can later be extracted into services if justified
- Easier refactoring and consistency (one type system, one ORM, one auth layer)

**Deployment target (initial):** Single VPS (e.g., Hetzner CX11, ~€5/month) running Docker Compose (app + PostgreSQL + Redis), fronted by Cloudflare Tunnel for secure remote access and custom domains later. Alternative free-tier-friendly split: Cloudflare Pages (frontend) + managed PostgreSQL (Neon/Supabase free tier) + Cloudflare R2 (storage). Both options are documented; final choice confirmed at implementation kickoff.

---

## 2. Technology Stack

| Layer | Technology | Reasoning / Tradeoffs |
|---|---|---|
| Language | TypeScript (strict) | End-to-end type safety, shared types between API and frontend, strong hiring/maintainability pool |
| Frontend framework | Next.js (App Router), React | Production-grade SSR/SSG, routing, API routes, large ecosystem; App Router keeps frontend + API in one deployable |
| Styling / UI | Tailwind CSS + custom design system (shadcn/ui-style primitives built in-house) | Centralized design tokens, full control, no heavy component-library lock-in, accessible primitives |
| Icons | Lucide React | Clean, consistent, tree-shakeable |
| Backend API | Next.js API routes (Route Handlers) organized by module | One deployable, co-located with frontend; module folders enforce boundaries; avoids operating a separate API service |
| ORM / Database client | Prisma | Strong TypeScript generation, migrations, good developer experience; alternative Drizzle evaluated and rejected for now (Prisma's migration story fits a small team better) |
| Database | PostgreSQL | Relational integrity is essential for invoices, payments, permissions; managed or self-hosted options available; JSONB columns for extensible custom fields |
| Migrations | Prisma Migrate (dev), reviewed SQL migrations (prod) | Version-controlled schema; prod migrations reviewed before applying |
| Auth | Custom session-based auth (httpOnly, Secure, SameSite cookies) + bcrypt/argon2 | Avoids expensive third-party auth vendors; full control over sessions, MFA readiness, and client portal scoping |
| Authorization | RBAC + resource-scoped checks (middleware + service-layer guards) | Least privilege; server-side enforcement on every request |
| Validation | Zod | Input validation at API boundaries, shared schemas with frontend |
| Background jobs | pg-boss (PostgreSQL-backed queue) | No extra infrastructure (runs on Postgres), retries, scheduling; Redis + BullMQ is the documented upgrade path if volume justifies it |
| File storage | S3-compatible (Cloudflare R2 in prod; local disk/MinIO in dev) | R2 has no egress fees, cheap, portable S3 API; uploads validated for type/size, virus-scan noted as future hardening |
| Email | SMTP provider (Resend/SendGrid/SMTP relay) via adapter | Provider-independent architecture; one adapter interface, swap without rewriting |
| Caching | None initially (database + HTTP caching headers) | Redis only added when profiling shows a need; avoids paying for/operating an extra service |
| Search | PostgreSQL full-text search (pg_trgm / tsvector) | Permission-aware search across permitted records without Elasticsearch cost/complexity; upgrade path to dedicated search later |
| Tests | Vitest + React Testing Library (unit/component), Playwright (E2E critical workflows) | Fast unit tests, real-browser E2E for lead→invoice critical path |
| CI/CD | GitHub Actions | Free for public/private repos at needed scale; runs lint, type-check, tests, build |
| Observability | Structured logging (Pino) + health endpoints + uptime checks | No paid APM initially; self-hosted or Cloudflare-level monitoring; upgrade path to OpenTelemetry-compatible tooling |

**Technologies deliberately avoided:** microservices, Kubernetes, Elasticsearch, Redis (initially), proprietary low-code platforms, paid design systems.

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
│                     Next.js Application                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐  │
│  │  CRM    │  │ Finance │  │ Projects│  │ Automation/   │  │
│  │  Module │  │ Module  │  │ Module  │  │ Communication │  │
│  │(API +   │  │(API +   │  │(API +   │  │ Module        │  │
│  │  UI)    │  │  UI)    │  │  UI)    │  │               │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───────┬───────┘  │
│       │            │            │               │           │
│       └────────────┴────────────┴───────────────┘           │
│              Internal Event Bus (pg-boss / in-process)      │
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

### Module boundary rules
1. A module may only access another module's data through that module's public service API — never direct table access across modules.
2. Shared core (users, roles, org, audit log) is the only exception.
3. Each module folder contains: `api/` (route handlers), `services/` (business logic), `schema/` (Zod + Prisma models), `events/` (event definitions), `ui/` (React components).
4. Cross-module communication happens via typed events published on the internal bus.

---

## 4. Database Strategy

**Primary:** PostgreSQL, single instance, single schema initially (one agency). Multi-tenancy preparation: an `organizations` table and `organization_id` on every entity table from day one, so a future multi-tenant split is a matter of adding row-level security / middleware scoping, not a schema rewrite.

**Schema domains:**
- Core: organizations, users, roles, permissions, sessions, audit_logs, custom_fields, feature_flags, webhook_events
- CRM: contacts, accounts, leads, opportunities, pipelines, stages, sources
- Documents: proposals, quotes, contracts, documents, versions, signatures, document_links
- Projects: projects, tasks, milestones, time_entries, project_files, change_orders
- Finance: invoices, invoice_items, payments, estimates, expense_items, tax_settings, currency_config
- Automation: workflow_rules, workflow_executions, notifications, email_messages, scheduled_tasks
- Storage: file_assets (metadata only; binaries in object storage)

**Migrations:** Prisma schema is source of truth; migration SQL stored in `/prisma/migrations` and reviewed in PRs. Seed scripts for development only (clearly marked, never run in prod without review).

**Backups:** Daily `pg_dump` to object storage (R2) with 30-day retention; point-in-time recovery documented if managed Postgres is used.

---

## 5. API Approach

- **Surface:** Next.js Route Handlers (`/api/v1/:module/*`), JSON over HTTPS.
- **Versioning:** `/api/v1/` prefix; breaking changes increment version, never silently change contracts.
- **Validation:** Zod schemas on every request body/query param; 400 responses with field-level errors.
- **Authentication:** Session cookie validated on every API route via middleware; 401/403 returned consistently.
- **Authorization:** Service-layer guards check user role + resource ownership + client scoping before any mutation or read.
- **Error handling:** Centralized error formatter; no stack traces leaked to clients.
- **Idempotency:** Idempotency-Key header supported on write endpoints (invoice creation, payments) to prevent duplicates on retry.
- **Webhooks:** Outbound webhook adapter architecture for third-party integrations (future).

---

## 6. Security Model

| Control | Implementation |
|---|---|
| Authentication | Session cookies (httpOnly, Secure, SameSite=Strict), CSRF protection via double-submit token, argon2id password hashing |
| Authorization | RBAC + ownership + client-scoping enforced server-side on every route; client users can only read their own organization's linked records |
| Input validation | Zod on all API inputs; file type/size validation on uploads |
| Secure uploads | Files stored outside web root in object storage; served via signed/short-lived URLs; no executable serving from bucket |
| Secrets | Environment variables only; `.env.example` committed without values; real secrets never in Git; Vault or provider secret manager considered at scale |
| Audit logging | Append-only audit_logs table: actor, action, resource type/id, before/after (redacted for sensitive fields), timestamp, IP |
| Rate limiting | Per-IP and per-user rate limiting on auth and write endpoints |
| Data isolation | Every query scoped by `organization_id` and permission checks; no cross-tenant leakage possible even in future multi-tenant mode |
| Client visibility | Clients see only their own projects, invoices, proposals, documents; masked contact fields where configured |
| Headers | CSP, HSTS, X-Content-Type-Options, X-Frame-Options via Next.js headers config |

---

## 7. Hosting Strategy

**Option A — Single VPS (recommended for lowest cost, simplest ops):**  
Hetzner CX11 (~€5/month) or equivalent. Docker Compose runs Next.js app + PostgreSQL + pg-boss. Cloudflare Tunnel provides secure remote access and HTTPS without opening inbound ports. Daily pg_dump backups to Cloudflare R2. Custom domain added via Cloudflare DNS when needed. Estimated monthly cost: ~€6–8 (VPS + R2 storage negligible at this scale).

**Option B — Split free-tier-friendly stack:**  
Cloudflare Pages (frontend, free tier), Neon or Supabase free-tier PostgreSQL, Cloudflare R2 (object storage, free tier), email via Resend free tier. Estimated monthly cost: $0 within free-tier limits; tradeoff is more vendors to manage and free-tier limits (database size, build minutes) that must be monitored.

**Decision:** Not yet final. Recommendation is Option A for the initial release (single provider, portable Docker Compose, predictable cost), with Option B documented as an alternative. Final selection confirmed before Phase 0 implementation.

**Portability:** Docker Compose + Prisma migrations + S3-compatible storage means the stack can move to any VPS/provider with minimal rework. No proprietary platform services lock us in.

---

## 8. Major Tradeoffs (Honest Assessment)

| Decision | Benefit | Cost / Risk |
|---|---|---|
| Modular monolith | Cheap, simple, fast to build, easy refactor | No independent scaling of modules; acceptable for single-agency scale |
| Next.js API routes (no separate API service) | One deployable, shared types | Frontend and API deploy together; fine for now, extractable later |
| Prisma ORM | Great DX, type-safe, migrations | Abstraction leaks for complex queries; raw SQL escape hatch documented |
| pg-boss over Redis | No extra infra to operate/pay | Slightly lower throughput than Redis; fine for agency-scale |
| Custom auth over Auth0/Clerk | No per-user cost, full control | We own security of sessions, MFA, password recovery — must be implemented carefully |
| PostgreSQL full-text search | No Elasticsearch cost/ops | Limited compared to dedicated search; adequate for record search initially |
| Single VPS | ~€5/month, simple | Single point of failure; mitigated by backups and documented recovery |

---

## 9. Acceptance Criteria for This Deliverable

- [ ] Technology stack justified with tradeoffs (no fashion-driven choices)
- **** System architecture, module boundaries, database strategy, API approach, and hosting strategy documented
- [ ] Security model covers authentication, authorization, input validation, audit logging, secrets management, rate limiting
- [ ] Hosting cost realism acknowledged; no unverified "free/scalable" claims
- [ ] Reviewed and approved before implementation begins
