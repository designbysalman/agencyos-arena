/**
 * AgencyOS Documents - Shareable Links
 * Server component that lists shareable document links for the current organization.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { listDocumentLinks } from '@/lib/services/documents/link-service';

interface DocumentLinkListItem {
  id: string;
  organizationId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  token: string;
  url: string;
  expiresAt: Date;
  accessCount: number;
  maxAccess: number | null;
  createdAt: Date;
}

export default async function DocumentLinksPage() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const links = await listDocumentLinks();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shared Document Links</h1>
          <p className="text-muted-foreground">
            Token-based, time-bound links for sharing documents with clients.
          </p>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="rounded-md border bg-background p-6 text-center">
          <h2 className="text-lg font-semibold">No shared links</h2>
          <p className="text-muted-foreground">Create shareable links from the documents page.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-background p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm">
                <th className="pb-3 font-medium text-muted-foreground">Document</th>
                <th className="pb-3 font-medium text-muted-foreground">Link</th>
                <th className="pb-3 font-medium text-muted-foreground">Expires</th>
                <th className="pb-3 font-medium text-muted-foreground">Access</th>
                <th className="pb-3 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {(links as DocumentLinkListItem[]).map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-4">
                    <span className="text-sm">{l.documentTitle}</span>
                    <br />
                    <span className="text-xs text-muted-foreground">{l.documentType}</span>
                  </td>
                  <td className="py-4">
                    <code className="text-xs text-accent break-all">{l.token}</code>
                  </td>
                  <td className="py-4 text-sm">
                    {new Date(l.expiresAt).toLocaleString()}
                    {new Date(l.expiresAt) < new Date() ? (
                      <span className="text-red-600 text-xs ml-2">Expired</span>
                    ) : null}
                  </td>
                  <td className="py-4 text-sm">
                    {l.accessCount}
                    {l.maxAccess !== null ? ` / ${l.maxAccess}` : ''}
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
