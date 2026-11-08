'use client';

import * as React from 'react';
import { classNames } from '@/lib/utils';

import * as SeparatorPrimitive from '@radix-ui/react-separator';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={classNames(
      'shrink-0 border-border',
      className,
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
