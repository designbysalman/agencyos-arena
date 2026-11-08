'use client';

import * as React from 'react';

/**
 * Hook to warn users about unsaved changes before navigating away.
 * Listens to beforeunload and route change events.
 */

export function useUnsavedChanges(isDirty: boolean, enabled: boolean = true) {
  const isDirtyRef = React.useRef(isDirty);

  // Keep ref in sync for use in event handlers
  React.useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const handleBeforeUnload = React.useCallback(
    (event: BeforeUnloadEvent) => {
      if (!enabled || !isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    },
    [enabled]
  );

  React.useEffect(() => {
    if (!enabled) return;
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, handleBeforeUnload]);

  return { isDirty };
}
