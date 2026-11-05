# Deliverable 6 — Risks & Open Questions (Revised)

**Status:** Revised — awaiting review  
**Repository:** `designbysalman/agencyos-arena`  
**Branch:** `arena/56716fe0-agencyos-arena`  
**Supersedes:** Initial planning draft (PR #1)

---

## 1. Confirmed Requirements vs Assumptions vs Proposals

### Confirmed requirements (from AgencyOS master brief, non-negotiable)
All items in the master specification are preserved in the Requirements Traceability Matrix (`docs/07_REQUIREMENTS_TRACEABILITY_MATRIX.md`) with Initial / Later / Optional status. None are silently excluded.

Key confirmed requirements:
- Single-agency internal platform with controlled client/collaborator portal access
- Architecture supports future multi-tenant SaaS without rewrite
- TypeScript-first; modular monolith; avoid microservice complexity
- PostgreSQL; database migrations
- Light/dark themes; design tokens; reusable components
- Canvas `#F8F9FA`, primary text `#111827`, primary accent `#047857`
- Responsive desktop/tablet/mobile; accessible navigation and controls
- Loading, empty, error, success states on all screens
- Strong authentication and session management; least privilege; server-side authorization
- Input validation; protection against common web vulnerabilities; secure upload handling
- Secrets management; audit trails; data isolation; rate limiting
- No credentials/tokens/passwords/secrets in Git
- Affordable initial hosting; Cloudflare preferred when suitable; portability; no unverified free/scalable claims
- Invoicing without integrated payment gateway; manual bank transfers and payment recording
- Tax configuration does NOT automatically assume sales-tax registration
- Real functionality only; no fake backend integrations; temporary mocks documented
- No commercial multi-tenant billing system in initial implementation
- Planning deliverables under `/docs/`

### Assumptions (working beliefs, not yet confirmed)
- One full-time engineer; estimates in roadmap reflect that
- Phase 0 runs on local Docker Compose (Next.js + PostgreSQL + pg-boss); no cloud resources provisioned; remote hosting decision open and unapproved
- Cloudflare R2 for object storage; email via SMTP/Resend-style provider
- Maintained self-hosted auth library (BetterAuth/Lucia) rather than fully custom or managed vendor
- PostgreSQL full-text search sufficient initially
- pg-boss sufficient initially; Redis/BullMQ upgrade path documented

### Proposals (architectural recommendations awaiting approval)
- ADR-0001…0006 decisions; Next.js App Router; Prisma; Zod; Radix UI; Lucide; Vitest/Playwright; GitHub Actions
- Six-phase roadmap (~22 weeks, provisional)

---

## 2. Open Questions Requiring Clarification

| # | Question | Why it matters | Suggested decider | Status |
|---|---|---|---|---|
| 1 | Is single-VPS + Docker Compose approved, or target Cloudflare Pages + Workers + D1 + R2 from day one? | Affects Phase 0 setup, deployment, cost | Product stakeholder | Open |
| 2 | Which email provider for the integration architecture first (SMTP, Resend, SendGrid)? | Determines adapter implementation and dev testing | Product stakeholder | Open |
| 3 | Is WhatsApp integration required for MVP, or architecture-only sufficient? | Affects Phase 5 scope | Product stakeholder | Open |
| 4 | Which e-signature approach: provider adapter (DocuSign/HelloSign-style) or simple audit-trail signature recording? | Affects Phase 2 contract scope | Product stakeholder | Open |
| 5 | Is MFA required for MVP, or strong session auth sufficient initially? | Affects Phase 0/6 auth scope | Product stakeholder | Open |
| 6 | Expected data volume (contacts, invoices, files) to size VPS and backups? | Affects infrastructure sizing | Product stakeholder | Open |
| 7 | Specific regulatory requirements (GDPR, CCPA, tax jurisdictions) changing retention or tax handling? | Affects tax settings and retention design | Product stakeholder | Open |
| 8 | Who performs design review / UI sign-off before each phase implementation? | Ensures quality gates | Product stakeholder | Open |
| 9 | Which maintained auth library: BetterAuth, Lucia, or NextAuth.js? | Affects Phase 0 implementation and MFA/recovery coverage | Lead architect | Open |

---

## 3. Technical Limitations & Integration Dependencies

| Area | Limitation / Dependency | Mitigation |
|---|---|---|
| Email/WhatsApp | No provider accounts configured; adapters are interfaces until credentials exist | Build adapter interface + log channel in Phase 5; wire real provider when credentials available; never fake delivery success |
| E-signatures | No provider integration in MVP | Contract status + audit trail only; provider adapter later behind same interface |
| Payments | No payment gateway in MVP | Manual bank transfer recording; gateway integration explicitly deferred |
| File storage | Object storage cost scales with volume; R2 first 10 GB free | Monitor R2 usage; lifecycle rules; local disk fallback in dev |
| Search | PostgreSQL full-text adequate for record search, not full-document search | Scope search to record metadata; document full-text search deferred |
| Auth | Self-hosted library means we own patching/upgrades | CVE monitoring; keep library updated; security review before launch |
| Hosting | Single VPS is a single point of failure | Daily pg_dump to R2; documented restore; Docker Compose portability |

---

## 4. Security Concerns & Controls

| Concern | Risk if unaddressed | Planned control |
|---|---|---|
| Session hijacking | Unauthorized access as another user | httpOnly, Secure, SameSite cookies; short TTL; rotation on login; CSRF double-submit |
| Privilege escalation | Employee accesses admin-only data | Server-side authorization on every route + service-layer guards |
| File upload abuse | Executable served from storage, XSS via SVG, storage exhaustion | Type/size validation; outside web root; signed URLs; no direct bucket serving |
| PII leakage to clients | Client sees another client's contact data | Org + client scoping on every query; masking at serialization layer |
| Audit log tampering | Undisclosed data changes | Append-only logs; actor/IP at middleware; PII redacted in stored payload |
| Secrets in code | Credentials committed to Git | `.env` in .gitignore; `.env.example` without values; pre-commit secret scanning; CI secret scanning |
| Tax miscalculation | Agency charges tax it isn't registered for | Tax disabled by default; explicit opt-in toggle with warning copy |
| IDOR | Guessing URLs exposes other users' records | UUID primary keys; org scoping; ownership checks in service layer |

---

## 5. Decisions That Could Affect Future Architecture

| Decision | Future impact | Reversibility |
|---|---|---|
| Modular monolith vs microservices now | Cheaper/simpler now; extraction later requires interface refactor, no data migration if boundaries clean | Medium — boundaries must be respected from day one |
| Single schema with `organization_id` | Enables multi-tenancy later without schema rewrite; RLS can be added later | High — easy to add |
| Next.js API routes vs separate service | One deployable now; separate API service extractable later | Medium |
| Prisma ORM | Fast dev now; complex queries may need raw SQL | Medium |
| pg-boss vs Redis/BullMQ | No extra infra now; Redis upgrade path when volume justifies | High |
| Custom auth → maintained library (ADR-0001) | Community-maintained security; self-operated; portable | Medium — migration possible but costly |
| VPS + Docker (ADR-0003) vs Cloudflare-native | Affordable, portable, PostgreSQL + background jobs; Cloudflare path requires re-architecture | Medium |

---

## 6. Risk Register (Top Risks)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Auth/security implementation error | Medium | High | Maintained library (ADR-0001); OWASP checklist; code review; security review before launch |
| Scope creep (all modules at once) | High | Medium | Strict phase acceptance criteria; defer non-MVP items explicitly |
| Third-party provider delays (email, e-sign, payment) | Medium | Medium | Architecture-first adapters; no fake behavior; integrate when credentials available |
| Hosting cost higher than expected | Low | Low | Phase 0 uses local Docker (zero cost); any remote host selected only after stakeholder approval and cost verification |
| Permission matrix untestable | Medium | Medium | Role-based test matrix; E2E access-control suite per phase |
| Design direction rejected | Medium | Medium | UI/UX blueprint approved before components; design review gate per phase |

---

## 7. Acceptance Criteria for This Deliverable

- [ ] Confirmed requirements, assumptions, proposals clearly distinguished
- [ ] Open questions listed with owners and status
- [ ] Technical limitations and integration dependencies documented without inventing capabilities
- [ ] Security concerns mapped to controls
- [ ] Future-affecting architectural decisions identified with reversibility notes
- [ ] Reviewed and approved; open questions assigned answers before dependent phases begin
