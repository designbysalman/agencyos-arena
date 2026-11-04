# ADR-0003 — Infrastructure and Hosting

**Status:** Proposed  
**Deciders:** Lead architect, product stakeholder  
**Date:** 2026-11-05

## Context

The initial draft offered two conflicting hosting models (single VPS vs Cloudflare Pages + managed Postgres) without verifying limitations. Cloudflare Pages cannot run a Next.js server with background jobs or long-lived connections; Cloudflare D1 (serverless SQLite-derived) lacks full PostgreSQL transactional guarantees and relational features AgencyOS needs (FKs, complex joins, transactions for invoicing). We must resolve Docker vs Cloudflare, pg-boss vs Redis, and persistent PostgreSQL requirements.

## Options Considered

### Option A — Single VPS + Docker Compose (Recommended for Phase 0)

Stack: Next.js (node server) + PostgreSQL + pg-boss + optional MinIO/local storage, fronted by Cloudflare Tunnel for HTTPS/remote access.

| Item | Choice | Verified pricing (approx.) |
|---|---|---|
| Compute | Hetzner CX11 (1 vCPU, 2 GB RAM) or equivalent | ~€5.17/month |
| Database | Self-hosted PostgreSQL in Docker | included in VPS |
| Object storage | Cloudflare R2 (S3-compatible) or local disk | R2: first 10 GB/mo free, then $0.015/GB |
| Remote access / HTTPS | Cloudflare Tunnel | Free |
| DNS / CDN | Cloudflare (free tier) | Free |
| Backups | Daily pg_dump to R2 | R2 storage only |
| Email | SMTP provider (Resend/SendGrid/SMTP relay) | Resend free tier (100 emails/day) |

**Estimated monthly cost:** ~€5–7 (VPS dominates).  
**Portability:** Docker Compose + PostgreSQL + S3-compatible storage; movable to any VPS/provider.  
**Operational risk:** Single point of failure; mitigated by daily pg_dump backups and documented restore procedure.

### Option B — Cloudflare-native split (Pages + Workers + D1 + R2 + Queues)

| Item | Choice | Verified pricing (approx.) |
|---|---|---|
| Frontend | Cloudflare Pages | Free |
| API / Workers | Cloudflare Workers (Unbound) | $5/month |
| Database | Cloudflare D1 | $5/month (worker database); 0.5 GB storage free tier hibernates |
| Object storage | Cloudflare R2 | First 10 GB free |
| Queue | Cloudflare Queues | Free tier limited |

**Estimated monthly cost:** ~$0–10 within free/low tiers.  
**Limitations:** D1 is not PostgreSQL (no full relational guarantees, limited JOINs/transactions); Workers have execution time limits; Pages cannot run background jobs; Next.js on Pages requires edge-compatible builds (limits some Node APIs).  
**Portability:** Higher Cloudflare lock-in (D1, Queues, Workers bindings are proprietary).

## Decision

**Option A — Single VPS + Docker Compose as Phase 0 primary**, with Cloudflare Tunnel for secure remote access and Cloudflare as DNS/CDN edge.

Rationale:
- Persistent PostgreSQL with full relational integrity (FKs, transactions for invoicing) is required and most simply self-hosted on a VPS.
- Background jobs (pg-boss) and long-lived server processes are impossible on Cloudflare Pages.
- Single VPS at ~€5/month is the most affordable, predictable, and portable option for a single-agency MVP.
- Cloudflare Tunnel provides secure remote access without opening inbound ports; Cloudflare free tier provides CDN/DNS.

Cloudflare-native (Option B) remains a **documented alternative** for later phases if the team wants to offload operations, but requires re-architecting around D1/Workers/Queues and is not chosen for Phase 0.

## Consequences

- Next.js runs as a standard Node server (Docker), not edge-only.
- PostgreSQL is persistent, self-hosted, backed up daily to R2.
- Cloudflare Tunnel is the secure remote-access layer; no open inbound ports on the VPS except Tunnel outbound.
- Portability: stack movable via Docker Compose to any provider; no proprietary Cloudflare functions in application code.

## Tradeoffs Accepted

- Single VPS is a single point of failure; mitigated by backups + documented recovery.
- We manage PostgreSQL upgrades, backups, and security patching ourselves.
- Cloudflare D1/Workers path deferred; not a blocker.
