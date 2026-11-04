# ADR-0003 — Infrastructure and Hosting

**Status:** Proposed  
**Deciders:** Lead architect, product stakeholder  
**Date:** 2026-11-05

## Context

The initial draft offered two conflicting hosting models (single VPS vs Cloudflare Pages + managed Postgres) without verifying limitations. Cloudflare Pages cannot run a Next.js server with background jobs or long-lived connections; Cloudflare D1 (serverless SQLite-derived) lacks full PostgreSQL transactional guarantees and relational features AgencyOS needs (FKs, complex joins, transactions for invoicing). **Neither hosting option is approved for Phase 0.** Phase 0 uses local Docker Compose only; the remote hosting decision remains open and requires stakeholder approval before any paid infrastructure is provisioned.

## Options Considered

### Option A — Single VPS + Docker Compose (documented alternative; NOT approved for Phase 0)

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

### Option B — Cloudflare-native split (Pages + Workers + D1 + R2 + Queues) (documented alternative; NOT approved for Phase 0)

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

**Phase 0 development uses local Docker Compose only.** The deployment architecture is designed to be portable (Docker Compose + PostgreSQL + pg-boss + S3-compatible storage) so it can target either a self-hosted VPS or a Cloudflare-compatible deployment later. **No paid infrastructure is provisioned or approved for Phase 0.**

The hosting decision (self-hosted VPS vs Cloudflare Pages/Workers/D1/R2) remains an open, unapproved question (see open question #1 in `docs/06_RISKS_OPEN_QUESTIONS.md`). A product stakeholder must approve any paid infrastructure before it is provisioned.

Rationale:
- Local Docker Compose lets development begin immediately with no cost and no infrastructure commitment.
- PostgreSQL with full relational integrity (FKs, transactions for invoicing) runs locally in Docker and is portable to a self-hosted VPS or managed PostgreSQL later.
- Background jobs (pg-boss) and long-lived server processes run in Docker locally; on Cloudflare Pages they are not supported, so the Cloudflare path (Option B) would require architectural rework and is not chosen for Phase 0.
- Keeping the stack in Docker Compose preserves portability to any provider without rewriting application code.

## Consequences

- Phase 0: Next.js + PostgreSQL + pg-boss run in local Docker Compose; no cloud resources provisioned.
- Next.js runs as a standard Node server (Docker), not edge-only.
- PostgreSQL is persistent in Docker locally; backed-up/restored via `pg_dump` to local disk or (optionally, after approval) to object storage.
- No Cloudflare Tunnel, VPS, or paid service is assumed or provisioned in Phase 0.
- Portability: stack movable via Docker Compose to any provider; no proprietary Cloudflare functions in application code.

## Tradeoffs Accepted

- Local development only in Phase 0; deployment to a remote host is a post-Phase-0 decision requiring approval.
- If the Cloudflare path (Option B) is later approved, the app must be re-architected around D1/Workers/Queues and pg-boss replaced.
- We manage PostgreSQL upgrades, backups, and security patching ourselves on whatever host is ultimately approved.

