/**
 * AgencyOS middleware (ADR-0004).
 *
 * Phase 0: Server-side session validation for protected routes.
 * Validates the Better Auth session token on every request to protected
 * paths. Unauthorized users cannot access protected resources even if they
 * manually craft a fake cookie - the session is verified against Better Auth.
 *
 * Authorization (role-based, resource-level) is enforced in API route
 * handlers and the service layer (see lib/permissions.ts).
 */

import { auth } from '@/lib/auth';
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

  // Validate session via Better Auth - reads the encrypted session cookie
  // and verifies it against the server-side session store.
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session');

  if (!sessionCookie) {
    // No session cookie -> redirect to login for protected app routes
    if (PROTECTED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Verify the session token is valid by calling Better Auth's session API
  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: cookieStore.toString(),
      },
    });

    if (!session) {
      // Session cookie exists but is invalid/expired -> redirect to login
      if (PROTECTED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }

    // Valid session -> allow request
    return NextResponse.next();
  } catch {
    // Session validation failed -> redirect to login for protected routes
    if (PROTECTED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }
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
