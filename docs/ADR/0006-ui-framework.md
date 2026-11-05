# ADR-0006 — UI Framework and Design System

**Status:** Proposed  
**Deciders:** Lead architect, UI/UX design director  
**Date:** 2026-11-05

## Context

AgencyOS requires excellent UI/UX, responsive desktop/tablet/mobile, light/dark themes, centralized design tokens, reusable components, and comprehensive loading/empty/error/success states. The initial draft proposed Tailwind + in-house primitives but did not specify component primitives, accessibility, or screen inventory.

## Decision

**Next.js App Router + Tailwind CSS + headless primitives (Radix UI) + Lucide React icons**, with an in-house design system layer.

Rationale:
- Next.js App Router provides routing, SSR, and API routes in one deployable (consistent with ADR-0003 VPS stack).
- Tailwind + design tokens (`#F8F9FA` canvas, `#111827` text, `#047857` accent) gives centralized theming with dark mode support.
- Radix UI primitives (dialog, dropdown, select, tabs, popover, tooltip) provide accessible, unstyled behavior; we style them to our design system — no paid component library, no vendor lock-in.
- Lucide React: clean, tree-shakeable, consistent iconography.
- Accessibility: keyboard navigation, visible focus states, ARIA labels, ≥44px touch targets, `prefers-reduced-motion` support.

## Design Tokens (confirmed)
- Main canvas: `#F8F9FA`
- Primary text: `#111827`
- Primary accent: `#047857`
- Spacing: 4px-based scale
- Border radius: 6px default / 8px cards / 12px modals
- Transitions: 150–250ms ease-out; light/dark themes via CSS variables

## Tradeoffs Accepted

- Building our own component layer requires more upfront work than adopting a paid design system, but avoids lock-in and licensing cost.
- Radix primitives add a dependency; maintained and accessible.
