'use client';

import * as React from 'react';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

type ToastActionElement = React.ReactNode;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  [key: string]: unknown;
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

type State = {
  toasts: ToasterToast[];
};

type Action =
  | {
      type: typeof actionTypes.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST;
      toastId?: ToasterToast['id'];
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST;
      toastId?: ToasterToast['id'];
    };

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (!toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId || toastId === undefined ? { ...t, open: false } : t
          ),
        };
      }

      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === toastId ? { ...t, open: false } : t)),
      };
    }

    case actionTypes.REMOVE_TOAST:
      if (!action.toastId) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

function useToast() {
  const [state, dispatch] = React.useReducer(reducer, {
    toasts: [],
  });

  const toast = ({ ...props }: Omit<ToasterToast, 'id'>) => {
    const id = genId();

    const update = (props: ToasterToast) =>
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: { ...props, id },
      });

    const dismiss = (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId });

    update({
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss();
      },
    });

    return {
      id: id,
      dismiss,
      update: (updateProps: Omit<ToasterToast, 'id'>) =>
        dispatch({
          type: actionTypes.ADD_TOAST,
          toast: { ...updateProps, id },
        }),
    };
  };

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, type ToasterToast };

/** Toast provider component */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
