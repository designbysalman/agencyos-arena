'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signUpEmail } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User as UserIcon, AlertTriangle } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', name: '', organizationName: '' },
  });

  async function onSubmit(data: RegisterFormData) {
    setError(null);
    setIsLoading(true);
    try {
      await signUpEmail({
        email: data.email,
        password: data.password,
        name: data.name,
        // Organization is created separately after sign-up
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Set up your AgencyOS workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserIcon className="w-4 h-4 shrink-0" />
                  <label htmlFor="name">Full name</label>
                </div>
                <Input id="name" placeholder="Jane Doe" {...form.register('name')} />
                {form.formState.errors.name && (
                  <span className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <label htmlFor="email">Email address</label>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@agency.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <span className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 shrink-0" />
                  <label htmlFor="password">Password</label>
                </div>
                <Input id="password" type="password" {...form.register('password')} />
                {form.formState.errors.password && (
                  <span className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="organizationName"
                  className="text-sm text-muted-foreground block mb-1"
                >
                  Organization name
                </label>
                <Input
                  id="organizationName"
                  placeholder="My Creative Agency"
                  {...form.register('organizationName')}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/login" className="text-accent hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
