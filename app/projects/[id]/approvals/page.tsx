/**
 * AgencyOS Project Approvals page.
 * Lists approvals for a project and provides create/approve actions.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function listApprovals(projectId: string) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const res = await fetch(`/api/v1/projects/approvals?projectId=${encodeURIComponent(projectId)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function ProjectApprovalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const approvals = await listApprovals(id);

  const cookieStore = await cookies();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Client Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Manage client sign-off and approval decisions for this project.
          </p>
        </div>
        <Link
          href={`/projects/${id}`}
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Back to Project
        </Link>
      </div>

      <div className="rounded-md border bg-background p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Record Approval</h2>
        <form className="space-y-4" action="">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact ID</label>
              <input
                type="text"
                name="contactId"
                placeholder="Client contact CUID (optional)"
                className="border border-input rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                className="border border-input rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="changes_requested">Changes Requested</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Feedback</label>
            <textarea
              name="feedback"
              rows={2}
              placeholder="Client feedback or notes..."
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
            onClick={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              fetch(`/api/v1/projects/approvals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', cookie: cookieStore.toString() },
                body: JSON.stringify({
                  projectId: id,
                  contactId: (formData.get('contactId') as string) || undefined,
                  status: formData.get('status'),
                  feedback: (formData.get('feedback') as string) || undefined,
                }),
              }).then(() => window.location.reload());
            }}
          >
            Record Approval
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Contact</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Feedback</th>
              <th className="pb-3 font-medium text-right">Approved At</th>
              <th className="pb-3 font-medium text-right">Created</th>
              <th className="pb-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(
              approvals as Array<{
                id: string;
                status: string;
                feedback: string | null;
                contact: {
                  firstName: string | null;
                  lastName: string;
                  email: string | null;
                } | null;
                creator: { name: string | null } | null;
                approvedAt: Date | null;
                createdAt: Date;
              }>
            ).length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No approvals found. Record an approval decision to get started.
                </td>
              </tr>
            ) : (
              (
                approvals as Array<{
                  id: string;
                  status: string;
                  feedback: string | null;
                  contact: {
                    firstName: string | null;
                    lastName: string;
                    email: string | null;
                  } | null;
                  creator: { name: string | null } | null;
                  approvedAt: Date | null;
                  createdAt: Date;
                }>
              ).map((approval) => (
                <tr key={approval.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 font-medium">
                    {approval.contact
                      ? `${approval.contact.firstName ?? ''} ${approval.contact.lastName}`.trim()
                      : approval.creator?.name || 'System'}
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${
                        approval.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : approval.status === 'changes_requested'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {approval.status}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">{approval.feedback ?? '—'}</td>
                  <td className="py-4 text-right text-sm text-muted-foreground">
                    {approval.approvedAt ? new Date(approval.approvedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-4 text-right text-sm text-muted-foreground">
                    {new Date(approval.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/projects/approvals/${approval.id}`}
                      className="text-sm text-accent hover:underline"
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
