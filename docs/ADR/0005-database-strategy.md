# ADR-0005 — Database Strategy

**Status:** Proposed  
**Deciders:** Lead architect  
**Date:** 2026-11-05

## Context

AgencyOS needs a relational schema covering relationship integrity, organization scoping, transactional financial operations, idempotency, audit logging, retention, and secure migrations. The initial draft listed tables but did not specify integrity constraints, financial transaction boundaries, idempotency, or migration safety.

## Decision

**PostgreSQL as the single source of truth**, self-hosted on the VPS (ADR-0003), accessed via Prisma ORM with reviewed SQL migrations. Every business entity table carries `organization_id` from day one.

## Schema Design Principles

| Principle | Implementation |
|---|---|
| Organization scoping | `organization_id` UUID NOT NULL on every business table; FK to `organizations` |
| Relationship integrity | Foreign keys with `ON DELETE CASCADE`/`RESTRICT` as appropriate; no orphaned records |
| Soft deletes | `deleted_at` timestamp on entities requiring history (invoices, contracts, projects); hard delete only for transient data |
| Timestamps | `created_at`, `updated_at` on every table |
| Audit trail | Append-only `audit_logs` table: actor, action, entity_type, entity_id, before/after (PII-redacted), metadata, timestamp, IP |
| Idempotency | `idempotency_key` unique constraint on write endpoints (invoice creation, payments); rejected on duplicate |
| Transactional finance | Invoice creation + payment application + balance update in a single DB transaction |
| Custom fields | `custom_fields` (definitions, JSON config) + `custom_field_values` (JSONB values per entity) |
| Retention | Retention config per org; archival/deletion jobs for audit logs, communication history, soft-deleted records |
| Migrations | Prisma schema is source of truth; migration SQL in `/prisma/migrations`; prod migrations reviewed in PR, never auto-applied |

## Transactional Financial Operations

Invoice/payment mutations run in a single transaction:
1. Insert invoice + line items.
2. Compute subtotal/tax/total atomically.
3. Record payment and update invoice balance/status in the same transaction.
4. Emit `invoice.paid` / `invoice.overdue` events after commit.

If any step fails, the entire transaction rolls back — no partial financial state.

## Idempotency

Write endpoints accept `Idempotency-Key` header. The key + user/org is stored with a unique constraint. Duplicate requests with the same key return the cached result without re-executing. Prevents double invoicing or double payment recording on retry.

## Audit Logging & Redaction

- All mutations to business entities are logged in `audit_logs`.
- `before`/`after` payloads redact email, phone, tax IDs, and payment details before storage.
- Audit logs are append-only; soft-deleted but never purged except via retention job.

## Retention & Data Lifecycle

- Retention settings per org control how long audit logs, communication history, and soft-deleted records are retained.
- Background job (pg-boss) enforces retention: anonymize or delete records past retention window.
- Export (JSON/CSV) available per org for data portability.

## Migrations

- Dev: `prisma migrate dev`.
- Prod: generated migration SQL reviewed in PR; applied manually via `prisma migrate deploy` during deployment.
- No auto-migration on app startup in production.
- Seed scripts are development-only, clearly marked, never run in production without review.

## Tradeoffs Accepted

- Prisma abstraction may leak for complex queries; raw SQL escape hatch documented.
- Self-hosted PostgreSQL means we manage backups, upgrades, and security patching.
- pg-boss job tables share the database; connection pool sized accordingly.
