# Deliverable 6 — Risks & Open Questions

**Status:** Proposed — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`

---

## 1. Purpose

This document separates **confirmed requirements** (from the AgencyOS master brief) from **assumptions** and **proposals**, then lists open questions, technical limitations, integration dependencies, security concerns, and architectural risks. Nothing here blocks Phase 0, but several items need answers before later phases are declared complete.

---

## 2. Confirmed Requirements vs Assumptions vs Proposals

### Confirmed requirements (from brief, non-negotiable)
- Single-agency internal platform with controlled client/collaborator portal access
- Architecture must allow future multi-tenant SaaS without rewrite
- TypeScript-first; modular monolith; avoid microservice complexity
- PostgreSQL or justified relational database; database migrations
- Light/dark themes; design tokens and reusable components
- Canvas `#F8F9FA`, primary text `#111827`, primary accent `#047857`
- Responsive desktop/tablet/mobile; accessible navigation and controls
- Loading, empty, error, success states on all screens
- Strong authentication and session management; least privilege; server-side authorization
- Input validation; protection against common web vulnerabilities; secure upload handling
- Secrets management; audit trails; data isolation; rate limiting
- No credentials/tokens/passwords/secrets committed to Git
- Affordable initial hosting; Cloudflare preferred when technically suitable; deployment portability; no unverified free/scalable claims
- Invoicing works without an integrated payment gateway; manual bank transfers and payment recording supported
- Tax configuration does NOT automatically assume sales-tax registration
- Real functionality only; no fake backend integrations or misleading states; temporary mocks documented
- No commercial multi-tenant billing system in initial implementation
- Planning deliverables saved under `/docs/`

### Assumptions (working beliefs, not yet confirmed)
- One full-time engineer implementing; estimates in Phase roadmap reflect that
- Initial deployment on a single VPS (~€5/month) with Docker Compose; Cloudflare Tunnel for remote access
- Cloudflare R2 for object storage; email via an SMTP/Resend-style provider
- Custom session-based auth rather than a third-party auth vendor (cost control)
- PostgreSQL full-text search sufficient initially; no dedicated search engine
- pg-boss (PostgreSQL-backed queue) sufficient initially; Redis/BullMQ upgrade path documented
- No mobile apps; responsive web covers mobile clients

### Proposals (architectural recommendations awaiting approval)
- Next.js App Router as frontend + API in one deployable
- Prisma ORM with Prisma Migrate (dev) / reviewed SQL (prod)
- Zod for input validation; Lucide for icons
- Tailwind + in-house shadcn/ui-style primitives (no paid component library)
- Vitest + React Testing Library + Playwright for testing
- GitHub Actions for CI/CD
- Six-phase roadmap over ~22 weeks

---

## 3. Open Questions Requiring Clarification

| # | Question | Why it matters | Suggested decider | Status |
|---|---|---|---|---|
| 1 | Is the single-VPS + Docker Compose hosting model approved, or should we target Cloudflare Pages + managed Postgres (Neon/Supabase) + R2 from day one? | Affects Phase 0 setup, deployment scripts, and cost profile | Product stakeholder | Open |
| 2 | Which email provider should the integration architecture target first (SMTP, Resend, SendGrid)? | Determines adapter implementation and dev testing ability | Product stakeholder | Open |
| 3 | Is WhatsApp integration required for MVP, or is architecture-only sufficient? | Affects Phase 5 scope | Product stakeholder | Open |
| 4 | Which e-signature approach: provider (DocuSign/HelloSign-style) adapter, or simple audit-trail signature recording? | Affects Phase 2 contract scope | Product stakeholder | Open |
| 5 | Is MFA required for MVP, or is strong session auth sufficient initially? | Affects Phase 6 auth scope | Product stakeholder | Open |
| 6 | What is the expected data volume (contacts, invoices, files) to size the VPS and backup strategy? | Affects infrastructure sizing and backup design | Product stakeholder | Open |
| 7 | Are there specific regulatory requirements (GDPR, CCPA, tax jurisdictions) that change data retention or tax handling? | Affects tax settings and retention design | Product stakeholder | Open |
| 8 | Who performs design review / UI sign-off before implementation of each phase? | Ensures quality gates | Product stakeholder | Open |

---

## 4. Technical Limitations & Integration Dependencies

