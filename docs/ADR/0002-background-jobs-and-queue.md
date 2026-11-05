# ADR-0002 — Background Jobs and Queue

**Status:** Proposed  
**Deciders:** Lead architect  
**Date:** 2026-11-05

## Context

AgencyOS needs background jobs for invoice overdue processing, email dispatch, workflow rule execution, PDF generation, exports, and backups. The initial draft proposed pg-boss (PostgreSQL-backed), then mentioned Redis/BullMQ as an upgrade path. This contradicted itself and did not account for hosting constraints.

## Options Considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. pg-boss (PostgreSQL-backed queue)** | Jobs stored in Postgres tables; no extra infra | No extra service to operate/pay; simple; ACID job storage | Lower throughput than Redis; Postgres holds job locks; not ideal for very high volume |
| **B. Redis + BullMQ** | Redis-backed job queue | Mature, high throughput, delayed jobs, retries, concurrency | Extra service to operate, back up, patch, and pay for; operational complexity |
| **C. Cloudflare Queues + Workers** | Serverless queue (if on Cloudflare) | Managed, scales | Only available on Cloudflare platform; Next.js on Cloudflare Pages cannot run long-lived workers; requires architectural split |

## Hosting Constraint (Cross-reference ADR-0003)

AgencyOS Phase 0 targets a single VPS running Docker Compose (Next.js server + PostgreSQL). Next.js on **Cloudflare Pages** cannot run background workers or long-lived server processes, and Cloudflare D1 has limitations for relational transactions. Therefore a queue that requires a separate long-lived process (Redis) or one that runs on PostgreSQL (pg-boss) are both viable on a VPS.

## Decision

**Option A — pg-boss (PostgreSQL-backed queue) for Phase 0**, with Redis + BullMQ as a documented, reversible upgrade path if job volume justifies it.

Rationale:
- No extra infrastructure to operate, back up, or pay for — consistent with affordable initial hosting.
- Runs inside the same Docker Compose stack as PostgreSQL; zero additional moving parts.
- Sufficient for agency-scale job volume (invoices, emails, workflows, exports).
- Migration path to Redis/BullMQ is straightforward because job definitions are decoupled from the queue implementation.

## Consequences

- Job tables live inside PostgreSQL; backed up with the database.
- Background job processor runs as part of the Next.js app (or a lightweight worker container sharing the same image) in the VPS stack.
- If we later move to Cloudflare Pages/Workers, this decision must be revisited (ADR-0003) because Pages cannot host pg-boss or a long-lived worker.

## Tradeoffs Accepted

- Lower maximum throughput than Redis; acceptable for single-agency scale.
- Postgres connection pool shared between app and job consumer; pool sizing must be monitored.
- Upgrade to Redis/BullMQ is a future phase, not a blocker.
