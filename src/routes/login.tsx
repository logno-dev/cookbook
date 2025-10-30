import { Title } from "@solidjs/meta";
import { Show, createSignal, onMount, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";

export default function Login() {
  const { user, loading: authLoading, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  // Redirect to dashboard if user is already logged in (via auth context)
  createEffect(() => {
    if (!authLoading() && user()) {
      console.log('✅ User is logged in via auth context, redirecting to dashboard');
      navigate("/dashboard", { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log('🔍 Login form submitted:', {
      email: email(),
      password: password().length + ' chars'
    });

    try {
      // Direct API call without auth context
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email().trim(), 
          password: password().trim() 
        }),
        credentials: 'include' // Important for cookies
      });
      
      if (response.ok) {
        console.log('✅ Login successful, refreshing auth and redirecting to dashboard');
        // Refresh the auth context so it knows we're logged in
        await refreshAuth();
        // The createEffect will handle the redirect when user() becomes truthy
        return;
      } else {
        // Try to get error message from response
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Login failed (${response.status})`;
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // No loading screen - show login form immediately

  return (
    <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-stone-900 dark:to-stone-800 flex items-center justify-center pt-16">
      <Title>Sign In - Recipe Curator</Title>
      <div class="max-w-md w-full bg-white dark:bg-stone-800 rounded-lg shadow-xl p-8">
        <h1 class="text-3xl font-bold text-center text-gray-900 dark:text-stone-100 mb-8">Sign In</h1>
        
        <form onSubmit={handleSubmit} class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="john@example.com"
              required
              class="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder:text-gray-500 dark:placeholder:text-stone-400"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder:text-gray-500 dark:placeholder:text-stone-400"
            />
          </div>

          <Show when={error()}>
            <div class="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error()}
            </div>
          </Show>

          <button
            type="submit"
            disabled={loading()}
            class="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
          >
            {loading() ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-gray-600">
            Don't have an account?{" "}
            <a href="/register" class="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
