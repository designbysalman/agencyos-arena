/**
 * AgencyOS Edit Workflow Rule page.
 * Client component form for editing an existing workflow rule.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EditWorkflowRulePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [conditions, setConditions] = useState('{}');
  const [actions, setActions] = useState('{}');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(async ({ id: pid }) => {
      setId(pid);
      try {
        const res = await fetch(`/api/v1/automation/workflows/${pid}`);
        if (!res.ok) throw new Error('Failed to load workflow rule');
        const data = await res.json();
        setName(data.name || '');
        setTrigger(data.trigger || '');
        setConditions(JSON.stringify(data.conditions ?? {}, null, 2));
        setActions(JSON.stringify(data.actions ?? {}, null, 2));
        setEnabled(data.enabled ?? true);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let conditionsObj: Record<string, unknown> = {};
      let actionsObj: Record<string, unknown> = {};
      try {
        conditionsObj = conditions ? JSON.parse(conditions) : {};
        actionsObj = actions ? JSON.parse(actions) : {};
      } catch {
        toast.error('Invalid JSON in conditions or actions');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/v1/automation/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          trigger: trigger || undefined,
          conditions: conditionsObj,
          actions: actionsObj,
          enabled,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update workflow rule');
      }

      toast.success('Workflow rule updated');
      router.push(`/automation/workflows`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this workflow rule? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/v1/automation/workflows/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete workflow rule');
      toast.success('Workflow rule deleted');
      router.push(`/automation/workflows`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Edit Workflow Rule</h1>
        <div className="flex gap-2">
          <Link
            href="/automation/workflows"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Cancel
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90"
          >
            Delete
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Rule Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-input rounded-md px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Trigger</label>
          <input
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="e.g. invoice.overdue"
            className="border border-input rounded-md px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Conditions (JSON)</label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={4}
            className="border border-input rounded-md px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Actions (JSON)</label>
          <textarea
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            rows={4}
            className="border border-input rounded-md px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            Enabled
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-input text-accent bg-background"
            />
          </label>
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
