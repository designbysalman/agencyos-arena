'use client';

import * as React from 'react';
import { classNames } from '@/lib/utils';

import * as ToastPrimitive from '@radix-ui/react-toast';

const Provider = ToastPrimitive.Provider;

const Viewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={classNames(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col',
      className
    )}
    {...props}
  />
));
Viewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={classNames(
      'group pointer-events-auto flex flex-col items-center w-full space-x-2 space-y-2 rounded-lg border border-border bg-background p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=closed]:shrink data-[state=closed]:duration-300 [email protected]_400:slide-in-from-bottom-full [email protected]_400:slide-in-from-top-full [email protected]_400:fade-in [email protected]_250:fade-out [email protected]_250:shrink-out',
      className
    )}
    {...props}
  >
    <ToastPrimitive.Action altText="Toast action" />
    <ToastPrimitive.Close className="text-muted-foreground" />
  </ToastPrimitive.Root>
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={classNames('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={classNames('text-sm text-muted-foreground', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

export { Provider, Viewport, Toast, ToastTitle, ToastDescription };
export { Toaster } from './toaster';
export { useToast } from './use-toast';
export type { ToasterToast } from './use-toast';
