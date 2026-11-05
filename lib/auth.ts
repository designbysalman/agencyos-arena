/**
 * AgencyOS authentication - re-exports (ADR-0001).
 *
 * Server-only: re-exports the Better Auth instance with Prisma adapter.
 * Client components should import from @/lib/auth-client instead.
 */

import { auth } from '@/lib/auth-server';
import type { Session } from '@/lib/auth-server';

export { auth };
export type { Session };
