/**
 * AgencyOS middleware (ADR-0004).
 *
 * Phase 0: Lightweight session gating for protected routes.
 * Full database-backed authorization happens in API route handlers and
 * service layer (see lib/permissions.ts). The middleware only checks for
 * an active Better Auth session cookie; it does not import Prisma or
 * the auth library, so it works without prisma generate.
 *
 * Authorization is server-side only; the frontend never enforces authorization.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/register', '/api/auth', '/api/health'];

// Paths that require authentication (protected app routes)
const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/crm',
  '/finance',
  '/projects',
  '/automation',
  '/admin',
  '/settings',
];

export async function middleware(request: Request) {
  const { pathname } = new URL(request.url);

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session');

  // No session -> redirect to login for protected app routes
  if (!sessionCookie) {
    if (PROTECTED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
