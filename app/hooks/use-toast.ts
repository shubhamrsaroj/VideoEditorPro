"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'info';
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: ToastOptions[];
}

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 3000;

let count = 0;
const listeners: ((state: ToastState) => void)[] = [];
let memoryState: ToastState = { toasts: [] };

type ToastFunction = {
  (options: ToastOptions): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  custom: (options: ToastOptions) => void;
}

function createToast(options: ToastOptions) {
  const icon = options.variant === 'destructive' || options.type === 'error' ? '❌' : 
               options.type === 'success' ? '✅' : 'ℹ️';
  
  const id = (++count).toString();
  const newToast = { ...options, id };
  
  memoryState = {
    toasts: [...memoryState.toasts, newToast].slice(-TOAST_LIMIT),
  };
  
  listeners.forEach((listener) => {
    listener(memoryState);
  });

  if (options.title) {
    console.log(icon, options.title, options.description || '');
  } else {
    console.log(icon, options.description || '');
  }

  setTimeout(() => {
    memoryState = {
      toasts: memoryState.toasts.filter(t => t.id !== id)
    };
    listeners.forEach((listener) => {
      listener(memoryState);
    });
  }, options.duration || TOAST_REMOVE_DELAY);
}

export const toast: ToastFunction = Object.assign(createToast, {
  success: (message: string) => createToast({ type: 'success', description: message }),
  error: (message: string) => createToast({ type: 'error', description: message }),
  info: (message: string) => createToast({ type: 'info', description: message }),
  custom: (options: ToastOptions) => createToast(options)
});

// Add the useToast hook
export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    const listener = (newState: ToastState) => {
      setState(newState);
    };

    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      memoryState = {
        toasts: toastId
          ? memoryState.toasts.filter((t) => t.id !== toastId)
          : []
      };
      
      listeners.forEach((listener) => {
        listener(memoryState);
      });
    }
  };
}

