import { For, JSX } from 'solid-js';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs(props: BreadcrumbsProps) {
  return (
    <nav class={`flex ${props.className || ''}`} aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <For each={props.items}>
          {(item, index) => (
            <li class="inline-flex items-center">
              {/* Add chevron separator for non-first items */}
              {index() > 0 && (
                <svg 
                  class="w-4 h-4 text-gray-400 mx-2" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fill-rule="evenodd" 
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                    clip-rule="evenodd"
                  />
                </svg>
              )}
              
              {/* Breadcrumb link or text */}
              {item.href && !item.current ? (
                <a 
                  href={item.href}
                  class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span 
                  class={`text-sm font-medium ${
                    item.current 
                      ? 'text-gray-500' 
                      : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </span>
              )}
            </li>
          )}
        </For>
      </ol>
    </nav>
  );
}