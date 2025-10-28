import { Title } from "@solidjs/meta";
import { Show } from "solid-js";
import { useAuth } from "~/lib/auth-context";

export default function Home() {
  const { user } = useAuth();

  return (
    <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 pt-16">
      <Title>Recipe Curator - Organize Your Favorite Recipes</Title>
      
      <div class="max-w-6xl mx-auto px-4 py-16">
        <div class="text-center mb-16">
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Welcome to Recipe Curator
          </h1>
          <p class="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The easiest way to organize, discover, and cook your favorite recipes. 
            Import from any website, create your own, and keep everything organized with tags.
          </p>
          
          <Show
            when={user()}
            fallback={
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/register"
                  class="px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-base sm:text-lg transition-colors text-center"
                >
                  Get Started Free
                </a>
                <a
                  href="/login"
                  class="px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-base sm:text-lg transition-colors text-center"
                >
                  Sign In
                </a>
              </div>
            }
          >
            <a
              href="/dashboard"
              class="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-base sm:text-lg transition-colors"
            >
              Go to Dashboard
            </a>
          </Show>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div class="text-center p-6 bg-white rounded-lg shadow-md">
            <div class="text-4xl mb-4">🌐</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Import from Any Site</h3>
            <p class="text-gray-600">
              Just paste a URL from your favorite recipe websites and we'll automatically extract all the details for you.
            </p>
          </div>
          
          <div class="text-center p-6 bg-white rounded-lg shadow-md">
            <div class="text-4xl mb-4">📝</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Create Your Own</h3>
            <p class="text-gray-600">
              Add your family recipes, cooking experiments, and personal favorites with our easy-to-use recipe editor.
            </p>
          </div>
          
          <div class="text-center p-6 bg-white rounded-lg shadow-md">
            <div class="text-4xl mb-4">🏷️</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Organize with Tags</h3>
            <p class="text-gray-600">
              Use tags to categorize your recipes by cuisine, diet, cooking time, or any system that works for you.
            </p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-xl p-8 text-center">
          <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Ready to organize your recipes?
          </h2>
          <p class="text-base sm:text-lg text-gray-600 mb-6">
            Join thousands of home cooks who have already organized their recipe collections.
          </p>
          
          <Show
            when={!user()}
          >
            <a
              href="/register"
              class="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-base sm:text-lg transition-colors"
            >
              Start Organizing Today
            </a>
          </Show>
        </div>
      </div>
    </main>
  );
}
