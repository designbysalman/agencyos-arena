/**
 * AgencyOS Finance Invoice Edit page.
 * Client component form for editing an existing invoice with line items.
 */

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

interface InvoiceData {
  id: string;
  number: string;
  title: string;
  status: string;
  currency: string;
  dueDate: string | null;
  notes: string | null;
  clientId: string | null;
  items: LineItem[];
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/crm/invoices/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load invoice');
        return res.json();
      })
      .then((data: InvoiceData) => {
        if (cancelled) return;
        setInvoice({
          id: data.id,
          number: data.number,
          title: data.title,
          status: data.status,
          currency: data.currency,
          dueDate: data.dueDate,
          notes: data.notes,
          clientId: data.clientId,
          items: data.items.map((i: LineItem) => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          })),
        });
        setLineItems(
          data.items.map((i: LineItem) => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load invoice');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: '', description: '', quantity: '1', unitPrice: '0', taxRate: '0' },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setSaving(true);
    try {
      const updateInput: Record<string, unknown> = {};
      if (invoice.clientId !== undefined) updateInput.clientId = invoice.clientId || null;
      if (invoice.title !== undefined) updateInput.title = invoice.title;
      if (invoice.status !== undefined) updateInput.status = invoice.status;
      if (invoice.currency !== undefined) updateInput.currency = invoice.currency;
      if (invoice.dueDate !== undefined) updateInput.dueDate = invoice.dueDate;
      if (invoice.notes !== undefined) updateInput.notes = invoice.notes;

      const res = await fetch(`/api/v1/crm/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updateInput,
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update invoice');
      }

      toast.success('Invoice updated');
      router.push(`/finance/invoices/${id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !invoice) return <div className="p-6">Loading invoice...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Edit Invoice {invoice.number}</h1>
        <div className="flex gap-2">
          <Link
            href={`/finance/invoices/${id}`}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Cancel
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client ID</label>
            <input
              type="text"
              value={invoice.clientId ?? ''}
              onChange={(e) => setInvoice({ ...invoice, clientId: e.target.value })}
              placeholder="Contact CUID"
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={invoice.title}
              onChange={(e) => setInvoice({ ...invoice, title: e.target.value })}
              required
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={invoice.status}
              onChange={(e) => setInvoice({ ...invoice, status: e.target.value })}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Currency</label>
            <select
              value={invoice.currency}
              onChange={(e) => setInvoice({ ...invoice, currency: e.target.value })}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="PKR">PKR</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due date</label>
            <input
              type="date"
              value={invoice.dueDate ?? ''}
              onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value || null })}
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={invoice.notes ?? ''}
            onChange={(e) => setInvoice({ ...invoice, notes: e.target.value || null })}
            rows={3}
            className="border border-input rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="border border-input rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="text-xs text-accent hover:underline"
            >
              Add line item
            </button>
          </div>
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 items-end">
              <input
                type="text"
                value={item.description}
                onChange={(e) => {
                  const next = [...lineItems];
                  next[index].description = e.target.value;
                  setLineItems(next);
                }}
                placeholder="Description"
                className="border border-input rounded-md px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                value={item.quantity}
                onChange={(e) => {
                  const next = [...lineItems];
                  next[index].quantity = e.target.value;
                  setLineItems(next);
                }}
                placeholder="Qty"
                className="border border-input rounded-md px-3 py-2 text-sm text-right"
                required
              />
              <input
                type="text"
                value={item.unitPrice}
                onChange={(e) => {
                  const next = [...lineItems];
                  next[index].unitPrice = e.target.value;
                  setLineItems(next);
                }}
                placeholder="Unit price"
                className="border border-input rounded-md px-3 py-2 text-sm text-right"
                required
              />
              <input
                type="text"
                value={item.taxRate}
                onChange={(e) => {
                  const next = [...lineItems];
                  next[index].taxRate = e.target.value;
                  setLineItems(next);
                }}
                placeholder="Tax %"
                className="border border-input rounded-md px-3 py-2 text-sm text-right"
                required
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="text-xs text-destructive hover:bg-destructive/10 rounded-md p-1"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-accent/90"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
