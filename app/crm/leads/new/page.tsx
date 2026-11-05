'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function CreateLeadPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [duplicateWarning, setDuplicateWarning] = React.useState<{
    duplicateId: string;
    message: string;
  } | null>(null);

  const form = useForm<{
    contactId: string;
    accountId: string;
    source: string;
    status: string;
    priority: string;
    expectedValue: string;
    ownerId: string;
    pipelineId: string;
    stageId: string;
    notes: string;
  }>({
    defaultValues: {
      contactId: '',
      accountId: '',
      source: '',
      status: 'new',
      priority: 'medium',
      expectedValue: '',
      ownerId: '',
      pipelineId: '',
      stageId: '',
      notes: '',
    },
  });

  async function onSubmit(data: {
    contactId: string;
    accountId: string;
    source: string;
    status: string;
    priority: string;
    expectedValue: string;
    ownerId: string;
    pipelineId: string;
    stageId: string;
    notes: string;
  }) {
    setError(null);
    setDuplicateWarning(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contactId: data.contactId || null,
          accountId: data.accountId || null,
          source: data.source,
          status: data.status,
          priority: data.priority,
          expectedValue: data.expectedValue || null,
          ownerId: data.ownerId || null,
          pipelineId: data.pipelineId || null,
          stageId: data.stageId || null,
          notes: data.notes || null,
        }),
      });

      if (res.status === 409) {
        const errData = await res.json().catch(() => ({}));
        setDuplicateWarning({
          duplicateId: errData.duplicateId || '',
          message: errData.message || 'A duplicate lead already exists.',
        });
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to create lead');
        return;
      }

      router.push('/crm/leads');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create lead');
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmOverride() {
    setError(null);
    setIsLoading(true);
    try {
      const data = {
        contactId: form.getValues('contactId') || null,
        accountId: form.getValues('accountId') || null,
        source: form.getValues('source'),
        status: form.getValues('status'),
        priority: form.getValues('priority'),
        expectedValue: form.getValues('expectedValue') || null,
        ownerId: form.getValues('ownerId') || null,
        pipelineId: form.getValues('pipelineId') || null,
        stageId: form.getValues('stageId') || null,
        notes: form.getValues('notes') || null,
      };

      const res = await fetch('/api/v1/crm/leads?overrideDuplicate=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to create lead');
        return;
      }

      setDuplicateWarning(null);
      router.push('/crm/leads');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create lead');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">New Lead</CardTitle>
          <CardDescription>Create a new sales lead for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2 mb-4">
              <span>{error}</span>
            </div>
          )}
          {duplicateWarning && (
            <div className="rounded-md bg-warning/10 p-3 text-sm text-warning-foreground flex items-center gap-2 mb-4 border border-warning/30">
              <span>{duplicateWarning.message}</span>
              <Button size="sm" variant="outline" onClick={confirmOverride} className="ml-auto">
                Create Anyway
              </Button>
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="source" className="block text-sm font-medium text-foreground">
                Source <span className="text-destructive">*</span>
              </label>
              <select
                id="source"
                defaultValue="website"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_call">Cold Call</option>
                <option value="email">Email</option>
                <option value="social_media">Social Media</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-foreground">
                Status <span className="text-destructive">*</span>
              </label>
              <select
                id="status"
                {...form.register('status')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed-won">Closed Won</option>
                <option value="closed-lost">Closed Lost</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium text-foreground">
                Priority <span className="text-destructive">*</span>
              </label>
              <select
                id="priority"
                {...form.register('priority')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="expectedValue" className="block text-sm font-medium text-foreground">
                Expected Value ($)
              </label>
              <Input
                id="expectedValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('expectedValue')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contactId" className="block text-sm font-medium text-foreground">
                Contact ID
              </label>
              <Input id="contactId" placeholder="e.g. cmxxxxxxx" {...form.register('contactId')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="accountId" className="block text-sm font-medium text-foreground">
                Account ID
              </label>
              <Input id="accountId" placeholder="e.g. cmxxxxxxx" {...form.register('accountId')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="ownerId" className="block text-sm font-medium text-foreground">
                Owner / Assignee ID
              </label>
              <Input id="ownerId" placeholder="e.g. cmxxxxxxx" {...form.register('ownerId')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="pipelineId" className="block text-sm font-medium text-foreground">
                Pipeline ID
              </label>
              <Input
                id="pipelineId"
                placeholder="e.g. cmxxxxxxx"
                {...form.register('pipelineId')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="stageId" className="block text-sm font-medium text-foreground">
                Stage ID
              </label>
              <Input id="stageId" placeholder="e.g. cmxxxxxxx" {...form.register('stageId')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Add lead notes..."
                className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...form.register('notes')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Lead'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/crm/leads')}
              disabled={isLoading}
              className="w-full mt-2"
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
