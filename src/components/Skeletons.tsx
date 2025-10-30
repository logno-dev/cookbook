import { JSX, For } from 'solid-js';

// Base skeleton pulse animation
const SkeletonBase = (props: { class?: string; children?: JSX.Element }) => (
  <div class={`animate-pulse bg-gray-200 dark:bg-stone-700 rounded ${props.class || ''}`}>
    {props.children}
  </div>
);

// Text skeleton lines
export const SkeletonText = (props: { lines?: number; className?: string }) => (
  <div class={`space-y-2 ${props.className || ''}`}>
    <For each={Array(props.lines || 3)}>
      {(_, index) => (
        <SkeletonBase class={`h-4 ${index() === (props.lines || 3) - 1 ? 'w-3/4' : 'w-full'}`} />
      )}
    </For>
  </div>
);

// Card skeleton for recipes/cookbooks
export const SkeletonCard = () => (
  <div class="bg-white dark:bg-stone-800 rounded-lg shadow-md overflow-hidden">
    {/* Image placeholder */}
    <SkeletonBase class="w-full h-48" />
    
    <div class="p-6">
      {/* Title */}
      <SkeletonBase class="h-6 w-3/4 mb-3" />
      
      {/* Description */}
      <SkeletonText lines={2} className="mb-4" />
      
      {/* Tags/badges */}
      <div class="flex flex-wrap gap-2 mb-4">
        <SkeletonBase class="h-6 w-16" />
        <SkeletonBase class="h-6 w-20" />
        <SkeletonBase class="h-6 w-14" />
      </div>
      
      {/* Actions */}
      <div class="flex justify-between items-center">
        <SkeletonBase class="h-8 w-20" />
        <SkeletonBase class="h-8 w-16" />
      </div>
    </div>
  </div>
);

// Grid of skeleton cards
export const SkeletonCardGrid = (props: { count?: number; columns?: number }) => (
  <div class={`grid gap-6 ${
    props.columns === 5 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' :
    props.columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }`}>
    <For each={Array(props.count || 6)}>
      {() => <SkeletonCard />}
    </For>
  </div>
);

// List item skeleton
export const SkeletonListItem = () => (
  <div class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-stone-700">
    <div class="flex items-center space-x-3">
      <SkeletonBase class="w-10 h-10 rounded-full" />
      <div>
        <SkeletonBase class="h-4 w-32 mb-2" />
        <SkeletonBase class="h-3 w-24" />
      </div>
    </div>
    <SkeletonBase class="h-8 w-20" />
  </div>
);

// Table skeleton
export const SkeletonTable = (props: { rows?: number }) => (
  <div class="bg-white dark:bg-stone-800 rounded-lg shadow-md overflow-hidden">
    {/* Header */}
    <div class="border-b border-gray-200 dark:border-stone-700 px-6 py-4">
      <div class="flex space-x-8">
        <SkeletonBase class="h-4 w-24" />
        <SkeletonBase class="h-4 w-20" />
        <SkeletonBase class="h-4 w-16" />
        <SkeletonBase class="h-4 w-20" />
      </div>
    </div>
    
    {/* Rows */}
    <div class="divide-y divide-gray-200 dark:divide-stone-700">
      <For each={Array(props.rows || 5)}>
        {() => (
          <div class="px-6 py-4">
            <div class="flex space-x-8">
              <SkeletonBase class="h-4 w-24" />
              <SkeletonBase class="h-4 w-20" />
              <SkeletonBase class="h-4 w-16" />
              <SkeletonBase class="h-4 w-20" />
            </div>
          </div>
        )}
      </For>
    </div>
  </div>
);

// Page header skeleton
export const SkeletonPageHeader = () => (
  <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-gray-200 dark:border-stone-700 p-6 mb-8">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div class="flex-1">
        <SkeletonBase class="h-8 w-64 mb-2" />
        <SkeletonBase class="h-4 w-96" />
      </div>
      <div class="sm:ml-4 sm:flex-shrink-0">
        <SkeletonBase class="h-10 w-32" />
      </div>
    </div>
  </div>
);

// Search and filters skeleton
export const SkeletonFilters = () => (
  <div class="bg-white dark:bg-stone-800 rounded-lg shadow-md p-6 mb-8">
    {/* Search bar */}
    <SkeletonBase class="h-10 w-full mb-4" />
    
    {/* Filter tags */}
    <div class="mb-4">
      <SkeletonBase class="h-4 w-24 mb-2" />
      <div class="flex flex-wrap gap-2">
        <For each={Array(8)}>
          {() => <SkeletonBase class="h-8 w-16" />}
        </For>
      </div>
    </div>
    
    {/* Sort controls */}
    <div class="flex gap-4">
      <SkeletonBase class="h-10 w-32" />
      <SkeletonBase class="h-10 w-28" />
    </div>
  </div>
);

