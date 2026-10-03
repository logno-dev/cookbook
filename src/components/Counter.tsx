import { createSignal } from "solid-js";

export default function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button
      class="w-52 rounded-full bg-gray-100 dark:bg-stone-800 text-gray-900 dark:text-stone-100 border-2 border-gray-300 dark:border-stone-600 focus:border-gray-400 dark:focus:border-stone-400 py-4"
      onclick={() => setCount(prev => prev + 1)}
    >
      Clicks: {count()}
    </button>
  );
}
