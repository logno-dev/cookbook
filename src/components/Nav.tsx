import { useMatch } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import InvitationNotifications from "./InvitationNotifications";
import { Settings } from "lucide-solid";

export default function Nav() {
  const { user, logout } = useAuth();
  const isHome = useMatch(() => "/");
  const isDashboard = useMatch(() => "/dashboard");
  const isCookbooks = useMatch(() => "/cookbooks");
  const isGroceryLists = useMatch(() => "/grocery-lists");
  const isAdmin = useMatch(() => "/admin");
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen());
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav class="fixed top-0 left-0 w-full bg-emerald-800 dark:bg-emerald-900 shadow-sm z-50">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div class="flex items-center">
            <a
              href="/"
              class={`text-lg font-bold text-emerald-100 uppercase transition-colors duration-200 ${
                isHome() ? "text-white" : "hover:text-white"
              }`}
              onClick={closeMenu}
            >
              Recipe Curator
            </a>
          </div>

          {/* Desktop Navigation */}
          <div class="hidden md:block">
            <div class="ml-10 flex items-baseline space-x-4">
              <Show when={user()}>
                <a
                  href="/dashboard"
                  class={`px-3 py-2 text-sm font-medium text-emerald-100 uppercase transition-colors duration-200 border-b-2 ${
                    isDashboard() ? "border-emerald-300 text-white" : "border-transparent hover:text-white"
                  }`}
                >
                  Dashboard
                </a>
                <a
                  href="/cookbooks"
                  class={`px-3 py-2 text-sm font-medium text-emerald-100 uppercase transition-colors duration-200 border-b-2 ${
                    isCookbooks() ? "border-emerald-300 text-white" : "border-transparent hover:text-white"
                  }`}
                >
                  Cookbooks
                </a>
                 <a
                   href="/grocery-lists"
                   class={`px-3 py-2 text-sm font-medium text-emerald-100 uppercase transition-colors duration-200 border-b-2 ${
                     isGroceryLists() ? "border-emerald-300 text-white" : "border-transparent hover:text-white"
                   }`}
                 >
                   Grocery Lists
                 </a>
                 <Show when={user()?.isSuperAdmin}>
                   <a
                     href="/admin"
                     class={`px-3 py-2 text-sm font-medium text-emerald-100 uppercase transition-colors duration-200 border-b-2 ${
                       isAdmin() ? "border-emerald-300 text-white" : "border-transparent hover:text-white"
                     }`}
                   >
                     Admin
                   </a>
                 </Show>
              </Show>
            </div>
          </div>

          {/* Desktop User Menu */}
          <div class="hidden md:block">
            <Show
              when={user()}
              fallback={
                <div class="flex space-x-2">
                  <a
                    href="/login"
                    class="px-4 py-2 text-sm text-emerald-100 bg-emerald-700 border border-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white focus:outline-none transition-colors duration-200"
                  >
                    Login
                  </a>
                  <a
                    href="/register"
                    class="px-4 py-2 text-sm text-emerald-800 bg-white border border-emerald-300 rounded-md hover:bg-emerald-50 focus:outline-none transition-colors duration-200"
                  >
                    Sign Up
                  </a>
                </div>
              }
            >
              <div class="flex items-center space-x-4">
                <InvitationNotifications />
                <span class="hidden lg:inline text-sm text-emerald-100">
                  Welcome, {user()?.name || user()?.email}
                </span>
                <a
                  href="/settings"
                  class="p-2 text-emerald-100 bg-emerald-700 border border-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white focus:outline-none transition-colors duration-200"
                  title="Settings"
                >
                  <Settings size={18} />
                </a>
                <button
                  onClick={handleLogout}
                  class="px-4 py-2 text-sm text-emerald-100 bg-emerald-700 border border-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white focus:outline-none transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            </Show>
          </div>

          {/* Mobile menu button */}
          <div class="md:hidden">
            <div class="flex items-center space-x-3">
              <Show when={user()}>
                <InvitationNotifications />
              </Show>
              <button
                onClick={toggleMenu}
                class="text-emerald-100 hover:text-white focus:outline-none focus:text-white transition-colors duration-200"
                aria-label="Toggle menu"
              >
                <Show when={!isMenuOpen()}>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Show>
                <Show when={isMenuOpen()}>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Show>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <Show when={isMenuOpen()}>
          <div class="md:hidden">
            <div class="px-2 pt-2 pb-3 space-y-1 bg-emerald-900 dark:bg-emerald-950 border-t border-emerald-700 dark:border-emerald-800">
            <Show when={user()}>
              <a
                href="/dashboard"
                class={`block px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200 ${
                  isDashboard() ? "bg-emerald-700 text-white" : ""
                }`}
                onClick={closeMenu}
              >
                Dashboard
              </a>
              <a
                href="/cookbooks"
                class={`block px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200 ${
                  isCookbooks() ? "bg-emerald-700 text-white" : ""
                }`}
                onClick={closeMenu}
              >
                Cookbooks
              </a>
               <a
                 href="/grocery-lists"
                 class={`block px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200 ${
                   isGroceryLists() ? "bg-emerald-700 text-white" : ""
                 }`}
                 onClick={closeMenu}
               >
                 Grocery Lists
               </a>
               <Show when={user()?.isSuperAdmin}>
                 <a
                   href="/admin"
                   class={`block px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200 ${
                     isAdmin() ? "bg-emerald-700 text-white" : ""
                   }`}
                   onClick={closeMenu}
                 >
                   Admin
                 </a>
               </Show>
              <div class="border-t border-emerald-700 pt-4 pb-3">
                <div class="flex items-center px-3">
                  <div class="text-base font-medium text-white">
                    {user()?.name || user()?.email}
                  </div>
                </div>
                <div class="mt-3 px-2 space-y-1">
                  <a
                    href="/settings"
                    class="flex items-center w-full text-left px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200"
                    onClick={closeMenu}
                  >
                    <Settings size={18} class="mr-2" />
                    Settings
                  </a>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    class="block w-full text-left px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </Show>
            <Show when={!user()}>
              <a
                href="/login"
                class="block px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                Login
              </a>
              <a
                href="/register"
                class="block px-3 py-2 text-base font-medium text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                Sign Up
              </a>
            </Show>
          </div>
        </div>
      </Show>
    </nav>
  );
}