// Breadcrumb skeleton
export const SkeletonBreadcrumbs = () => (
  <div class="flex items-center space-x-2 mb-6">
    <SkeletonBase class="h-4 w-20" />
    <span class="text-gray-400 dark:text-stone-500">/</span>
    <SkeletonBase class="h-4 w-24" />
    <span class="text-gray-400 dark:text-stone-500">/</span>
    <SkeletonBase class="h-4 w-28" />
  </div>
);

// Navigation skeleton
export const SkeletonNav = () => (
  <nav class="bg-white dark:bg-stone-800 shadow-sm border-b border-gray-200 dark:border-stone-700">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <SkeletonBase class="h-8 w-32" />
        <div class="flex space-x-4">
          <SkeletonBase class="h-8 w-20" />
          <SkeletonBase class="h-8 w-24" />
          <SkeletonBase class="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  </nav>
);

// Dashboard layout skeleton
export const SkeletonDashboard = () => (
  <main class="min-h-screen bg-gray-50 dark:bg-stone-900 pt-16">
    <div class="max-w-7xl mx-auto px-4 py-8">
      <SkeletonBreadcrumbs />
      <SkeletonPageHeader />
      
      {/* Search and filters */}
      <SkeletonBase class="h-10 w-full mb-6" />
      
      {/* Tags */}
      <div class="mb-6">
        <SkeletonBase class="h-4 w-32 mb-2" />
        <div class="flex flex-wrap gap-2">
          <For each={Array(6)}>
            {() => <SkeletonBase class="h-8 w-16" />}
          </For>
        </div>
      </div>
      
      {/* Recipes section */}
      <div class="mb-8">
        <SkeletonBase class="h-6 w-32 mb-4" />
        <SkeletonCardGrid count={6} />
      </div>
      
      {/* Recent sections */}
      <div class="space-y-8">
        <div>
          <SkeletonBase class="h-6 w-48 mb-4" />
          <SkeletonCardGrid count={5} columns={5} />
        </div>
        <div>
          <SkeletonBase class="h-6 w-40 mb-4" />
          <SkeletonCardGrid count={5} columns={5} />
        </div>
      </div>
    </div>
  </main>
);

// Recipe detail skeleton
export const SkeletonRecipeDetail = () => (
  <div class="bg-white dark:bg-stone-800 rounded-lg shadow-lg overflow-hidden">
    {/* Header section */}
    <div class="p-6 border-b border-gray-200 dark:border-stone-700">
      <div class="space-y-4">
        {/* Title and description */}
        <div>
          <SkeletonBase class="h-8 w-80 mb-2" />
          <SkeletonBase class="h-5 w-96" />
        </div>
        
        {/* Action buttons */}
        <div class="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-stone-700">
          <div class="flex gap-2">
            <SkeletonBase class="h-10 w-24" />
            <SkeletonBase class="h-10 w-20" />
          </div>
          <div class="flex gap-2">
            <SkeletonBase class="h-10 w-28" />
            <SkeletonBase class="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>

    {/* Content section */}
    <div class="p-6">
      <div class="space-y-8">
        {/* Ingredients section */}
        <div>
          <div class="flex justify-between items-center mb-4">
            <SkeletonBase class="h-6 w-32" />
            <div class="flex gap-1">
              <SkeletonBase class="h-8 w-12" />
              <SkeletonBase class="h-8 w-12" />
              <SkeletonBase class="h-8 w-12" />
              <SkeletonBase class="h-8 w-12" />
            </div>
          </div>
          <div class="space-y-2">
            <For each={Array(8)}>
              {() => <SkeletonBase class="h-5 w-full" />}
            </For>
          </div>
        </div>

        {/* Instructions section */}
        <div>
          <SkeletonBase class="h-6 w-32 mb-4" />
          <div class="space-y-4">
            <For each={Array(6)}>
              {() => (
                <div class="space-y-2">
                  <SkeletonBase class="h-5 w-full" />
                  <SkeletonBase class="h-5 w-4/5" />
                  <SkeletonBase class="h-4 w-32" />
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Recipe details and tags sections */}
        <div class="space-y-6">
          {/* Recipe image placeholder */}
          <SkeletonBase class="w-full h-64 rounded-lg" />
          
          {/* Recipe details */}
          <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4">
            <SkeletonBase class="h-5 w-32 mb-4" />
            <div class="space-y-2">
              <For each={Array(5)}>
                {() => (
                  <div class="flex justify-between">
                    <SkeletonBase class="h-4 w-24" />
                    <SkeletonBase class="h-4 w-20" />
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Tags section */}
          <div class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4">
            <SkeletonBase class="h-5 w-16 mb-4" />
            <div class="flex flex-wrap gap-2">
              <For each={Array(5)}>
                {() => <SkeletonBase class="h-6 w-16" />}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Full page skeleton with nav
export const SkeletonPage = (props: { children?: JSX.Element }) => (
  <>
    <SkeletonNav />
    {props.children || <SkeletonDashboard />}
  </>
);