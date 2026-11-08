/**
 * AgencyOS Edit Role page.
 * Client component form for updating role name, description, and permissions.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<
    Array<{ id: string; code: string; description: string | null }>
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(async ({ id: pid }) => {
      setId(pid);
      try {
        const [roleRes, permRes] = await Promise.all([
          fetch(`/api/v1/admin/roles/${pid}`),
          fetch('/api/v1/admin/roles?type=permissions'),
        ]);
        if (!roleRes.ok) throw new Error('Failed to load role');
        if (!permRes.ok) throw new Error('Failed to load permissions');

        const roleData = await roleRes.json();
        const permData = await permRes.json();

        setName(roleData.name || '');
        setDescription(roleData.description || '');
        setPermissionCodes(roleData.permissions.map((p: { code: string }) => p.code));
        setAvailablePermissions(permData);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          permissionCodes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }

      toast.success('Role updated');
      router.push('/admin/roles');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Edit Role</h1>
        <Link
          href="/admin/roles"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Role Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-input rounded-md px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border border-input rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Permissions</label>
          <div className="border border-input rounded-md p-3 max-h-60 overflow-y-auto">
            {availablePermissions.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={permissionCodes.includes(p.code)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPermissionCodes((prev) =>
                      checked ? [...prev, p.code] : prev.filter((c) => c !== p.code)
                    );
                  }}
                  className="rounded border-input text-accent bg-background"
                />
                <span className="text-sm">{p.code}</span>
                {p.description && (
                  <span className="text-xs text-muted-foreground ml-2">— {p.description}</span>
                )}
              </label>
            ))}
          </div>
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
