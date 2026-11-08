/**
 * AgencyOS CRM Contacts page.
 * Client component that lists contacts with View/Edit/Delete actions
 * and toast notifications for delete operations.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

interface Contact {
  id: string;
  organizationId: string;
  accountId: string | null;
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  isMasked: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ContactsPageProps {
  searchParams?: {
    page?: string;
    pageSize?: string;
    search?: string;
  };
}

export default function ContactsPage({ searchParams }: ContactsPageProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const pageNum = Math.max(1, parseInt(String(searchParams?.page ?? '1'), 10));
  const pageSizeNum = Math.min(
    100,
    Math.max(1, parseInt(String(searchParams?.pageSize ?? '20'), 10))
  );
  const searchVal = String(searchParams?.search ?? '');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/v1/crm/contacts?page=${pageNum}&pageSize=${pageSizeNum}&search=${encodeURIComponent(searchVal)}&sortBy=createdAt&sortOrder=desc&includeDeleted=false`,
          {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }
        );
        if (!mounted) return;
        if (!res.ok) {
          toast({ title: 'Error', description: 'Failed to load contacts' });
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setContacts(data.contacts ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setPage(data.page ?? pageNum);
      } catch {
        if (!mounted) return;
        toast({ title: 'Error', description: 'Failed to load contacts' });
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pageNum, pageSizeNum, searchVal, toast]);

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/crm/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: 'Delete failed',
          description: errData.error || 'Unable to delete contact',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Deleted', description: 'Contact has been deleted' });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      toast({
        title: 'Delete failed',
        description: 'Unable to delete contact',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  }

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
          defaultValue={searchVal}
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

      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Loading contacts…
        </div>
      )}

      {!isLoading && (
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
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 font-medium">
                      <Link
                        href={`/crm/contacts/${contact.id}`}
                        className="text-accent hover:underline"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="py-4">{contact.email ?? '—'}</td>
                    <td className="py-4">{contact.phone ?? '—'}</td>
                    <td className="py-4">
                      {contact.accountId ? (
                        <Link
                          href={`/crm/accounts/${contact.accountId}`}
                          className="text-accent hover:underline text-sm"
                        >
                          View Account
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="py-4">{contact.status}</td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/crm/contacts/${contact.id}`}
                          className="text-xs text-muted-foreground hover:text-accent"
                          title="View"
                        >
                          View
                        </Link>
                        <Link
                          href={`/crm/contacts/${contact.id}/edit`}
                          className="text-xs text-muted-foreground hover:text-accent"
                          title="Edit"
                        >
                          Edit
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
                          disabled={deletingId === contact.id}
                          title="Delete"
                        >
                          {deletingId === contact.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Page {page} of {totalPages} ({total} total)
        </div>
      )}
    </div>
  );
}
