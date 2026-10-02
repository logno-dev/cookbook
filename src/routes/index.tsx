import { Title } from "@solidjs/meta";
import { Show } from "solid-js";
import { ArrowRight, BookOpen, Link, Tags } from "lucide-solid";
import { useAuth } from "~/lib/auth-context";

export default function Home() {
  const { user } = useAuth();

  return (
    <main class="app-page min-h-screen pt-16">
      <Title>Recipe Curator — A home for your favorite recipes</Title>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section class="py-20 sm:py-28 max-w-4xl">
          <p class="eyebrow mb-6">Collect. Cook. Make it yours.</p>
          <h1 class="hero-title text-5xl sm:text-6xl lg:text-7xl mb-7">Good recipes deserve<br />a place to call home.</h1>
          <p class="text-lg sm:text-xl text-gray-600 dark:text-stone-400 leading-relaxed max-w-2xl mb-9">
            The weeknight favorites. The handwritten classics. That dish you’ve been meaning to try.
            Keep them together, ready for your next meal.
          </p>
          <div class="flex flex-wrap gap-3">
            <Show when={user()} fallback={<>
              <a href="/register" class="primary-button">Start your collection <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="/login" class="secondary-button">Sign in</a>
            </>}>
              <a href="/dashboard" class="primary-button">Open your collection <ArrowRight size={18} aria-hidden="true" /></a>
            </Show>
          </div>
        </section>

        <section aria-label="A simpler way to keep recipes" class="grid grid-cols-1 md:grid-cols-3 gap-5 pb-16">
          <article class="feature-card">
            <span class="feature-icon"><Link size={24} strokeWidth={1.5} aria-hidden="true" /></span>
            <h2 class="text-xl font-semibold mb-3">Save the good finds</h2>
            <p class="text-gray-600 dark:text-stone-400 leading-relaxed">Paste a recipe link and bring the ingredients and instructions into your collection. Less searching, more cooking.</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon"><BookOpen size={24} strokeWidth={1.5} aria-hidden="true" /></span>
            <h2 class="text-xl font-semibold mb-3">Keep your own traditions</h2>
            <p class="text-gray-600 dark:text-stone-400 leading-relaxed">Write down family favorites, add your notes, and build cookbooks to share with the people around your table.</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon"><Tags size={24} strokeWidth={1.5} aria-hidden="true" /></span>
            <h2 class="text-xl font-semibold mb-3">Find just the thing</h2>
            <p class="text-gray-600 dark:text-stone-400 leading-relaxed">Organize with tags, search by ingredient, and turn your next recipe into a grocery list. Make everyday meals a little easier.</p>
          </article>
        </section>
        <footer class="py-8 border-t border-gray-200 dark:border-stone-700 flex flex-wrap justify-between gap-4 text-sm text-gray-500 dark:text-stone-400">
          <span>Recipe Curator · Made for your everyday kitchen</span>
          <a href="/about" class="hover:text-emerald-600">About Recipe Curator</a>
        </footer>
      </div>
    </main>
  );
}
