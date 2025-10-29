import { JSX, createSignal, ErrorBoundary as SolidErrorBoundary } from 'solid-js';

interface ErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (error: Error, reset: () => void) => JSX.Element;
}

export default function ErrorBoundary(props: ErrorBoundaryProps) {
  const [error, setError] = createSignal<Error | null>(null);

  const defaultFallback = (error: Error, reset: () => void) => (
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Something went wrong</h3>
          <p class="text-sm text-red-700 mt-1">{error.message}</p>
          <button
            onClick={reset}
            class="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <SolidErrorBoundary
      fallback={(error: Error, reset: () => void) => {
        setError(error);
        return props.fallback ? props.fallback(error, reset) : defaultFallback(error, reset);
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}