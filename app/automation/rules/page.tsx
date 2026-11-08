/**
 * AgencyOS Workflow Rules page.
 * Lists and creates automation workflow rules.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function listWorkflows() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const res = await fetch('/api/v1/automation/workflows', {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function WorkflowRulesPage() {
  const workflows = await listWorkflows();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Workflow Rules</h1>
        <Link
          href="/automation/notifications"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Notifications
        </Link>
      </div>

      <div className="rounded-md border bg-background p-6 max-w-3xl">
        <h2 className="text-lg font-semibold mb-4">Create Workflow Rule</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define trigger-based automation rules. Conditions and actions are stored as JSON.
        </p>
        <form className="space-y-4" action="">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rule Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Overdue Invoice Reminder"
              className="border border-input rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Trigger</label>
            <input
              type="text"
              name="trigger"
              placeholder="e.g. invoice.overdue"
              className="border border-input rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Conditions (JSON)</label>
            <textarea
              name="conditions"
              rows={3}
              placeholder='{"field": "dueDate", "operator": "<", "value": "today"}'
              className="border border-input rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Actions (JSON)</label>
            <textarea
              name="actions"
              rows={3}
              placeholder='{"type": "send_email", "template": "overdue_reminder"}'
              className="border border-input rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Enabled
              <input
                type="checkbox"
                name="enabled"
                defaultChecked
                className="rounded border-input text-accent bg-background"
              />
            </label>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
            onClick={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const conditionsRaw = formData.get('conditions') as string;
              const actionsRaw = formData.get('actions') as string;
              let conditions = {};
              let actions = {};
              try {
                conditions = conditionsRaw ? JSON.parse(conditionsRaw) : {};
                actions = actionsRaw ? JSON.parse(actionsRaw) : {};
              } catch {
                // If JSON parse fails, send as-is
              }
              fetch('/api/v1/automation/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: formData.get('name') as string,
                  trigger: formData.get('trigger') as string,
                  conditions,
                  actions,
                  enabled: formData.get('enabled') === 'on',
                }),
              }).then(() => window.location.reload());
            }}
          >
            Create Rule
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Trigger</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Created</th>
              <th className="pb-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(
              workflows as Array<{
                id: string;
                name: string;
                trigger: string;
                conditions: Record<string, unknown>;
                actions: Record<string, unknown>;
                enabled: boolean;
                createdAt: Date;
              }>
            ).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  No workflow rules found. Create a rule to get started.
                </td>
              </tr>
            ) : (
              (
                workflows as Array<{
                  id: string;
                  name: string;
                  trigger: string;
                  conditions: Record<string, unknown>;
                  actions: Record<string, unknown>;
                  enabled: boolean;
                  createdAt: Date;
                }>
              ).map((w) => (
                <tr key={w.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 font-medium">{w.name}</td>
                  <td className="py-4 text-sm text-muted-foreground font-mono">{w.trigger}</td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${
                        w.enabled ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {w.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-4 text-right text-sm text-muted-foreground">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/automation/rules/${w.id}`}
                      className="text-sm text-accent hover:underline mr-2"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
