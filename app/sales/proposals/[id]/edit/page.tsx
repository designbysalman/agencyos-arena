/**
 * AgencyOS Sales Proposal Edit page.
 * * Redirects to the Phase 2.2 Live Preview Builder for editing an existing * proposal. Preserves the /sales/proposals/[id]/edit route as the entry point. * The builder loads the saved proposal values and line items from the API. */

import { redirect } from 'next/navigation';

export default function ProposalEditPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/sales/proposals/builder/${params.id}`);
}
