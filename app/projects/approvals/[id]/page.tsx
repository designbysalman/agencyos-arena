/**
 * AgencyOS Edit Project Approval page.
 * Client component form for editing an existing project approval.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EditProjectApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [contactId, setContactId] = useState('');
  const [status, setStatus] = useState('pending');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadApproval(approvalId: string) {
    try {
      const res = await fetch(`/api/v1/projects/approvals/${approvalId}`);
      if (!res.ok) throw new Error('Failed to load approval');
      const data = await res.json();
      setContactId(data.contactId || '');
      setStatus(data.status || 'pending');
      setFeedback(data.feedback || '');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  useEffect(() => {
    params.then(({ id: pid }) => {
      setId(pid);
      void loadApproval(pid);
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contactId || undefined,
          status,
          feedback: feedback || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update approval');
      }

      toast.success('Approval updated');
      router.push(`/projects/approvals`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Edit Approval</h1>
        <Link
          href="/projects/approvals"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Contact ID</label>
          <input
            type="text"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="Client contact CUID (optional)"
            className="border border-input rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="changes_requested">Changes Requested</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Feedback</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Client feedback or notes..."
            className="border border-input rounded-md px-3 py-2 text-sm"
          />
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
