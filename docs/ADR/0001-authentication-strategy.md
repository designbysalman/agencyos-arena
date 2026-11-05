# ADR-0001 — Authentication Strategy

**Status:** Proposed  
**Deciders:** Lead architect, product stakeholder  
**Date:** 2026-11-05

## Context

AgencyOS requires strong authentication and session management for internal users, secure scoped access for clients/collaborators, and secure developer access. The initial draft proposed fully custom session-based auth (bcrypt/argon2, httpOnly cookies). Fully custom auth places the entire security burden (MFA, password recovery, session fixation, credential stuffing protections, passkeys, social login) on the team and is error-prone.

## Options Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Fully custom session auth** | Hand-rolled argon2id hashing, session cookies, CSRF, MFA, recovery | Zero vendor cost, full control, portable, no lock-in | High implementation/security risk; MFA, recovery, breach monitoring all custom-built; easy to get wrong |
| **B. Maintained self-hosted library** (BetterAuth / Lucia / NextAuth.js) | Library handles sessions, hashing, MFA, OAuth, email verification, password reset; self-hosted on our DB | Community-maintained security patches, MFA/recovery out of the box, no per-user vendor cost, portable (self-hosted) | Still self-operated; must keep library updated; some vendor-specific abstractions |
| **C. Managed auth vendor** (Clerk / Auth0 / Firebase Auth) | Outsource identity entirely | Fastest to implement, MFA/recovery/social built-in, SOC2 | Per-user cost at scale, vendor lock-in, data residency concerns, conflicts with "affordable hosting" and portability goals |

## Decision

**Option B — Better Auth as the preferred maintained self-hosted authentication library**, self-hosted on the same PostgreSQL instance, using httpOnly Secure SameSite cookies.

Rationale:
- Better Auth is a maintained, TypeScript-native library with sessions, hashing (argon2id), MFA (TOTP), OAuth, email verification, and password recovery built in.
- Balances security (community-maintained, MFA/password recovery/OAuth out of the box) with affordability (no per-user vendor fees) and portability (self-hosted, can migrate off).
- Avoids the high risk of fully custom auth while avoiding vendor lock-in and per-user pricing of managed auth.
- Library is a dependency, not copied proprietary code; satisfies "secure dependency management."

**Pre-implementation checks (required before Phase 0 auth work):**
- Verify Better Auth compatibility with the Next.js App Router + PostgreSQL + Prisma stack targeted in ADR-0003.
- Review current security advisories and maintenance cadence for Better Auth.
- Confirm cookie/session primitives (httpOnly, Secure, SameSite, short TTL, rotation) can be enforced through Better Auth + our middleware.
- If Better Auth fails any compatibility or security check, fall back to Option B generic (Lucia/NextAuth.js) and record the rationale in an ADR revision.

## Coverage Requirements

| Requirement | How it is met |
|---|---|
| Strong authentication | Library-managed hashing (argon2id/scrypt), secure session cookies |
| Session management | httpOnly, Secure, SameSite=Strict/Lax, short TTL, rotation on login, revocation on logout/password change |
| MFA | TOTP via library; optional per-user enforcement |
| Password recovery | Library-managed reset tokens with expiry + rate limiting |
| Client access | Scoped client accounts linked to organization; portal-only permissions; no internal API access |
| Developer access | Secure developer workspace behind admin gate + audit log; no bypass of RBAC; impersonation (if ever added) fully audited |
| Secrets management | Library config via env vars only; no secrets in Git; `.env.example` committed without values |
| Rate limiting | Per-IP + per-user on auth endpoints |
| Audit logging | All auth events (login, logout, MFA, reset, role change) written to append-only audit_logs |

## Tradeoffs Accepted

- We operate and patch the auth library ourselves (CVE monitoring required).
- Managed auth (Option C) is a supported future migration path if per-user cost becomes acceptable.
- Fully custom auth (Option A) is rejected for the initial implementation; may only be revisited with a documented security review.

## Consequences

- Auth tables (`users`, `sessions`, `verification_tokens`, `mfa_codes`, etc.) owned by the library schema or mirrored in our Prisma schema.
- All auth routes go through library handlers + our middleware for org-scoping and permission checks.
- Custom auth code is minimized to middleware and organization-scoping guards.
