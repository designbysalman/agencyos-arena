/**
 * AgencyOS Proposals page.
 * Server component that lists proposals for the current organization.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listProposals } from '@/lib/services/proposals/proposal-service';

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const page = Math.max(1, parseInt(String(searchParams.page ?? '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(searchParams.pageSize ?? '20'), 10)));
  const search = String(searchParams.search ?? '');
  const status = String(searchParams.status ?? '');

  const { proposals, total, totalPages } = await listProposals({
    page,
    pageSize,
    search: search || undefined,
    status: status || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    includeDeleted: false,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Proposals</h1>
        <Link
          href="/proposals/new"
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
        >
          New Proposal
        </Link>
      </div>

      <form className="flex flex-col sm:flex-row gap-2 max-w-2xl" action="">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search proposals by title, client, status..."
          className="flex-1 border border-input rounded-md px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Filter
        </button>
        {(search || status) && (
          <Link
            href="/proposals"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80 ml-2"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Number</th>
              <th className="pb-3 font-medium">Title</th>
              <th className="pb-3 font-medium">Client</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Currency</th>
              <th className="pb-3 font-medium text-right">Total</th>
              <th className="pb-3 font-medium w-24">Valid Until</th>
              <th className="pb-3 font-medium w-24">Created</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  No proposals found. Create a proposal to get started.
                </td>
              </tr>
            ) : (
              proposals.map(
                (prop: {
                  id: string;
                  proposalNumber: string | null;
                  title: string;
                  clientName: string | null;
                  clientEmail: string | null;
                  status: string;
                  total: string | null;
                  currency: string;
                  validUntil: Date | null;
                  createdAt: Date;
                }) => (
                  <tr key={prop.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 font-medium">
                      <Link href={`/proposals/${prop.id}`} className="text-accent hover:underline">
                        {prop.proposalNumber ?? '—'}
                      </Link>
                    </td>
                    <td className="py-4">
                      <Link href={`/proposals/${prop.id}`} className="text-accent hover:underline">
                        {prop.title}
                      </Link>
                    </td>
                    <td className="py-4 text-sm">
                      {prop.clientName ? (
                        <>
                          {prop.clientName}
                          {prop.clientEmail ? (
                            <span className="block text-xs text-muted-foreground mt-1">
                              {prop.clientEmail}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${
                          prop.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : prop.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : prop.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : prop.status === 'draft'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {prop.status}
                      </span>
                    </td>
                    <td className="py-4">{prop.currency}</td>
                    <td className="py-4 text-right text-sm font-medium">
                      {prop.total ? `${prop.currency} ${Number(prop.total).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {prop.validUntil ? new Date(prop.validUntil).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {new Date(prop.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Page {page} of {totalPages} ({total} total)
        </div>
      )}
    </div>
  );
}
