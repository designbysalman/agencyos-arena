# AgencyOS — Planning Deliverables

This folder contains the Stage 1 planning deliverables for AgencyOS (see [master development instructions](https://github.com/designbysalman/agencyos-arena)). No application code has been written yet. Implementation begins only after these materials are reviewed and approved.

## Deliverables

| # | File | Content | Status |
|---|------|---------|--------|
| 1 | `01_PRODUCT_BLUEPRINT.md` | Product vision, user types, core workflows, module relationships, functional requirements; Initial/Later/Optional scope classification | Revised |
| 2 | `02_ARCHITECTURE_PROPOSAL.md` | Technology stack, system architecture, database strategy, module boundaries, API approach, hosting, security model | Revised |
| 3 | `03_UI_UX_BLUEPRINT.md` | Design system, component library, screen inventory, responsive behavior, user journeys, accessibility, review checkpoints | Revised |
| 4 | `04_DATABASE_PERMISSION_STRATEGY.md` | Core entities, relationships, integrity, transactional finance, idempotency, audit, retention, RBAC + resource-scoped permissions, access-control tests | Revised |
| 5 | `05_PHASED_ROADMAP.md` | 6 phases (~22 weeks, provisional), milestones, quality gates, launch review, deferred capabilities | Revised |
| 6 | `06_RISKS_OPEN_QUESTIONS.md` | Open questions, limitations, integration dependencies, security concerns, confirmed vs assumed vs proposed | Revised |
| 7 | `07_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Every master-spec feature mapped to module, phase, dependencies, acceptance criteria, status | New |

## Architecture Decision Records (`docs/ADR/`)

| ADR | Title | Status |
|-----|-------|--------|
| 0001 | Authentication Strategy (maintained self-hosted library vs custom vs managed vendor) | Proposed |
| 0002 | Background Jobs and Queue (pg-boss vs Redis/BullMQ vs Cloudflare Queues) | Proposed |
| 0003 | Infrastructure and Hosting (VPS + Docker vs Cloudflare Pages/D1/Workers) | Proposed |
| 0004 | Permission Architecture (RBAC + resource-scoped; org scoping; client isolation; developer access; access-control tests) | Proposed |
| 0005 | Database Strategy (integrity, org scoping, transactional finance, idempotency, audit, retention, secure migrations) | Proposed |
| 0006 | UI Framework and Design System (Next.js + Tailwind + Radix + Lucide; tokens; accessibility) | Proposed |

## How to proceed

1. Review the deliverables and ADRs above.
2. Request changes or confirm approval (per deliverable or all at once).
3. Once approved, implementation begins with Phase 0 (Foundation & Infrastructure) under a feature branch and pull request workflow — never directly on `main`.

## Repository state

- Branch: `arena/56716fe0-agencyos-arena` (active; PR #1 open)
- Last commit: planning deliverables (initial draft)
- Working tree: clean
- Contents: README.md, .gitignore, /docs (planning only — no application code yet)
