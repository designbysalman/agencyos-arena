/**
 * AgencyOS Documents - New Contract
 * Client component form for creating a new contract.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface FormData {
  proposalId: string;
  projectId: string;
  title: string;
  status: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    proposalId: '',
    projectId: '',
    title: '',
    status: 'draft',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/documents/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: form.proposalId || undefined,
          projectId: form.projectId || undefined,
          title: form.title,
          status: form.status,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create contract' }));
        throw new Error(err.error || 'Failed to create contract');
      }

      const data = await res.json();
      toast.success('Contract created');
      router.push(`/documents/contracts/${data.id}`);
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
          <h1 className="text-2xl font-bold">New Contract</h1>
          <p className="text-muted-foreground">
            Create a contract linked to a proposal or project.
          </p>
        </div>
        <Link
          href="/documents/contracts"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Back to Contracts
        </Link>
      </div>

      <div className="rounded-md border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border border-input rounded-md px-3 py-2 text-sm"
              placeholder="Contract title"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proposal</label>
              <input
                type="text"
                value={form.proposalId}
                onChange={(e) => setForm({ ...form, proposalId: e.target.value })}
                className="border border-input rounded-md px-3 py-2 text-sm"
                placeholder="Proposal ID (optional)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <input
                type="text"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="border border-input rounded-md px-3 py-2 text-sm"
                placeholder="Project ID (optional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="signed">Signed</option>
              <option value="voided">Voided</option>
            </select>
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
              {loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
