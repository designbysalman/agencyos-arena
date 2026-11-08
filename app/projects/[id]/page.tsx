/**
 * AgencyOS Project Detail page.
 * Displays a single project with tasks, milestones count, and client linkage.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/services/crm/project-service';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const project = await getProject(id);

  const clientName = project.client
    ? `${project.client.firstName ?? ''} ${project.client.lastName ?? ''}`.trim() ||
      'Unnamed Client'
    : 'Unnamed Client';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{clientName}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/projects"
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Back to Projects
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 md:col-span-2">
          <div className="rounded-md border bg-background p-4">
            <h2 className="text-lg font-semibold mb-2">Client</h2>
            <p className="text-sm text-muted-foreground">{clientName}</p>
            {project.clientId && (
              <Link
                href={`/crm/contacts/${project.clientId}`}
                className="text-accent hover:underline text-sm mt-1 inline-block"
              >
                Open client record
              </Link>
            )}
          </div>
        </div>
        <div className="col-span-1 md:col-span-1">
          <div className="rounded-md border bg-background p-4">
            <h2 className="text-lg font-semibold mb-2">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${
                      project.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'archived'
                          ? 'bg-muted text-muted-foreground'
                          : project.status === 'on-hold'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {project.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Budget</dt>
                <dd className="font-medium text-right">
                  {project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <dt className="text-muted-foreground">Tasks</dt>
                <dd className="font-medium text-right">{project.tasks.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Milestones</dt>
                <dd className="font-medium text-right">{project.milestoneCount}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {project.description && (
        <div className="rounded-md border bg-background p-4">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      <div className="rounded-md border bg-background p-4">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          Tasks ({project.tasks.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Title</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Priority</th>
                <th className="pb-3 font-medium w-24">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {project.tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    No tasks yet.
                  </td>
                </tr>
              ) : (
                project.tasks.map(
                  (task: {
                    id: string;
                    title: string;
                    status: string;
                    priority: string;
                    dueDate: Date | null;
                  }) => (
                    <tr key={task.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4">{task.title}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${
                            task.status === 'done'
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-800'
                                : task.status === 'review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="py-4">{task.priority}</td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
