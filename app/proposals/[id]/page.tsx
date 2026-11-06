/**
 * AgencyOS Proposals detail page.
 * Server component that displays a single proposal with its line items.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProposal } from '@/lib/services/proposals/proposal-service';

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const proposal = await getProposal(id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{proposal.title}</h1>
          <p className="text-muted-foreground text-sm">
            {proposal.proposalNumber} • {proposal.status} • {proposal.currency}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/proposals"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Back to list
          </Link>
          <Link
            href={`/proposals/${proposal.id}/edit`}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-muted rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Proposal Details</h3>
          <dl className="space-y-2 text-sm">
            <dt className="text-muted-foreground">Number</dt>
            <dd className="font-medium">{proposal.proposalNumber ?? '—'}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd
              className={`font-medium ${proposal.status === 'accepted' ? 'text-green-800' : proposal.status === 'rejected' ? 'text-red-800' : 'text-muted-foreground'}`}
            >
              {proposal.status}
            </dd>
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-medium">{proposal.currency}</dd>
            <dt className="text-muted-foreground">Valid Until</dt>
            <dd className="font-medium">
              {proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : '—'}
            </dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-medium">{proposal.version}</dd>
            <dt className="text-muted-foreground">Sent At</dt>
            <dd className="font-medium">
              {proposal.sentAt ? new Date(proposal.sentAt).toLocaleDateString() : '—'}
            </dd>
            <dt className="text-muted-foreground">Accepted At</dt>
            <dd className="font-medium">
              {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleDateString() : '—'}
            </dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium">{new Date(proposal.createdAt).toLocaleDateString()}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="font-medium">{new Date(proposal.updatedAt).toLocaleDateString()}</dd>
          </dl>
        </div>

        <div className="bg-muted rounded-md p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Client</h3>
          <dl className="space-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{proposal.clientName ?? '—'}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{proposal.clientEmail ?? '—'}</dd>
            {proposal.account && (
              <>
                <dt className="text-muted-foreground">Account</dt>
                <dd className="font-medium">
                  <Link
                    href={`/crm/accounts/${proposal.account.id}`}
                    className="text-accent hover:underline"
                  >
                    {proposal.account.name}
                  </Link>
                </dd>
              </>
            )}
            {proposal.contact && (
              <>
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="font-medium">
                  <Link
                    href={`/crm/contacts/${proposal.contact.id}`}
                    className="text-accent hover:underline"
                  >
                    {`${proposal.contact.firstName ?? ''} ${proposal.contact.lastName}`.trim() ||
                      'Unnamed Contact'}
                  </Link>
                </dd>
              </>
            )}
            {proposal.opportunity && (
              <>
                <dt className="text-muted-foreground">Opportunity</dt>
                <dd className="font-medium">
                  <Link
                    href={`/crm/opportunities/${proposal.opportunity.id}`}
                    className="text-accent hover:underline"
                  >
                    {proposal.opportunity.title}
                  </Link>
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-muted rounded-md p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Totals</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-right">
              {proposal.currency} {proposal.subtotal}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-right">
              {proposal.currency} {proposal.discount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium text-right">
              {proposal.currency} {proposal.tax}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-foreground">Total</span>
            <span className="font-semibold text-accent text-right">
              {proposal.currency} {proposal.total}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
        {proposal.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No line items.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium text-right">Qty</th>
                <th className="pb-3 font-medium text-right">Unit Price</th>
                <th className="pb-3 font-medium text-right">Discount</th>
                <th className="pb-3 font-medium text-right">Tax Rate</th>
                <th className="pb-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {proposal.items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-4">{item.description}</td>
                  <td className="py-4 text-right">{item.quantity}</td>
                  <td className="py-4 text-right">
                    {proposal.currency} {item.unitPrice}
                  </td>
                  <td className="py-4 text-right">{item.discount}%</td>
                  <td className="py-4 text-right">{item.taxRate}%</td>
                  <td className="py-4 text-right font-medium">
                    {proposal.currency} {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
