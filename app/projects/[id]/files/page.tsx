/**
 * AgencyOS Project Files page.
 * Lists files for a project and provides upload interface.
 */

import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function listFiles(projectId: string) {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    redirect('/login');
  }

  const res = await fetch(`/api/v1/projects/files?projectId=${encodeURIComponent(projectId)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function ProjectFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const files = await listFiles(id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Files</h1>
          <p className="text-sm text-muted-foreground">
            Manage files and attachments for this project.
          </p>
        </div>
        <Link
          href={`/projects/${id}`}
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Back to Project
        </Link>
      </div>

      <div className="rounded-md border bg-background p-6 max-w-3xl">
        <h2 className="text-lg font-semibold mb-4">Upload File</h2>
        <form className="space-y-4" action="">
          <div className="space-y-2">
            <label className="text-sm font-medium">File Asset ID</label>
            <input
              type="text"
              name="fileAssetId"
              placeholder="File asset CUID (from upload)"
              className="border border-input rounded-md px-3 py-2 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the File Asset ID from a completed upload. Files are stored outside the web root
              and served via signed URLs.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Task ID (optional)</label>
            <input
              type="text"
              name="taskId"
              placeholder="Associate with a specific task"
              className="border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
          >
            Attach File
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-3 font-medium">File Name</th>
              <th className="pb-3 font-medium w-48">Type</th>
              <th className="pb-3 font-medium text-right">Size</th>
              <th className="pb-3 font-medium w-24">Task</th>
              <th className="pb-3 font-medium">Uploaded By</th>
              <th className="pb-3 font-medium text-right">Uploaded</th>
              <th className="pb-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(
              files as Array<{
                id: string;
                fileAsset: { originalName: string; mimeType: string; size: number };
                task: { title: string } | null;
                user: { name: string | null; email: string | null } | null;
                createdAt: Date;
              }>
            ).length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  No files found. Upload a file to get started.
                </td>
              </tr>
            ) : (
              (
                files as Array<{
                  id: string;
                  fileAsset: { originalName: string; mimeType: string; size: number };
                  task: { title: string } | null;
                  user: { name: string | null; email: string | null } | null;
                  createdAt: Date;
                }>
              ).map((file) => (
                <tr key={file.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 font-medium">{file.fileAsset.originalName}</td>
                  <td className="py-4 text-sm text-muted-foreground">{file.fileAsset.mimeType}</td>
                  <td className="py-4 text-right text-sm">
                    {(file.fileAsset.size / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">{file.task?.title ?? '—'}</td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {file.user?.name ?? file.user?.email ?? '—'}
                  </td>
                  <td className="py-4 text-right text-sm text-muted-foreground">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right">
                    <button
                      className="text-sm text-destructive hover:underline"
                      onClick={() => {
                        if (window.confirm('Delete this file record? This cannot be undone.')) {
                          fetch(`/api/v1/projects/files/${file.id}`, {
                            method: 'DELETE',
                            headers: { cookie: cookieStore.toString() },
                          }).then(() => window.location.reload());
                        }
                      }}
                    >
                      Delete
                    </button>
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
