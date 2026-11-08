/**
 * AgencyOS CRM Contact Detail page.
 * Client component that shows contact details with Edit and Delete actions.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

interface ContactDetailPageProps {
  params: { id: string };
}

export default function ContactDetailPage({ params }: ContactDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;
  const [contact, setContact] = React.useState<{
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
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/crm/contacts/${id}`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!mounted) return;
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          toast({ title: 'Error', description: 'Failed to load contact' });
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setContact(data);
      } catch {
        if (!mounted) return;
        toast({ title: 'Error', description: 'Failed to load contact' });
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, router, toast]);

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    setDeleting(true);
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
      router.push('/crm/contacts');
      router.refresh();
    } catch {
      toast({
        title: 'Delete failed',
        description: 'Unable to delete contact',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Loading contact…
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Contact not found.
        </div>
      </div>
    );
  }

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
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
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
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Contact Details</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">First Name</dt>
              <dd className="font-medium">{contact.firstName ?? '—'}</dd>
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
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Audit Information</h2>
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
              <dd className="font-medium">{new Date(contact.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Updated At</dt>
              <dd className="font-medium">{new Date(contact.updatedAt).toLocaleDateString()}</dd>
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
