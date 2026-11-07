/**
 * AgencyOS Sales Quotation Edit page.
 * * Redirects to the Phase 2.2 Live Preview Builder for editing an existing * quotation. Preserves the /sales/quotations/[id]/edit route as the entry point. * The builder loads the saved quotation values and line items from the API. */

import { redirect } from 'next/navigation';

export default function QuotationEditPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/sales/quotations/builder/${params.id}`);
}
