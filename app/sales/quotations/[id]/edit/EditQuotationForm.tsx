'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  sortOrder: number;
};

type QuotationData = {
  id: string;
  title: string;
  status: string;
  currency: string;
  validUntil: string | null;
  notes: string | null;
  contactId: string | null;
  opportunityId: string | null;
  lineItems: LineItem[];
};

interface EditQuotationFormProps {
  initialId: string;
}

export default function EditQuotationForm({ initialId }: EditQuotationFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<QuotationData>({
    id: initialId,
    title: '',
    status: 'draft',
    currency: 'USD',
    validUntil: null,
    notes: null,
    contactId: null,
    opportunityId: null,
    lineItems: [],
  });

  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);

  React.useEffect(() => {
    fetch(`/api/v1/crm/quotations/${initialId}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load quotation');
        return res.json();
      })
      .then((data) => {
        setFormData({
          id: data.id,
          title: data.title,
          status: data.status,
          currency: data.currency,
          validUntil: data.validUntil ?? null,
          notes: data.notes ?? null,
          contactId: data.contactId ?? null,
          opportunityId: data.opportunityId ?? null,
          lineItems: data.items.map(
            (
              item: {
                id: string;
                description: string;
                quantity: string;
                unitPrice: string;
                taxRate: string;
                sortOrder: number;
              },
              index: number
            ) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              sortOrder: item.sortOrder ?? index,
            })
          ),
        });
        setLineItems(
          data.items.map(
            (
              item: {
                id: string;
                description: string;
                quantity: string;
                unitPrice: string;
                taxRate: string;
                sortOrder: number;
              },
              index: number
            ) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              sortOrder: item.sortOrder ?? index,
            })
          )
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load quotation');
      });
  }, [initialId]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: '1',
        unitPrice: '0',
        taxRate: '0',
        sortOrder: lineItems.length,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const EDITABLE_STATUSES = ['draft', 'sent'];

  async function onSubmit() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/crm/quotations/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          status: formData.status,
          currency: formData.currency,
          validUntil: formData.validUntil || null,
          notes: formData.notes || null,
          contactId: formData.contactId || null,
          opportunityId: formData.opportunityId || null,
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            sortOrder: item.sortOrder,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update quotation');
        return;
      }

      router.push('/sales/quotations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update quotation');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/v1/crm/quotations/${formData.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setDeleteError(errData.error || 'Failed to delete quotation');
        return;
      }
      router.push('/sales/quotations');
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete quotation');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Quotation</CardTitle>
          <CardDescription>
            Edit quotation details and line items. Changes are saved server-side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2 mb-4">
              <span>{error}</span>
            </div>
          )}
          {deleteError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2 mb-4">
              <span>{deleteError}</span>
            </div>
          )}
          {EDITABLE_STATUSES.includes(formData.status) ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  defaultValue={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contactId" className="block text-sm font-medium text-foreground">
                  Contact ID
                </label>
                <Input
                  id="contactId"
                  defaultValue={formData.contactId ?? ''}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value || null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="opportunityId"
                  className="block text-sm font-medium text-foreground"
                >
                  Opportunity ID
                </label>
                <Input
                  id="opportunityId"
                  defaultValue={formData.opportunityId ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, opportunityId: e.target.value || null })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="currency" className="block text-sm font-medium text-foreground">
                  Currency
                </label>
                <select
                  id="currency"
                  defaultValue={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="PKR">PKR</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="validUntil" className="block text-sm font-medium text-foreground">
                  Valid Until
                </label>
                <Input
                  id="validUntil"
                  type="date"
                  defaultValue={formData.validUntil ?? ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value || null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-foreground">
                  Status
                </label>
                <select
                  id="status"
                  defaultValue={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={!EDITABLE_STATUSES.includes(formData.status)}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  id="notes"
                  defaultValue={formData.notes ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, notes: e.target.value || null })
                  }
                  rows={3}
                  className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground">Line Items</h3>
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-4 gap-3 items-end mb-3 p-2 border rounded-md bg-background"
                  >
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Description
                      </label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Quantity</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Unit Price</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Tax Rate %</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.taxRate}
                        onChange={(e) => updateLineItem(item.id, 'taxRate', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-sm text-accent hover:text-accent/90 flex items-center gap-1"
                >
                  <span>+</span> Add Line Item
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/sales/quotations')}
                disabled={isLoading}
                className="w-full mt-2"
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                This quotation is in <strong>{formData.status}</strong> status and cannot be edited.
                Accepted quotations are immutable.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/sales/quotations')}
                className="w-full"
              >
                Back to Quotations
              </Button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !EDITABLE_STATUSES.includes(formData.status)}
              className="w-full"
            >
              {isDeleting ? 'Deleting...' : 'Delete Quotation'}
            </Button>
            {!EDITABLE_STATUSES.includes(formData.status) && (
              <p className="text-xs text-muted-foreground mt-2">
                Cannot delete a {formData.status} quotation.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
