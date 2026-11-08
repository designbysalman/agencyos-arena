/**
 * AgencyOS Documents - Contracts List
 * Server component that lists contracts for the current organization.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listContracts } from '@/lib/services/documents/contract-service';

interface ContractListItem {
  id: string;
  organizationId: string;
  proposalId: string | null;
  projectId: string | null;
  title: string;
  status: string;
  signatureReference: string | null;
  signedAt: Date | null;
  signedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  proposal: { id: string; number: string; title: string; status: string } | null;
  project: { id: string; name: string; status: string } | null;
  signer: { id: string; name: string | null; email: string | null } | null;
}

export default async function ContractsListPage() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const contracts = await listContracts();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-muted-foreground">
            Manage contracts linked to proposals and projects.
          </p>
        </div>
        <Link
          href="/documents/contracts/new"
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
        >
          New Contract
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-md border bg-background p-6 text-center">
          <h2 className="text-lg font-semibold">No contracts yet</h2>
          <p className="text-muted-foreground">
            Create your first contract from a proposal or project.
          </p>
          <Link
            href="/documents/contracts/new"
            className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
          >
            Create Contract
          </Link>
        </div>
      ) : (
        <div className="rounded-md border bg-background p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm">
                <th className="pb-3 font-medium text-muted-foreground">Title</th>
                <th className="pb-3 font-medium text-muted-foreground">Status</th>
                <th className="pb-3 font-medium text-muted-foreground">Proposal</th>
                <th className="pb-3 font-medium text-muted-foreground">Project</th>
                <th className="pb-3 font-medium text-muted-foreground">Signed</th>
                <th className="pb-3 font-medium text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(contracts as ContractListItem[]).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-4">
                    <Link
                      href={`/documents/contracts/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === 'signed'
                          ? 'bg-green-100 text-green-800'
                          : c.status === 'voided'
                            ? 'bg-red-100 text-red-800'
                            : c.status === 'sent'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4">
                    {c.proposal ? (
                      <Link
                        href={`/sales/proposals/${c.proposal.id}`}
                        className="text-accent hover:underline text-sm"
                      >
                        #{c.proposal.number}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4">
                    {c.project ? (
                      <Link
                        href={`/projects/${c.project.id}`}
                        className="text-accent hover:underline text-sm"
                      >
                        {c.project.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4">
                    {c.signedAt ? (
                      <span className="text-sm">{new Date(c.signedAt).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString()}
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
