/**
 * AgencyOS Documents - Contract Detail
 * Server component that displays a single contract with signing actions.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getContract } from '@/lib/services/documents/contract-service';

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const contract = await getContract(id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contract</h1>
          <p className="text-muted-foreground">{contract.title}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/documents/contracts"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Back to Contracts
          </Link>
          <Link
            href={`/documents/contracts/${contract.id}/edit`}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2">
          <div className="rounded-md border bg-background p-6">
            <h2 className="text-lg font-semibold mb-4">Contract Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      contract.status === 'signed'
                        ? 'bg-green-100 text-green-800'
                        : contract.status === 'voided'
                          ? 'bg-red-100 text-red-800'
                          : contract.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {contract.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Proposal</dt>
                <dd className="text-sm">
                  {contract.proposal ? (
                    <Link
                      href={`/sales/proposals/${contract.proposal.id}`}
                      className="text-accent hover:underline"
                    >
                      #{contract.proposal.number} - {contract.proposal.title}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not linked</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Project</dt>
                <dd className="text-sm">
                  {contract.project ? (
                    <Link
                      href={`/projects/${contract.project.id}`}
                      className="text-accent hover:underline"
                    >
                      {contract.project.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not linked</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Signed By</dt>
                <dd className="text-sm">
                  {contract.signer ? (
                    <span>
                      {contract.signer.name} ({contract.signer.email})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not signed</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Signed At</dt>
                <dd className="text-sm">
                  {contract.signedAt ? (
                    <span>{new Date(contract.signedAt).toLocaleString()}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Signature Reference</dt>
                <dd className="text-sm">
                  {contract.signatureReference || <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="col-span-1 md:col-span-1">
          <div className="rounded-md border bg-background p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            {contract.status === 'draft' || contract.status === 'sent' ? (
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
                  onClick={() => {
                    if (
                      confirm('Mark this contract as signed? This action creates an audit record.')
                    ) {
                      fetch(`/api/v1/documents/contracts/${contract.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          signerName: '',
                          signerEmail: '',
                          signatureReference: 'manual',
                        }),
                      })
                        .then((res) => {
                          if (!res.ok) throw new Error('Failed to sign contract');
                          return res.json();
                        })
                        .then(() => {
                          window.location.reload();
                        })
                        .catch((err) => alert(err.message));
                    }
                  }}
                >
                  Sign Contract
                </button>
              </div>
            ) : null}
            {contract.status !== 'voided' ? (
              <button
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90"
                onClick={() => {
                  if (
                    confirm('Are you sure you want to void this contract? This cannot be undone.')
                  ) {
                    fetch(`/api/v1/documents/contracts/${contract.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'voided' }),
                    })
                      .then((res) => {
                        if (!res.ok) throw new Error('Failed to void contract');
                        return res.json();
                      })
                      .then(() => {
                        window.location.reload();
                      })
                      .catch((err) => alert(err.message));
                  }
                }}
              >
                Void Contract
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
