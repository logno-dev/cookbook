import { Title } from "@solidjs/meta";
import { Show, createSignal, createEffect, onMount, For } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "@solidjs/router";
import PageLayout from "~/components/PageLayout";
import { api } from "~/lib/api-client";

interface AdminStats {
  overview: {
    totalUsers: number;
    totalRecipes: number;
    totalCookbooks: number;
    totalGroceryLists: number;
    totalTags: number;
    totalInvitations: number;
    totalVariants: number;
    totalGroceryItems: number;
  };
  growth: {
    newUsersLast30Days: number;
    newRecipesLast7Days: number;
    newCookbooksLast7Days: number;
    newGroceryListsLast7Days: number;
  };
  topContributors: Array<{
    email: string;
    name: string;
    recipeCount: number;
  }>;
  popularTags: Array<{
    name: string;
    color: string;
    usageCount: number;
  }>;
  cookbookInsights: {
    totalMembers: number;
    averageRecipesPerCookbook: number;
    publicCookbooks: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  recipeCount: number;
  cookbookCount: number;
  lastSessionAt: Date | null;
  accountAgeInDays: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = createSignal<AdminStats | null>(null);
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [usersLoading, setUsersLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [usersError, setUsersError] = createSignal("");
  const [activeTab, setActiveTab] = createSignal("stats");
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [showUserModal, setShowUserModal] = createSignal(false);

  // Check auth and super admin status
  createEffect(() => {
    if (!authLoading() && !user()) {
      console.log('🔍 Admin route: No user, redirecting to login');
      navigate("/login", { replace: true });
    } else if (!authLoading() && user() && !user()?.isSuperAdmin) {
      console.log('🔍 Admin route: User found but not super admin', {
        user: user(),
        isSuperAdmin: user()?.isSuperAdmin,
        type: typeof user()?.isSuperAdmin
      });
      navigate("/dashboard", { replace: true });
    } else if (!authLoading() && user()?.isSuperAdmin) {
      console.log('🔍 Admin route: Super admin access granted', {
        user: user(),
        isSuperAdmin: user()?.isSuperAdmin
      });
    }
  });

  // Load stats when user is confirmed as super admin
  createEffect(async () => {
    if (!authLoading() && user()?.isSuperAdmin && !stats()) {
      console.log('🔍 Loading admin stats...');
      try {
        setLoading(true);
        setError("");
        const data = await api.call("/api/admin/stats");
        console.log('🔍 Admin stats loaded:', data);
        setStats(data);
      } catch (err) {
        console.error("Failed to load admin stats:", err);
        setError("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    }
  });

  // Load users when user is confirmed as super admin
  createEffect(async () => {
    if (!authLoading() && user()?.isSuperAdmin && users().length === 0) {
      console.log('🔍 Loading admin users...');
      try {
        setUsersLoading(true);
        setUsersError("");
        const data = await api.call("/api/admin/users");
        console.log('🔍 Admin users loaded:', data);
        setUsers(data.users);
      } catch (err) {
        console.error("Failed to load admin users:", err);
        setUsersError("Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    }
  });

  // User management functions
  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const promoteUser = async (user: User) => {
    if (confirm(`Make ${user.email} a super admin? This will give them full access to the admin dashboard.`)) {
      try {
        await api.call(`/api/admin/users/${user.id}/promote`, { method: 'POST' });
        // Refresh users list
        const data = await api.call("/api/admin/users");
        setUsers(data.users);
      } catch (err) {
        console.error("Failed to promote user:", err);
        alert("Failed to promote user");
      }
    }
  };

  const demoteUser = async (user: User) => {
    if (confirm(`Remove super admin privileges from ${user.email}?`)) {
      try {
        await api.call(`/api/admin/users/${user.id}/demote`, { method: 'POST' });
        // Refresh users list
        const data = await api.call("/api/admin/users");
        setUsers(data.users);
      } catch (err) {
        console.error("Failed to demote user:", err);
        alert("Failed to demote user");
      }
    }
  };

  return (
    <PageLayout>
      <Title>Admin Dashboard - Recipe Cookbook</Title>
      
      <Show when={!authLoading() && user()?.isSuperAdmin}>
        <div class="container mx-auto px-4 py-8">
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-stone-100 mb-2">Admin Dashboard</h1>
            <p class="text-gray-600 dark:text-stone-400">Site statistics and user management</p>
            
            {/* Tab Navigation */}
            <div class="mt-6 border-b border-gray-200 dark:border-stone-700">
              <nav class="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("stats")}
                  class={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab() === "stats"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-300 hover:border-gray-300 dark:hover:border-stone-600"
                  }`}
                >
                  Statistics
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  class={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab() === "users"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-300 hover:border-gray-300 dark:hover:border-stone-600"
                  }`}
                >
                  Users ({users().length})
                </button>
              </nav>
            </div>
          </div>

          {/* Statistics Tab */}
          <Show when={activeTab() === "stats"}>
            <Show when={loading()}>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <For each={Array(8)}>
                  {() => (
                     <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6 animate-pulse">
                       <div class="h-4 bg-gray-200 dark:bg-stone-700 rounded w-3/4 mb-2"></div>
                       <div class="h-8 bg-gray-200 dark:bg-stone-700 rounded w-1/2"></div>
                     </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={error()}>
               <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                 <p class="text-red-700 dark:text-red-400">{error()}</p>
               </div>
            </Show>

            <Show when={stats()}>
              {(data) => (
                <>
                  {/* Overview Stats */}
                  <div class="mb-8">
                     <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Overview</h2>
                     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <div class="flex items-center">
                           <div class="flex-1">
                             <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Total Users</p>
                             <p class="text-2xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalUsers}</p>
                          </div>
                          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <div class="flex items-center">
                           <div class="flex-1">
                             <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Total Recipes</p>
                             <p class="text-2xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalRecipes}</p>
                          </div>
                          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <div class="flex items-center">
                           <div class="flex-1">
                             <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Total Cookbooks</p>
                             <p class="text-2xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalCookbooks}</p>
                          </div>
                          <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <div class="flex items-center">
                           <div class="flex-1">
                             <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Grocery Lists</p>
                             <p class="text-2xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalGroceryLists}</p>
                          </div>
                          <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clip-rule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Growth Stats */}
                  <div class="mb-8">
                     <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Recent Growth</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">New Users (30 days)</p>
                        <p class="text-2xl font-bold text-blue-600">{data().growth.newUsersLast30Days}</p>
                      </div>
                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">New Recipes (7 days)</p>
                        <p class="text-2xl font-bold text-green-600">{data().growth.newRecipesLast7Days}</p>
                      </div>
                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">New Cookbooks (7 days)</p>
                        <p class="text-2xl font-bold text-purple-600">{data().growth.newCookbooksLast7Days}</p>
                      </div>
                       <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">New Lists (7 days)</p>
                        <p class="text-2xl font-bold text-yellow-600">{data().growth.newGroceryListsLast7Days}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Top Contributors */}
                     <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                       <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Top Recipe Contributors</h3>
                      <div class="space-y-3">
                        <For each={data().topContributors.slice(0, 5)}>
                          {(contributor) => (
                            <div class="flex items-center justify-between">
                              <div>
                                 <p class="font-medium text-gray-900 dark:text-stone-100">{contributor.name}</p>
                                 <p class="text-sm text-gray-500 dark:text-stone-400">{contributor.email}</p>
                               </div>
                               <span class="text-sm font-medium text-gray-600 dark:text-stone-300">{contributor.recipeCount} recipes</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>

                    {/* Popular Tags */}
                     <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                       <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Popular Tags</h3>
                      <div class="space-y-3">
                        <For each={data().popularTags.slice(0, 5)}>
                          {(tag) => (
                            <div class="flex items-center justify-between">
                              <div class="flex items-center">
                                <div 
                                  class="w-4 h-4 rounded-full mr-3" 
                                  style={`background-color: ${tag.color}`}
                                ></div>
                                 <span class="font-medium text-gray-900 dark:text-stone-100">{tag.name}</span>
                               </div>
                               <span class="text-sm font-medium text-gray-600 dark:text-stone-300">{tag.usageCount} uses</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                   <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6">
                     <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100 mb-4">Detailed Statistics</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Total Tags</p>
                         <p class="text-xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalTags}</p>
                      </div>
                      <div>
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Recipe Variants</p>
                         <p class="text-xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalVariants}</p>
                      </div>
                      <div>
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Grocery Items</p>
                         <p class="text-xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalGroceryItems}</p>
                      </div>
                      <div>
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Pending Invitations</p>
                         <p class="text-xl font-bold text-gray-900 dark:text-stone-100">{data().overview.totalInvitations}</p>
                      </div>
                      <div>
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Cookbook Members</p>
                         <p class="text-xl font-bold text-gray-900 dark:text-stone-100">{data().cookbookInsights.totalMembers}</p>
                      </div>
                      <div>
                         <p class="text-sm font-medium text-gray-500 dark:text-stone-400">Public Cookbooks</p>
                         <p class="text-xl font-bold text-gray-900 dark:text-stone-100">{data().cookbookInsights.publicCookbooks}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Show>
          </Show>

          {/* Users Tab */}
          <Show when={activeTab() === "users"}>
            <Show when={usersLoading()}>
               <div class="bg-white dark:bg-stone-800 rounded-lg shadow p-6 animate-pulse">
                 <div class="h-6 bg-gray-200 dark:bg-stone-700 rounded w-1/4 mb-4"></div>
                 <div class="space-y-3">
                   <For each={Array(5)}>
                     {() => (
                       <div class="h-16 bg-gray-200 dark:bg-stone-700 rounded"></div>
                     )}
                   </For>
                 </div>
               </div>
            </Show>

            <Show when={usersError()}>
               <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                 <p class="text-red-700 dark:text-red-400">{usersError()}</p>
               </div>
            </Show>

            <Show when={!usersLoading() && !usersError()}>
               <div class="bg-white dark:bg-stone-800 rounded-lg shadow overflow-hidden">
                 <div class="px-6 py-4 border-b border-gray-200 dark:border-stone-700">
                   <h3 class="text-lg font-semibold text-gray-900 dark:text-stone-100">All Users ({users().length})</h3>
                   <p class="text-sm text-gray-600 dark:text-stone-400">Manage user accounts and permissions</p>
                 </div>
                <div class="overflow-x-auto">
                   <table class="min-w-full divide-y divide-gray-200 dark:divide-stone-700">
                     <thead class="bg-gray-50 dark:bg-stone-800">
                      <tr>
                         <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">User</th>
                         <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">Role</th>
                         <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">Activity</th>
                         <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">Joined</th>
                         <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">Last Seen</th>
                         <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                     <tbody class="bg-white dark:bg-stone-800 divide-y divide-gray-200 dark:divide-stone-700">
                      <For each={users()}>
                        {(userRecord) => (
                           <tr class="hover:bg-gray-50 dark:hover:bg-stone-700">
                            <td class="px-6 py-4 whitespace-nowrap">
                              <div>
                                 <div class="text-sm font-medium text-gray-900 dark:text-stone-100">{userRecord.name}</div>
                                 <div class="text-sm text-gray-500 dark:text-stone-400">{userRecord.email}</div>
                              </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                              <Show 
                                when={userRecord.isSuperAdmin}
                                fallback={
                                   <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300">
                                     User
                                   </span>
                                }
                              >
                                 <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                                   Super Admin
                                 </span>
                              </Show>
                            </td>
                             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-stone-100">
                              <div class="flex space-x-4">
                                <span>{userRecord.recipeCount} recipes</span>
                                <span>{userRecord.cookbookCount} cookbooks</span>
                              </div>
                            </td>
                             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-stone-400">
                               {userRecord.accountAgeInDays} days ago
                             </td>
                             <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-stone-400">
                              <Show 
                                when={userRecord.lastSessionAt}
                                fallback="Never"
                              >
                                {new Date(userRecord.lastSessionAt!).toLocaleDateString()}
                              </Show>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div class="flex space-x-2">
                                 <button 
                                   class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300"
                                   onClick={() => viewUserDetails(userRecord)}
                                 >
                                   View
                                 </button>
                                <Show when={userRecord.email !== user()?.email}>
                                  <Show 
                                    when={userRecord.isSuperAdmin}
                                    fallback={
                                       <button 
                                         class="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                                         onClick={() => promoteUser(userRecord)}
                                       >
                                         Make Admin
                                       </button>
                                    }
                                  >
                                     <button 
                                       class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                       onClick={() => demoteUser(userRecord)}
                                     >
                                       Remove Admin
                                     </button>
                                   </Show>
                                 </Show>
                               </div>
                             </td>
                           </tr>
                         )}
                       </For>
                     </tbody>
                   </table>
                 </div>
               </div>
            </Show>
          </Show>

          {/* User Details Modal */}
          <Show when={showUserModal() && selectedUser()}>
             <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
               <div class="relative top-20 mx-auto p-5 border border-gray-200 dark:border-stone-700 w-96 shadow-lg rounded-md bg-white dark:bg-stone-800">
                <div class="mt-3">
                  <div class="flex items-center justify-between mb-4">
                     <h3 class="text-lg font-medium text-gray-900 dark:text-stone-100">User Details</h3>
                     <button
                       onClick={() => setShowUserModal(false)}
                       class="text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-400"
                     >
                      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <Show when={selectedUser()}>
                    {(user) => (
                      <div class="space-y-4">
                        <div>
                           <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Name</label>
                           <p class="text-sm text-gray-900 dark:text-stone-100">{user().name}</p>
                        </div>
                        <div>
                           <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Email</label>
                           <p class="text-sm text-gray-900 dark:text-stone-100">{user().email}</p>
                        </div>
                        <div>
                           <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Role</label>
                           <p class="text-sm text-gray-900 dark:text-stone-100">
                             {user().isSuperAdmin ? "Super Admin" : "User"}
                           </p>
                        </div>
                        <div>
                           <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Account Created</label>
                           <p class="text-sm text-gray-900 dark:text-stone-100">
                             {new Date(user().createdAt).toLocaleDateString()} 
                             ({user().accountAgeInDays} days ago)
                           </p>
                        </div>
                        <div>
                           <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Last Session</label>
                           <p class="text-sm text-gray-900 dark:text-stone-100">
                             <Show when={user().lastSessionAt} fallback="Never logged in">
                               {new Date(user().lastSessionAt!).toLocaleString()}
                             </Show>
                           </p>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                             <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Recipes</label>
                             <p class="text-lg font-semibold text-gray-900 dark:text-stone-100">{user().recipeCount}</p>
                           </div>
                           <div>
                             <label class="text-sm font-medium text-gray-500 dark:text-stone-400">Cookbooks</label>
                             <p class="text-lg font-semibold text-gray-900 dark:text-stone-100">{user().cookbookCount}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </PageLayout>
  );
}