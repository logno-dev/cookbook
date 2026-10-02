import { A, useLocation, useNavigate } from "@solidjs/router";
import { For, Show, createEffect, createSignal } from "solid-js";
import { Menu, X, Settings } from "lucide-solid";
import { useAuth } from "~/lib/auth-context";
import { useToast } from "~/lib/notifications";
import InvitationNotifications from "./InvitationNotifications";

export default function Nav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const links = () => [
    { href: "/dashboard", label: "Recipes" },
    { href: "/cookbooks", label: "Cookbooks" },
    { href: "/grocery-lists", label: "Grocery lists" },
    ...(user()?.isSuperAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  createEffect(() => { location.pathname; setIsMenuOpen(false); });
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      toast.error("Couldn’t sign out. Please try again.");
    }
  };

  return (
    <nav aria-label="Main navigation" class="app-nav fixed top-0 left-0 w-full bg-emerald-800 dark:bg-emerald-900 z-50 text-emerald-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-4 h-16">
          <A href="/" class="nav-brand shrink-0 text-white">Recipe Curator</A>
          <div class="hidden md:flex items-center gap-1">
            <Show when={user()}>
              <For each={links()}>{link => <A href={link.href} class="nav-link" activeClass="nav-link-active" inactiveClass="">{link.label}</A>}</For>
            </Show>
          </div>
          <div class="flex items-center gap-2">
            <Show when={user()} fallback={<div class="hidden md:flex gap-3 items-center"><A href="/login" class="nav-link">Sign in</A><A href="/register" class="rounded-lg bg-emerald-50 text-emerald-900 px-4 py-2 text-sm font-medium">Get started</A></div>}>
              <InvitationNotifications />
              <A href="/settings" class="p-2 rounded-lg hover:bg-emerald-700" aria-label="Settings"><Settings size={19} /></A>
              <button onClick={handleLogout} class="hidden md:block nav-link">Sign out</button>
            </Show>
            <button onClick={() => setIsMenuOpen(open => !open)} class="md:hidden p-2 rounded-lg hover:bg-emerald-700" aria-label={isMenuOpen() ? "Close menu" : "Open menu"} aria-expanded={isMenuOpen()} aria-controls="mobile-navigation">
              <Show when={isMenuOpen()} fallback={<Menu size={23} />}><X size={23} /></Show>
            </button>
          </div>
        </div>
        <Show when={isMenuOpen()}>
          <div id="mobile-navigation" class="md:hidden border-t border-emerald-700 py-3 flex flex-col gap-1">
            <Show when={user()} fallback={<><A href="/login" class="nav-link">Sign in</A><A href="/register" class="nav-link">Get started</A></>}>
              <For each={links()}>{link => <A href={link.href} class="nav-link" activeClass="nav-link-active" inactiveClass="">{link.label}</A>}</For>
              <button onClick={handleLogout} class="nav-link text-left">Sign out</button>
            </Show>
          </div>
        </Show>
      </div>
    </nav>
  );
}
