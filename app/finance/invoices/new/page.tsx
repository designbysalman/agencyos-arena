/**
 * AgencyOS Finance Invoice New page.
 * Client component form for creating a new invoice with line items.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: '1', unitPrice: '0', taxRate: '0' },
  ]);
  const [loading, setLoading] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unitPrice: '0', taxRate: '0' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/crm/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId || undefined,
          title,
          status,
          currency,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
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
        throw new Error(err.error || 'Failed to create invoice');
      }

      const data = await res.json();
      toast.success('Invoice created');
      router.push(`/finance/invoices/${data.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <Link
          href="/finance/invoices"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client contact ID (CUID)"
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Enter the CUID of an existing contact.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Invoice title"
              className="border border-input rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
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
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
              {lineItems.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  className="text-xs text-destructive hover:bg-destructive/10 rounded-md p-1"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-accent/90"
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </form>
    </div>
  );
}
