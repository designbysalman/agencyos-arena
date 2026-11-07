/**
 * AgencyOS Sales Proposal Edit page.
 * Server component that authenticates and passes the proposal ID to the client form.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditProposalForm from './EditProposalForm';

export default async function ProposalEditPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const { id } = await params;
  return <EditProposalForm initialId={id} />;
}
