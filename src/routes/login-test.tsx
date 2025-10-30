import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";

export default function LoginTest() {
  const [email, setEmail] = createSignal("admin@example.com");
  const [password, setPassword] = createSignal("admin123");
  const [result, setResult] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const testLogin = async () => {
    setLoading(true);
    setResult("");
    
    try {
      console.log('🧪 Testing login API directly...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email(),
          password: password()
        })
      });
      
      const data = await response.text();
      
      console.log('🧪 Login test response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      if (response.ok) {
        setResult(`✅ Success: ${data}`);
      } else {
        setResult(`❌ Error ${response.status}: ${data}`);
      }
      
    } catch (error) {
      console.error('🧪 Login test failed:', error);
      setResult(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-stone-900 dark:to-stone-800 flex items-center justify-center pt-16">
      <Title>Login Test - Recipe Cookbook</Title>
      <div class="max-w-md w-full bg-white dark:bg-stone-800 rounded-lg shadow-xl p-8">
        <h1 class="text-3xl font-bold text-center text-gray-900 dark:text-stone-100 mb-8">Login API Test</h1>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Email</label>
            <input
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Password</label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100"
            />
          </div>

          <button
            onClick={testLogin}
            disabled={loading()}
            class="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
          >
            {loading() ? "Testing..." : "Test Login API"}
          </button>

          {result() && (
            <div class="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-stone-700">
              <pre class="text-sm text-gray-900 dark:text-stone-100 whitespace-pre-wrap">{result()}</pre>
            </div>
          )}
          
          <div class="mt-6 text-center">
            <a href="/login" class="text-emerald-600 hover:text-emerald-700 font-medium">
              ← Back to Regular Login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}