import { JSX, Show } from 'solid-js';
import { useBreadcrumbs } from '~/lib/breadcrumb-context';
import Breadcrumbs from './Breadcrumbs';

interface PageLayoutProps {
  children: JSX.Element;
  title?: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  headerActions?: JSX.Element;
  breadcrumbs?: JSX.Element; // Deprecated: use breadcrumb context instead
  loading?: boolean;
  error?: string;
  className?: string;
}

export default function PageLayout(props: PageLayoutProps) {
  const breadcrumbContext = useBreadcrumbs();
  
  const getMaxWidthClass = () => {
    switch (props.maxWidth) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case '4xl': return 'max-w-4xl';
      case '6xl': return 'max-w-6xl';
      case '7xl': return 'max-w-7xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-7xl'; // Default to 7xl for most pages
    }
  };

  return (
    <main class={`min-h-screen bg-gray-50 pt-16 ${props.className || ''}`}>
      <div class={`${getMaxWidthClass()} mx-auto px-4 py-8`}>
        {/* Breadcrumbs */}
        <Show when={props.breadcrumbs || breadcrumbContext.items().length > 0}>
          <div class="mb-6">
            {props.breadcrumbs || <Breadcrumbs items={breadcrumbContext.items()} />}
          </div>
        </Show>

        {/* Page Header */}
        <Show when={props.title || props.headerActions}>
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div class="flex-1">
                <Show when={props.title}>
                  <h1 class="text-3xl font-bold text-gray-900 mb-2">{props.title}</h1>
                </Show>
                <Show when={props.subtitle}>
                  <p class="text-gray-600">{props.subtitle}</p>
                </Show>
              </div>
              <Show when={props.headerActions}>
                <div class="sm:ml-4 sm:flex-shrink-0">
                  {props.headerActions}
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Loading State */}
        <Show when={props.loading}>
          <div class="flex justify-center items-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Loading...</span>
          </div>
        </Show>

        {/* Error State */}
        <Show when={props.error}>
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700">{props.error}</p>
              </div>
            </div>
          </div>
        </Show>

        {/* Main Content */}
        <Show when={!props.loading && !props.error}>
          {props.children}
        </Show>
      </div>
    </main>
  );
}