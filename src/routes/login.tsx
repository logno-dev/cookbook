import { Title } from "@solidjs/meta";
import { Show, createSignal, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";

export default function Login() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  // Redirect to dashboard if user is already logged in (via auth context)
  createEffect(() => {
    if (!authLoading() && user()) {
      navigate("/dashboard", { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email().trim(), password());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // No loading screen - show login form immediately

  return (
    <main class="app-page min-h-screen flex items-center justify-center px-4 py-24">
      <Title>Sign In - Recipe Curator</Title>
      <div class="feature-card max-w-md w-full">
        <p class="eyebrow mb-3 text-center">Your everyday kitchen</p>
        <h1 class="page-title text-4xl text-center text-gray-900 dark:text-stone-100 mb-3">Welcome back</h1>
        <p class="text-center text-gray-500 dark:text-stone-400 mb-8">Your favorite recipes are waiting.</p>
        
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

        <div class="mt-6 text-center space-y-2">
          <p class="text-gray-600 dark:text-stone-400">
            <a href="/password-reset" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
              Forgot your password?
            </a>
          </p>
          <p class="text-gray-600 dark:text-stone-400">
            Don't have an account?{" "}
            <a href="/register" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