| Area | Limitation / Dependency | Mitigation |
|---|---|---|
| Email/WhatsApp | No provider accounts configured yet; adapters are interfaces only until credentials exist | Build adapter interface + log channel in Phase 5; wire real provider when credentials available; never fake delivery success |
| E-signatures | No provider integration in MVP | Contract status + audit trail only; provider adapter added later behind the same interface |
| Payments | No payment gateway in MVP | Manual bank transfer recording; gateway integration explicitly deferred (not in scope) |
| File storage | Object storage cost scales with volume; no egress fees on R2 but storage costs apply | Monitor R2 usage; lifecycle rules for old versions; local disk fallback in dev |
| Search | PostgreSQL full-text is adequate for record search but not full-document content search | Scope search to record metadata; document full-text search deferred |
| Auth | Custom auth means we own session security, password recovery, MFA readiness | Follow OWASP guidance; argon2id, secure cookies, CSRF, rate limiting; security review before launch |
| Hosting | Single VPS is a single point of failure | Daily pg_dump backups to R2, documented restore procedure, Docker Compose portability |

---

## 5. Security Concerns

| Concern | Risk if unaddressed | Planned control |
|---|---|---|
| Session hijacking | Unauthorized access as another user | httpOnly, Secure, SameSite cookies; short session TTL; rotation on login; CSRF double-submit |
| Privilege escalation | Employee accesses admin-only data | Server-side authorization on every route + service-layer guards; never frontend-only enforcement |
| File upload abuse | Executable served from storage, XSS via SVG, storage exhaustion | Type/size validation, store outside web root, signed URLs, no direct bucket serving |
| PII leakage to clients | Client sees another client's contact data | Organization + client scoping on every query; masking layer for contact fields |
| Audit log tampering | Undisclosed data changes | Append-only logs, actor/IP captured at middleware level, PII redacted in stored payload |
| Secrets in code | Credentials committed to Git | `.env` in .gitignore, `.env.example` committed without values, pre-commit secret scanning, CI secret scanning |
| Tax miscalculation | Agency charges tax it isn't registered for | Tax disabled by default; explicit opt-in toggle with warning copy; tax rate config UI |
| IDOR (Insecure Direct Object Reference) | Guessing URLs exposes other users' records | UUID primary keys, organization scoping, ownership checks in service layer |

---

## 6. Decisions That Could Affect Future Architecture

| Decision | Future impact | Reversibility |
|---|---|---|
| Modular monolith vs microservices now | Monolith is cheaper/simpler now; extraction later requires interface refactor but no data migration if module boundaries are clean | Medium — boundaries must be respected from day one |
| Single database schema with `organization_id` | Enables multi-tenancy later without schema rewrite; RLS can be added later | High — easy to add, hard to remove if skipped |
| Next.js API routes vs separate NestJS service | One deployable now; separate API service extractable later if team grows | Medium |
| Prisma ORM | Fast dev now; complex queries may need raw SQL escape hatch | Medium — migration to Drizzle/raw SQL is possible but costly |
| pg-boss vs Redis/BullMQ | No extra infra now; Redis upgrade path when job volume justifies it | High — both are queue abstractions behind same job interface |
| Custom auth vs third-party vendor | No per-user cost now; we own security responsibility | Medium — switching vendors later requires user migration |

---

## 7. Risk Register (Top Risks)

| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|
| Auth/security implementation error | Medium | High | Engineer | OWASP checklist, code review focused on auth, third-party security review before launch |
| Scope creep (trying to build all modules at once) | High | Medium | Engineer | Strict phase acceptance criteria; defer non-MVP items explicitly |
| Third-party provider delays (email, e-sign, payment) | Medium | Medium | Product | Architecture-first adapters; no fake behavior; integrate only when credentials available |
| Hosting cost higher than expected | Low | Low | Engineer | Start with ~€5/month VPS; monitor; documented exit path to other providers |
| Permission matrix becomes untestable | Medium | Medium | Engineer | Role-based test matrix; E2E access-control suite per phase |
| Design/development rework if UI direction rejected | Medium | Medium | Product | UI/UX blueprint approved before component implementation; design review gate per phase |

---

## 8. Acceptance Criteria for This Deliverable

- [ ] Confirmed requirements, assumptions, and proposals clearly distinguished
- [ ] Open questions listed with owners and status
- [ ] Technical limitations and integration dependencies documented without inventing capabilities
- [ ] Security concerns mapped to controls
- [ ] Future-affecting architectural decisions identified with reversibility notes
- [ ] Reviewed and approved; open questions assigned answers before dependent phases begin
