/**
 * AgencyOS Documents - New Template
 * Client component form for creating a new document template.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface FormData {
  name: string;
  type: string;
  isDefault: boolean;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: '',
    type: 'proposal',
    isDefault: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/documents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          isDefault: form.isDefault,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create template' }));
        throw new Error(err.error || 'Failed to create template');
      }

      const data = await res.json();
      toast.success('Template created');
      router.push(`/documents/templates/${data.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">New Template</h1>
          <p className="text-muted-foreground">Create a reusable document template.</p>
        </div>
        <Link
          href="/documents/templates"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Back to Templates
        </Link>
      </div>

      <div className="rounded-md border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-input rounded-md px-3 py-2 text-sm"
              placeholder="Template name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="proposal">Proposal</option>
              <option value="quotation">Quotation</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="letter">Letter</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-accent"
              />
              <span className="text-sm">Set as default for this type</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${
                loading
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              }`}
            >
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
