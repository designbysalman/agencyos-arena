/**
 * AgencyOS authentication routes (Better Auth).
 *
 * Handles: sign-up, sign-in, sign-out, session, password reset, MFA, etc.
 * No external provider credentials required for local development.
 * See ADR-0001 for the authentication strategy.
 */

import { auth } from '@/lib/auth';

const GET = (request: Request) => auth.handler(request);
const POST = (request: Request) => auth.handler(request);
const PUT = (request: Request) => auth.handler(request);
const DELETE = (request: Request) => auth.handler(request);
const PATCH = (request: Request) => auth.handler(request);

export { GET, POST, PUT, DELETE, PATCH };
