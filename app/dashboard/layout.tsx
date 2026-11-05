/**
 * AgencyOS dashboard root layout.
 *
 * Wraps the session validator in a React Suspense boundary so that
 * request-time data access (cookies(), auth.api.getSession()) inside
 * SessionValidator is permitted during Next.js prerendering (Next.js 16).
 *
 * Session validation itself runs in the Node.js server runtime via
 * SessionValidator - it is not moved to the client and no session data
 * is cached across users.
 */

import { Suspense } from 'react';
import SessionValidator from './session-validator';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading session...</div>}>
      <SessionValidator>{children}</SessionValidator>
    </Suspense>
  );
}
