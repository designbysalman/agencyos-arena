/**
 * AgencyOS CRM Contacts page.
 * Server component that lists contacts for the current organization.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listContacts } from '@/lib/services/crm/contact-service';

export default async function ContactsPage({
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

  const { contacts, total, totalPages } = await listContacts({
    page,
    pageSize,
    search: search || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    includeDeleted: false,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Link
          href="/crm/contacts/new"
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
        >
          New Contact
        </Link>
      </div>

      <form className="flex gap-2 max-w-sm">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search contacts..."
          className="flex-1 border border-input rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Phone</th>
              <th className="pb-3 font-medium">Account</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium w-24">Created</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No contacts found.
                </td>
              </tr>
            ) : (
              contacts.map(
                (contact: {
                  id: string;
                  firstName: string | null;
                  lastName: string;
                  email: string | null;
                  phone: string | null;
                  accountId: string | null;
                  status: string;
                  createdAt: Date;
                }) => (
                  <tr key={contact.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 font-medium">
                      {contact.firstName} {contact.lastName}
                    </td>
                    <td className="py-4">{contact.email ?? '—'}</td>
                    <td className="py-4">{contact.phone ?? '—'}</td>
                    <td className="py-4">
                      {contact.accountId ? (
                        <a
                          href={`/crm/accounts/${contact.accountId}`}
                          className="text-accent hover:underline text-sm"
                        >
                          View Account
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="py-4">{contact.status}</td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString()}
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
