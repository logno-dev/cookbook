import { createContext, useContext, createSignal, JSX, Show, ParentComponent } from "solid-js";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmModalContext = createContext<ConfirmModalContextType>();

export const useConfirm = () => {
  const context = useContext(ConfirmModalContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmModalProvider");
  }
  return context;
};

export const ConfirmModalProvider: ParentComponent = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [options, setOptions] = createSignal<ConfirmOptions>({ message: "" });
  let resolver: ((value: boolean) => void) | null = null;

  const confirm = (confirmOptions: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(confirmOptions);
      setIsOpen(true);
      resolver = resolve;
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) {
      resolver(true);
      resolver = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) {
      resolver(false);
      resolver = null;
    }
  };

  const currentOptions = () => options();

  const getVariantStyles = () => {
    const variant = currentOptions().variant || 'info';
    switch (variant) {
      case 'danger':
        return {
          button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          icon: 'text-red-600 dark:text-red-400',
          iconBackground: 'bg-red-100 dark:bg-red-900/30'
        };
      case 'warning':
        return {
          button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          icon: 'text-yellow-600 dark:text-yellow-400',
          iconBackground: 'bg-yellow-100 dark:bg-yellow-900/30'
        };
      default:
        return {
          button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          icon: 'text-blue-600 dark:text-blue-400',
          iconBackground: 'bg-blue-100 dark:bg-blue-900/30'
        };
    }
  };

  return (
    <ConfirmModalContext.Provider value={{ confirm }}>
      {props.children}
      
      <Show when={isOpen()}>
        <div class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            {/* Backdrop */}
            <div 
              class="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
              onClick={handleCancel}
            />
            
            {/* Modal */}
            <div role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" class="relative transform overflow-hidden rounded-lg bg-white dark:bg-stone-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div class="bg-white dark:bg-stone-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div class={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getVariantStyles().iconBackground} sm:mx-0 sm:h-10 sm:w-10`}>
                    <Show when={currentOptions().variant === 'danger'}>
                      <svg class={`h-6 w-6 ${getVariantStyles().icon}`} fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </Show>
                    <Show when={currentOptions().variant === 'warning'}>
                      <svg class={`h-6 w-6 ${getVariantStyles().icon}`} fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </Show>
                    <Show when={!currentOptions().variant || currentOptions().variant === 'info'}>
                      <svg class={`h-6 w-6 ${getVariantStyles().icon}`} fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                    </Show>
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 id="confirm-modal-title" class="text-base font-semibold leading-6 text-gray-900 dark:text-stone-100">
                      {currentOptions().title || 'Confirm Action'}
                    </h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500 dark:text-stone-400">
                        {currentOptions().message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 dark:bg-stone-900 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  class={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto ${getVariantStyles().button}`}
                  onClick={handleConfirm}
                >
                  {currentOptions().confirmText || 'Confirm'}
                </button>
                <button
                  type="button"
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-stone-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-stone-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-stone-600 hover:bg-gray-50 dark:hover:bg-stone-600 sm:mt-0 sm:w-auto"
                  onClick={handleCancel}
                >
                  {currentOptions().cancelText || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </ConfirmModalContext.Provider>
  );
};
