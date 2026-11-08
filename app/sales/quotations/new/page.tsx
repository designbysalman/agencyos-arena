/**
 * AgencyOS Sales New Quotation page.
 * * Redirects to the Phase 2.2 Live Preview Builder for creating quotations. * Keeps the existing /sales/quotations/new route as the entry point. */

import { redirect } from 'next/navigation';

export default function NewQuotationPage() {
  redirect('/sales/quotations/builder');
}
