import { Title } from "@solidjs/meta";
import { Show, createSignal, createEffect } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";

export default function PasswordResetConfirm() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [code, setCode] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
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

    // Validation
    if (newPassword() !== confirmPassword()) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword().length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/password-reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email().trim(),
          code: code().trim(),
          newPassword: newPassword()
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(data.message);
        // Clear form
        setEmail("");
        setCode("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Password reset confirmation error:', err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-stone-900 dark:to-stone-800 flex items-center justify-center pt-16">
      <Title>Confirm Password Reset - Recipe Curator</Title>
      <div class="max-w-md w-full bg-white dark:bg-stone-800 rounded-lg shadow-xl p-8">
        <h1 class="text-3xl font-bold text-center text-gray-900 dark:text-stone-100 mb-2">Confirm Reset</h1>
        <p class="text-gray-600 dark:text-stone-400 text-center mb-8">
          Enter the verification code from your email and create a new password.
        </p>
        
        <Show when={success()}>
          <div class="text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg mb-6 border border-emerald-200 dark:border-emerald-800">
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              {success()}
            </div>
            <p class="mt-2 text-sm">Redirecting to login page...</p>
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

          <div>
            <label for="code" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code()}
              onInput={(e) => setCode(e.currentTarget.value)}
              placeholder="123456"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              class="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder:text-gray-500 dark:placeholder:text-stone-400 text-center font-mono text-lg tracking-widest"
            />
            <p class="text-xs text-gray-500 dark:text-stone-400 mt-1">
              Enter the 6-digit code from your email
            </p>
          </div>

          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword()}
              onInput={(e) => setNewPassword(e.currentTarget.value)}
              placeholder="••••••••"
              minLength={8}
              required
              class="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder:text-gray-500 dark:placeholder:text-stone-400"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              placeholder="••••••••"
              minLength={8}
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
            {loading() ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        <div class="mt-6 text-center space-y-2">
          <p class="text-gray-600 dark:text-stone-400">
            Don't have a verification code?{" "}
            <a href="/password-reset" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
              Request new code
            </a>
          </p>
          <p class="text-gray-600 dark:text-stone-400">
            Remember your password?{" "}
            <a href="/login" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}