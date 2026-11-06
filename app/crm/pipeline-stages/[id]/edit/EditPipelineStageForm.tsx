'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface EditPipelineStageFormProps {
  stage: {
    id: string;
    pipelineId: string;
    name: string;
    order: number;
    color: string | null;
    probability: number | null;
    isWon: boolean;
    isLost: boolean;
  };
  pipelineId: string;
}

export function EditPipelineStageForm({ stage, pipelineId }: EditPipelineStageFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<{
    name: string;
    order: number;
    color: string;
    probability: string;
    isWon: boolean;
    isLost: boolean;
  }>({
    defaultValues: {
      name: stage.name,
      order: stage.order,
      color: stage.color || '',
      probability: stage.probability?.toString() || '',
      isWon: stage.isWon,
      isLost: stage.isLost,
    },
  });

  React.useEffect(() => {
    if (stage) {
      form.reset({
        name: stage.name,
        order: stage.order,
        color: stage.color || '',
        probability: stage.probability?.toString() || '',
        isWon: stage.isWon,
        isLost: stage.isLost,
      });
    }
  }, [stage, form]);

  async function onSubmit(data: {
    name: string;
    order: number;
    color: string;
    probability: string;
    isWon: boolean;
    isLost: boolean;
  }) {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/crm/pipeline-stages/${stage.id}?pipelineId=${pipelineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          order: data.order,
          color: data.color || null,
          probability: data.probability ? parseFloat(data.probability) : null,
          isWon: data.isWon,
          isLost: data.isLost,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update stage');
        return;
      }

      router.push(`/crm/pipelines/${pipelineId}`);
      router.refresh();
    } catch {
      setError('Unable to update stage');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Stage</CardTitle>
          <CardDescription>Update stage details</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2 mb-4">
              <span>{error}</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(form.getValues());
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Stage Name
              </label>
              <Input
                id="name"
                placeholder="e.g. Qualification"
                {...form.register('name', { required: 'Stage name is required' })}
              />
              {form.formState.errors.name && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="order" className="block text-sm font-medium text-foreground">
                Order
              </label>
              <Input
                id="order"
                type="number"
                {...form.register('order', { valueAsNumber: true, required: 'Order is required' })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="color" className="block text-sm font-medium text-foreground">
                Color (hex)
              </label>
              <Input id="color" placeholder="#3b82f6" {...form.register('color')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="probability" className="block text-sm font-medium text-foreground">
                Probability (%)
              </label>
              <Input id="probability" type="number" {...form.register('probability')} />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isWon"
                type="checkbox"
                className="w-4 h-4 rounded border-input bg-background text-accent ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...form.register('isWon')}
              />
              <label htmlFor="isWon" className="text-sm">
                Won stage
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isLost"
                type="checkbox"
                className="w-4 h-4 rounded border-input bg-background text-accent ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...form.register('isLost')}
              />
              <label htmlFor="isLost" className="text-sm">
                Lost stage
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Stage'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
