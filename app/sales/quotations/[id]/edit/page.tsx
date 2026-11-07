/**
 * AgencyOS Sales Quotation Edit page.
 * Server component that authenticates and passes the quotation ID to the client form.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditQuotationForm from './EditQuotationForm';

export default async function QuotationEditPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const { id } = await params;
  return <EditQuotationForm initialId={id} />;
}
