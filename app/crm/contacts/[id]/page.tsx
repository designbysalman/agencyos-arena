/**
 * AgencyOS CRM Contact Detail page.
 * Server component that shows contact details with related Account info.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getContact } from '@/lib/services/crm/contact-service';

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const { id } = await params;
  const contact = await getContact(id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-muted-foreground">
            {contact.email ?? 'No email'} &bull; {contact.phone ?? 'No phone'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/contacts/new"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
          >
            New Contact
          </Link>
          <Link
            href={`/crm/contacts/${contact.id}/edit`}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Edit
          </Link>
          <Link
            href="/crm/contacts"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Back to Contacts
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-card p-6 rounded-lg border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">
            Contact Details
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">First Name</dt>
              <dd className="font-medium">
                {contact.firstName ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last Name</dt>
              <dd className="font-medium">{contact.lastName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="font-medium">
                {contact.email ?? <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="font-medium">
                {contact.phone ?? <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd
                className={`font-medium ${
                  contact.status === 'active'
                    ? 'text-green-800'
                    : contact.status === 'inactive'
                      ? 'text-red-800'
                      : 'text-muted-foreground'
                }`}
              >
                {contact.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Source</dt>
              <dd className="font-medium">{contact.source ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Account</dt>
              <dd className="font-medium">
                {contact.accountId ? (
                  <Link
                    href={`/crm/accounts/${contact.accountId}`}
                    className="text-accent hover:underline"
                  >
                    View Account
                  </Link>
                ) : (
                  <span className="text-muted-foreground">No account linked</span>
                )}
              </dd>
            </div>
            {contact.deletedAt && (
              <div>
                <dt className="text-xs text-muted-foreground">Deleted At</dt>
                <dd className="font-medium text-destructive">
                  {new Date(contact.deletedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">
            Audit Information
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">Created By</dt>
              <dd className="font-medium">{contact.createdBy ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Updated By</dt>
              <dd className="font-medium">{contact.updatedBy ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created At</dt>
              <dd className="font-medium">
                {new Date(contact.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Updated At</dt>
              <dd className="font-medium">
                {new Date(contact.updatedAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">PII Masked</dt>
              <dd
                className={`font-medium ${
                  contact.isMasked ? 'text-amber-800' : 'text-muted-foreground'
                }`}
              >
                {contact.isMasked ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
