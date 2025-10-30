import { Title } from "@solidjs/meta";
import { Show, createSignal, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";

export default function PasswordReset() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // Redirect to dashboard if user is already logged in
  createEffect(() => {
    if (!authLoading() && user()) {
      navigate("/dashboard", { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email().trim() }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(data.message);
        setEmail("");
      } else {
        setError(data.error || 'Failed to send password reset email');
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-stone-900 dark:to-stone-800 flex items-center justify-center pt-16">
      <Title>Password Reset - Recipe Curator</Title>
      <div class="max-w-md w-full bg-white dark:bg-stone-800 rounded-lg shadow-xl p-8">
        <h1 class="text-3xl font-bold text-center text-gray-900 dark:text-stone-100 mb-2">Reset Password</h1>
        <p class="text-gray-600 dark:text-stone-400 text-center mb-8">
          Enter your email address and we'll send you a verification code to reset your password.
        </p>
        
        <Show when={success()}>
          <div class="text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg mb-6 border border-emerald-200 dark:border-emerald-800">
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              {success()}
            </div>
            <p class="mt-2 text-sm">
              Check your email and then{" "}
              <a href="/password-reset-confirm" class="underline hover:no-underline font-medium">
                continue with the verification code
              </a>
            </p>
          </div>
        </Show>
        
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

          <Show when={error()}>
            <div class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              {error()}
            </div>
          </Show>

          <button
            type="submit"
            disabled={loading()}
            class="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
          >
            {loading() ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <div class="mt-6 text-center space-y-2">
          <p class="text-gray-600 dark:text-stone-400">
            Remember your password?{" "}
            <a href="/login" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
              Sign in
            </a>
          </p>
          <p class="text-gray-600 dark:text-stone-400">
            Already have a verification code?{" "}
            <a href="/password-reset-confirm" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
              Enter code
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}