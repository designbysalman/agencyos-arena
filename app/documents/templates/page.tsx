/**
 * AgencyOS Documents - Templates List
 * Server component that lists document templates for the current organization.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listTemplates } from '@/lib/services/documents/template-service';

interface TemplateListItem {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export default async function TemplatesListPage() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const templates = await listTemplates();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground">
            Reusable templates for proposals, contracts, and documents.
          </p>
        </div>
        <Link
          href="/documents/templates/new"
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
        >
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-md border bg-background p-6 text-center">
          <h2 className="text-lg font-semibold">No templates yet</h2>
          <p className="text-muted-foreground">Create your first document template.</p>
          <Link
            href="/documents/templates/new"
            className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
          >
            Create Template
          </Link>
        </div>
      ) : (
        <div className="rounded-md border bg-background p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm">
                <th className="pb-3 font-medium text-muted-foreground">Name</th>
                <th className="pb-3 font-medium text-muted-foreground">Type</th>
                <th className="pb-3 font-medium text-muted-foreground">Created</th>
                <th className="pb-3 font-medium text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(templates as TemplateListItem[]).map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-4">
                    <Link
                      href={`/documents/templates/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-muted-foreground">{t.type}</span>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString()}
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
