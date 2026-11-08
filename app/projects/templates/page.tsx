/**
 * AgencyOS Project Templates page.
 * Lists project templates for the current organization.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function listTemplates() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/projects/templates`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function ProjectTemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Project Templates</h1>
        <Link
          href="/projects/templates/new"
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
        >
          New Template
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 font-medium text-right">Created</th>
              <th className="pb-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(
              templates as Array<{
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
              }>
            ).length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  No templates found. Create a template to get started.
                </td>
              </tr>
            ) : (
              (
                templates as Array<{
                  id: string;
                  name: string;
                  description: string | null;
                  createdAt: Date;
                }>
              ).map((template) => (
                <tr key={template.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 font-medium">
                    <Link
                      href={`/projects/templates/${template.id}`}
                      className="text-accent hover:underline"
                    >
                      {template.name}
                    </Link>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {template.description ?? '—'}
                  </td>
                  <td className="py-4 text-right text-sm text-muted-foreground">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/projects/templates/${template.id}/edit`}
                      className="text-sm text-accent hover:underline mr-2"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
