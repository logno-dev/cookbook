import { createContext, useContext, createSignal, For, JSX, Show, ParentComponent, onCleanup } from "solid-js";

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // milliseconds, 0 means don't auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Toast extends ToastOptions {
  id: string;
  timestamp: number;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
  success: (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => void;
  error: (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => void;
  warning: (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => void;
  info: (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => void;
}

const ToastContext = createContext<ToastContextType>();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: ParentComponent = (props) => {
  const [toasts, setToasts] = createSignal<Toast[]>([]);
  let toastIdCounter = 0;

  const addToast = (options: ToastOptions) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = {
      id,
      timestamp: Date.now(),
      type: 'info',
      duration: 5000, // 5 seconds default
      ...options,
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss if duration is set
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = (options: ToastOptions) => addToast(options);
  const success = (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => 
    addToast({ ...options, message, type: 'success' });
  const error = (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => 
    addToast({ ...options, message, type: 'error', duration: 0 }); // Errors don't auto-dismiss
  const warning = (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => 
    addToast({ ...options, message, type: 'warning' });
  const info = (message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => 
    addToast({ ...options, message, type: 'info' });

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-400',
          text: 'text-green-800',
          button: 'text-green-500 hover:text-green-600'
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400',
          text: 'text-red-800',
          button: 'text-red-500 hover:text-red-600'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-400',
          text: 'text-yellow-800',
          button: 'text-yellow-500 hover:text-yellow-600'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-400',
          text: 'text-blue-800',
          button: 'text-blue-500 hover:text-blue-600'
        };
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {props.children}
      
      {/* Toast Container */}
      <div class="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm">
        <For each={toasts()}>
          {(toast) => {
            const styles = getToastStyles(toast.type);
            return (
              <div class={`rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out ${styles.container}`}>
                <div class="flex items-start">
                  <div class={`flex-shrink-0 ${styles.icon}`}>
                    {getIcon(toast.type)}
                  </div>
                  <div class="ml-3 flex-1">
                    <p class={`text-sm font-medium ${styles.text}`}>
                      {toast.message}
                    </p>
                    <Show when={toast.action}>
                      <div class="mt-2">
                        <button
                          type="button"
                          class={`text-sm font-medium underline ${styles.button}`}
                          onClick={toast.action!.onClick}
                        >
                          {toast.action!.label}
                        </button>
                      </div>
                    </Show>
                  </div>
                  <div class="ml-4 flex-shrink-0 flex">
                    <button
                      type="button"
                      class={`rounded-md inline-flex ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                      onClick={() => removeToast(toast.id)}
                    >
                      <span class="sr-only">Close</span>
                      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </ToastContext.Provider>
  );
};