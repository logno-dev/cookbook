import { Title } from "@solidjs/meta";
import { Show, createSignal, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // Handle redirect when user is already logged in
  createEffect(() => {
    if (!authLoading() && user()) {
      // Small delay to ensure all auth state is properly set
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 0);
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email(), password());
      // Don't navigate immediately - let the createEffect handle it
      // This prevents race conditions with auth state updates
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading()) {
    return (
      <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center pt-16">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p class="mt-2 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Show redirecting message if user is logged in (effect will handle navigation)
  if (user()) {
    return (
      <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center pt-16">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p class="mt-2 text-gray-600">Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center pt-16">
      <Title>Sign In - Recipe Curator</Title>
      <div class="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h1 class="text-3xl font-bold text-center text-gray-900 mb-8">Sign In</h1>
        
        <form onSubmit={handleSubmit} class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="john@example.com"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
