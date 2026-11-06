'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useParams } from 'next/navigation';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
}

interface QuotationData {
  id: string;
  quotationNumber: string | null;
  opportunityId: string | null;
  contactId: string | null;
  accountId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  title: string;
  description: string | null;
  status: string;
  currency: string;
  validUntil: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    amount: string;
    order: number;
  }>;
}

export default function EditQuotationPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [quotation, setQuotation] = React.useState<QuotationData | null>(null);
  const [formData, setFormData] = React.useState<{
    opportunityId: string;
    contactId: string;
    accountId: string;
    clientName: string;
    clientEmail: string;
    title: string;
    description: string;
    status: string;
    currency: string;
    validUntil: string;
  }>({
    opportunityId: '',
    contactId: '',
    accountId: '',
    clientName: '',
    clientEmail: '',
    title: '',
    description: '',
    status: 'draft',
    currency: 'USD',
    validUntil: '',
  });

  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);

  // Fetch quotation data on mount
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/v1/quotations/${id}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load quotation');
        return res.json();
      })
      .then((data: QuotationData) => {
        if (cancelled) return;
        setQuotation(data);
        setFormData({
          opportunityId: data.opportunityId ?? '',
          contactId: data.contactId ?? '',
          accountId: data.accountId ?? '',
          clientName: data.clientName ?? '',
          clientEmail: data.clientEmail ?? '',
          title: data.title,
          description: data.description ?? '',
          status: data.status,
          currency: data.currency,
          validUntil: data.validUntil ? new Date(data.validUntil).toISOString().split('T')[0] : '',
        });
        setLineItems(
          data.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load quotation');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const totals = React.useMemo(() => {
    let sub = 0;
    let d = 0;
    let t = 0;
    for (const item of lineItems) {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const lineDisc = Number(item.discount) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const lineSubtotal = qty * price;
      const lineDiscAmt = lineSubtotal * (lineDisc / 100);
      const lineTax = (lineSubtotal - lineDiscAmt) * (taxRate / 100);
      sub += lineSubtotal;
      d += lineDiscAmt;
      t += lineTax;
    }
    return {
      subtotal: sub.toFixed(2),
      discount: d.toFixed(2),
      tax: t.toFixed(2),
      total: (sub - d + t).toFixed(2),
    };
  }, [lineItems]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: '1',
        unitPrice: '0',
        discount: '0',
        taxRate: '0',
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  async function onSubmit() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          opportunityId: formData.opportunityId || null,
          contactId: formData.contactId || null,
          accountId: formData.accountId || null,
          clientName: formData.clientName || null,
          clientEmail: formData.clientEmail || null,
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          currency: formData.currency,
          validUntil: formData.validUntil || null,
          items: lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            order: index,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update quotation');
        return;
      }

      router.push('/quotations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update quotation');
    } finally {
      setSaving(false);
    }
  }

  if (!quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading quotation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-start bg-canvas p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Quotation</CardTitle>
          <CardDescription>Quotation {quotation.quotationNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2 mb-4">
              <span>{error}</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  defaultValue={quotation.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-foreground">
                  Status <span className="text-destructive">*</span>
                </label>
                <select
                  id="status"
                  defaultValue={quotation.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="clientName" className="block text-sm font-medium text-foreground">
                  Client Name
                </label>
                <Input
                  id="clientName"
                  defaultValue={quotation.clientName ?? ''}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="clientEmail" className="block text-sm font-medium text-foreground">
                  Client Email
                </label>
                <Input
                  id="clientEmail"
                  type="email"
                  defaultValue={quotation.clientEmail ?? ''}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="currency" className="block text-sm font-medium text-foreground">
                  Currency
                </label>
                <select
                  id="currency"
                  defaultValue={quotation.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  defaultValue={quotation.validUntil ?? ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Line Items</h3>
                <Button type="button" size="sm" onClick={addLineItem} disabled={saving}>
                  + Add Item
                </Button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Discount %</th>
                    <th className="pb-2 font-medium text-right">Tax %</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length > 0 ? (
                    lineItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="py-3">
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => updateLineItem(index, 'discount', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.taxRate}
                            onChange={(e) => updateLineItem(index, 'taxRate', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 text-right text-xs font-medium">
                          {(
                            (Number(item.quantity) || 0) *
                            (Number(item.unitPrice) || 0) *
                            (1 - (Number(item.discount) || 0) / 100) *
                            (1 + (Number(item.taxRate) || 0) / 100)
                          ).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1 || saving}
                            className="w-8 h-8 p-0"
                          >
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No line items. Add items above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-muted rounded-md p-4">
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-right">
                    {formData.currency} {totals.subtotal}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-right">
                    {formData.currency} {totals.discount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium text-right">
                    {formData.currency} {totals.tax}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-foreground">Total</span>
                  <span className="font-semibold text-accent text-right">
                    {formData.currency} {totals.total}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button type="submit" className="w-auto" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/quotations')}
                disabled={saving}
                className="w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
