import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For, createEffect, Suspense, SuspenseList, onMount } from "solid-js";
import { useAuth } from "~/lib/auth-context";
import { useParams, useNavigate } from "@solidjs/router";
import PageLayout from "~/components/PageLayout";
import { SkeletonCardGrid, SkeletonFilters, SkeletonPageHeader } from "~/components/Skeletons";
import { useBreadcrumbs, createBreadcrumbs } from "~/lib/breadcrumb-context";
import { useTags } from "~/lib/stores";
import { useConfirm, useToast } from "~/lib/notifications";

interface CookbookMember {
  id: string;
  userId: string;
  role: 'owner' | 'editor' | 'contributor' | 'reader';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface Cookbook {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  members: CookbookMember[];
  userRole: 'owner' | 'editor' | 'contributor' | 'reader';
}

interface CookbookRecipe {
  id: string;
  cookbookId: string;
  recipe: {
    id: string;
    title: string;
    description?: string;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    difficulty?: string;
    cuisine?: string;
    tags: Array<{ id: string; name: string; color: string; }>;
  };
  addedByUserId: string;
  originalRecipeId?: string;
  notes?: string;
  addedAt: string;
  addedByUser: {
    id: string;
    email: string;
    name?: string;
  };
  canEdit: boolean;
  isOriginalOwner: boolean;
}

interface PendingInvitation {
  id: string;
  cookbookId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  role: 'editor' | 'contributor' | 'reader';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  createdAt: string;
  expiresAt?: string;
  cookbook: {
    id: string;
    title: string;
    description?: string;
  };
  inviter: {
    id: string;
    email: string;
    name?: string;
  };
}

async function fetchCookbook(id: string): Promise<Cookbook> {
  const response = await fetch(`/api/cookbooks/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cookbook');
  }
  const data = await response.json();
  return data.cookbook;
}

async function fetchCookbookRecipes(id: string): Promise<CookbookRecipe[]> {
  const response = await fetch(`/api/cookbooks/${id}/recipes`);
  if (!response.ok) {
    throw new Error('Failed to fetch cookbook recipes');
  }
  const data = await response.json();
  return data.recipes;
}

async function fetchPendingInvitations(id: string): Promise<PendingInvitation[]> {
  const response = await fetch(`/api/cookbooks/${id}/invitations`);
  if (!response.ok) {
    throw new Error('Failed to fetch pending invitations');
  }
  const data = await response.json();
  return data.invitations;
}

async function resendInvitation(cookbookId: string, invitationId: string): Promise<void> {
  const response = await fetch(`/api/cookbooks/${cookbookId}/invitations/${invitationId}/resend`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resend invitation');
  }
}

async function removeMemberFromCookbook(cookbookId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/cookbooks/${cookbookId}/members?userId=${userId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove member');
  }
}

async function updateMemberRole(cookbookId: string, userId: string, role: string): Promise<void> {
  const response = await fetch(`/api/cookbooks/${cookbookId}/members`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, role }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update member role');
  }
}

function MemberRow(props: { 
  member: CookbookMember; 
  cookbook: Cookbook; 
  currentUserId: string;
  onMemberUpdate: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = createSignal(false);
  const [selectedRole, setSelectedRole] = createSignal(props.member.role);
  const [isUpdating, setIsUpdating] = createSignal(false);

  const canManageMembers = () => props.cookbook.userRole === 'owner';
  const canRemoveMember = () => {
    return canManageMembers() && props.member.userId !== props.cookbook.ownerId;
  };
  const canEditRole = () => {
    return canManageMembers() && props.member.userId !== props.cookbook.ownerId;
  };
  const isSelf = () => props.member.userId === props.currentUserId;

  const handleRoleUpdate = async () => {
    if (selectedRole() === props.member.role) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateMemberRole(props.cookbook.id, props.member.userId, selectedRole());
      setIsEditing(false);
      props.onMemberUpdate();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update member role');
      setSelectedRole(props.member.role); // Reset
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async () => {
    const confirmed = await confirm.confirm({
      title: "Remove Member",
      message: `Are you sure you want to remove ${props.member.user.name || props.member.user.email} from this cookbook?`,
      confirmText: "Remove",
      variant: "danger"
    });
    
    if (!confirmed) {
      return;
    }

    setIsUpdating(true);
    try {
      await removeMemberFromCookbook(props.cookbook.id, props.member.userId);
      props.onMemberUpdate();
      toast.success("Member removed successfully");
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'editor': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'contributor': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'reader': return 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300';
      default: return 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300';
    }
  };

  return (
    <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-stone-700 last:border-b-0">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gray-200 dark:bg-stone-600 rounded-full flex items-center justify-center">
          <span class="text-sm font-medium text-gray-600 dark:text-stone-300">
            {(props.member.user.name || props.member.user.email)[0].toUpperCase()}
          </span>
        </div>
        <div>
          <div class="font-medium flex items-center space-x-2 text-gray-900 dark:text-stone-100">
            <span>{props.member.user.name || props.member.user.email}</span>
            <Show when={isSelf()}>
              <span class="text-xs text-gray-500 dark:text-stone-400">(You)</span>
            </Show>
          </div>
          <div class="text-sm text-gray-500 dark:text-stone-400">{props.member.user.email}</div>
          <div class="text-xs text-gray-400 dark:text-stone-500">
            Joined {new Date(props.member.joinedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <Show when={!isEditing()}>
          <span class={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(props.member.role)}`}>
            {props.member.role}
          </span>
          <Show when={canEditRole()}>
            <button
              onClick={() => setIsEditing(true)}
              class="text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300 transition-colors"
              title="Edit role"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </Show>
          <Show when={canRemoveMember()}>
            <button
              onClick={handleRemoveMember}
              disabled={isUpdating()}
              class="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              title="Remove member"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </Show>
        </Show>

        <Show when={isEditing()}>
          <select
            value={selectedRole()}
            onChange={(e) => setSelectedRole(e.currentTarget.value as 'editor' | 'contributor' | 'reader')}
            class="text-xs border border-gray-300 dark:border-stone-600 rounded px-2 py-1 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="reader">Reader</option>
            <option value="contributor">Contributor</option>
            <option value="editor">Editor</option>
          </select>
          <button
            onClick={handleRoleUpdate}
            disabled={isUpdating()}
            class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 text-xs"
          >
            {isUpdating() ? '...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setSelectedRole(props.member.role);
            }}
            class="text-gray-400 dark:text-stone-500 hover:text-gray-600 dark:hover:text-stone-300 text-xs"
          >
            Cancel
          </button>
        </Show>
      </div>
    </div>
  );
}

export default function CookbookDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  
  // Invite form state
  const [showInviteForm, setShowInviteForm] = createSignal(false);
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [inviteRole, setInviteRole] = createSignal<'editor' | 'contributor' | 'reader'>('reader');
  const [inviteMessage, setInviteMessage] = createSignal("");
  const [isInviting, setIsInviting] = createSignal(false);
  const [resendingInvitation, setResendingInvitation] = createSignal<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [sortBy, setSortBy] = createSignal("addedAt");
  const [sortOrder, setSortOrder] = createSignal("desc");
  const [selectedDifficulty, setSelectedDifficulty] = createSignal("");
  const [selectedCuisine, setSelectedCuisine] = createSignal("");
  
  // Members section state
  const [showMembersSection, setShowMembersSection] = createSignal(false);
  
  // Recipe removal state
  const [removingRecipe, setRemovingRecipe] = createSignal<string | null>(null);
  
  // Client-side mounting state for SSR safety
  const [mounted, setMounted] = createSignal(false);
  
  onMount(() => {
    setMounted(true);
  });
  
  // Non-blocking auth check - redirect if needed but show content immediately
  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  // Remove early return - use conditional JSX rendering instead

  const [cookbook] = createResource(() => {
    // Only fetch on client side after auth is loaded
    if (typeof window === 'undefined') return null; // Skip SSR fetch
    if (authLoading()) return null; // Wait for auth to load
    if (!user()) return null; // Don't fetch if not authenticated
    return params.id;
  }, async (id) => {
    if (!id) return null;
    
    try {
      const encodedId = encodeURIComponent(id);
      const url = `/api/cookbooks/${encodedId}`;
      
      console.log('Fetching cookbook with URL:', url, 'for ID:', id);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('Cookbook fetch failed:', response.status, response.statusText);
        throw new Error('Failed to fetch cookbook');
      }
      
      const data = await response.json();
      console.log('Cookbook fetch successful:', data.cookbook?.title);
      return data.cookbook;
    } catch (error) {
      console.error('Cookbook fetch error:', error, 'for ID:', id);
      throw error;
    }
  });
  
  // Build query for filtering recipes
  const buildRecipeQuery = () => {
    const query = new URLSearchParams();
    if (searchQuery()) query.append("search", searchQuery());
    if (selectedTags().length > 0) query.append("tags", selectedTags().join(","));
    if (selectedDifficulty()) query.append("difficulty", selectedDifficulty());
    if (selectedCuisine()) query.append("cuisine", selectedCuisine());
    query.append("sortBy", sortBy());
    query.append("sortOrder", sortOrder());
    return query.toString();
  };
  
  const [recipes, { refetch: refetchRecipes }] = createResource(
    () => {
      // Only fetch on client side after auth is loaded
      if (typeof window === 'undefined') return null; // Skip SSR fetch
      if (authLoading()) return null; // Wait for auth to load
      if (!user()) return null; // Don't fetch if not authenticated
      return params.id ? `${params.id}?${buildRecipeQuery()}` : null;
    },
    async (queryString) => {
      if (!queryString) return [];
      
      try {
        const [id, query] = queryString.split('?');
        const encodedId = encodeURIComponent(id);
        const url = `/api/cookbooks/${encodedId}/recipes?${query || ''}`;
        
        console.log('Fetching cookbook recipes with URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          console.error('Cookbook recipes fetch failed:', response.status, response.statusText);
          throw new Error('Failed to fetch cookbook recipes');
        }
        
        const data = await response.json();
        console.log('Cookbook recipes fetch successful:', data.recipes?.length || 0, 'recipes');
        return data.recipes;
      } catch (error) {
        console.error('Cookbook recipes fetch error:', error);
        throw error;
      }
    }
  );
  
  const [pendingInvitations, { refetch: refetchInvitations }] = createResource(() => {
    // Only fetch on client side after auth is loaded
    if (typeof window === 'undefined') return null; // Skip SSR fetch
    if (authLoading()) return null; // Wait for auth to load
    if (!user()) return null; // Don't fetch if not authenticated
    return params.id;
  }, async (id) => {
    if (!id) return [];
    
    try {
      const encodedId = encodeURIComponent(id);
      const url = `/api/cookbooks/${encodedId}/invitations`;
      
      console.log('Fetching pending invitations with URL:', url, 'for ID:', id);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.log('Pending invitations fetch failed:', response.status, 'returning empty array');
        return [];
      }
      
      const data = await response.json();
      console.log('Pending invitations fetch successful:', data.invitations?.length || 0, 'invitations');
      return data.invitations;
    } catch (error) {
      console.error('Pending invitations fetch error:', error, 'returning empty array');
      return [];
    }
  });
  
  // Use optimized tags store (only on client after mount)
  const tagsStore = mounted() ? useTags() : { data: () => [], loading: () => false, error: () => null };
  
  // Use breadcrumb context
  const breadcrumbContext = useBreadcrumbs();
  
  // Update breadcrumbs when cookbook data changes
  createEffect(() => {
    const cookbookData = cookbook();
    if (cookbookData) {
      breadcrumbContext.setBreadcrumbs(
        createBreadcrumbs.cookbook(cookbookData.title, cookbookData.id)
      );
    }
  });

  const handleInviteUser = async (e: Event) => {
    e.preventDefault();
    if (!inviteEmail().trim()) return;

    setIsInviting(true);
    try {
      const response = await fetch(`/api/cookbooks/${params.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteeEmail: inviteEmail(),
          role: inviteRole(),
          message: inviteMessage() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }

      setInviteEmail("");
      setInviteRole('reader');
      setInviteMessage("");
      setShowInviteForm(false);
      refetchInvitations(); // Refresh the pending invitations list
      toast.success('Invitation sent successfully!');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleForkRecipe = async (recipeId: string) => {
    if (!params.id) return;

    try {
      const response = await fetch(`/api/cookbooks/${params.id}/recipes/${recipeId}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modifications: {} }), // No modifications, just fork as-is
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fork recipe');
      }

      // Refresh the recipes list
      refetchRecipes();
      toast.success('Recipe forked successfully! You now have your own copy to edit.');
    } catch (error) {
      console.error('Failed to fork recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fork recipe');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!params.id) return;

    setResendingInvitation(invitationId);
    try {
      await resendInvitation(params.id, invitationId);
      refetchInvitations();
      toast.success('Invitation resent successfully!');
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setResendingInvitation(null);
    }
  };

  const handleRemoveRecipe = async (cookbookRecipeId: string, recipeTitle: string) => {
    if (!params.id) return;

    const confirmed = await confirm.confirm({
      title: "Remove Recipe",
      message: `Are you sure you want to remove "${recipeTitle}" from this cookbook?`,
      confirmText: "Remove",
      variant: "danger"
    });
    
    if (!confirmed) {
      return;
    }

    setRemovingRecipe(cookbookRecipeId);
    try {
      const response = await fetch(`/api/cookbooks/${params.id}/recipes/${cookbookRecipeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove recipe');
      }

      refetchRecipes();
      toast.success(`"${recipeTitle}" removed from cookbook`);
    } catch (error) {
      console.error('Failed to remove recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove recipe');
    } finally {
      setRemovingRecipe(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'editor': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'contributor': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'reader': return 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300';
      default: return 'bg-gray-100 dark:bg-stone-700 text-gray-800 dark:text-stone-300';
    }
  };

  const canInvite = () => {
    const cb = cookbook();
    return cb && ['owner', 'editor'].includes(cb.userRole);
  };

  const toggleTag = (tagId: string) => {
    const current = selectedTags();
    if (current.includes(tagId)) {
      setSelectedTags(current.filter(id => id !== tagId));
    } else {
      setSelectedTags([...current, tagId]);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
    }
    return `${mins}m`;
  };

  // Get unique values for filter dropdowns
  const getUniqueValues = (field: 'difficulty' | 'cuisine') => {
    const recipesList = recipes();
    if (!recipesList) return [];
    
    const values = recipesList
      .map(r => r.recipe[field])
      .filter(v => v && v.trim())
      .filter((v, i, arr) => arr.indexOf(v) === i);
    
    return values.sort();
  };

  // Breadcrumbs are now handled by the context in the createEffect above

  const headerActions = () => (
    <div class="flex items-center gap-2 sm:gap-3">
      <Show when={cookbook()}>
        <span class={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(cookbook()!.userRole)}`}>
          {cookbook()!.userRole}
        </span>
        <Show when={['owner', 'editor'].includes(cookbook()!.userRole)}>
          <a
            href={`/cookbooks/${cookbook()!.id}/settings`}
            class="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-1 sm:gap-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            <span class="hidden sm:inline">Settings</span>
          </a>
        </Show>
        <Show when={['owner', 'editor', 'contributor'].includes(cookbook()!.userRole)}>
          <a
            href={`/cookbooks/${cookbook()!.id}/add-recipe`}
            class="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center"
          >
            <span class="hidden sm:inline">Add Recipe</span>
            <span class="sm:hidden">Add</span>
          </a>
        </Show>
      </Show>
    </div>
  );

  return (
    <>
      <Title>{cookbook()?.title || 'Loading...'} - Recipe Curator</Title>
      {/* Show skeleton while auth is loading */}
      {authLoading() || !user() || cookbook.loading ? (
        <main class="min-h-screen bg-gray-50 dark:bg-stone-900 pt-16">
          <div class="max-w-7xl mx-auto px-4 py-8">
            <SkeletonPageHeader />
            <SkeletonFilters />
            <SkeletonCardGrid count={6} />
          </div>
        </main>
      ) : (
        <PageLayout
          title={cookbook()?.title}
          subtitle={cookbook() ? `Created ${new Date(cookbook()!.createdAt).toLocaleDateString()} • ${cookbook()!.members.length} member${cookbook()!.members.length !== 1 ? 's' : ''}` : undefined}
          headerActions={headerActions()}

          loading={cookbook.loading}
          error={cookbook.error ? 'Cookbook not found or access denied' : undefined}
        >

                {/* Search and Filters */}
                <div class="bg-white dark:bg-stone-800 rounded-lg shadow-md p-6 mb-8">
                  <div class="flex flex-col lg:flex-row gap-4 mb-6">
                    <div class="flex-1">
                      <input
                        type="text"
                        placeholder="Search recipes in this cookbook..."
                        value={searchQuery()}
                        onInput={(e) => setSearchQuery(e.currentTarget.value)}
                        class="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-500 dark:placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    
                    <div class="flex flex-wrap gap-2">
                      <select
                        value={sortBy()}
                        onChange={(e) => setSortBy(e.currentTarget.value)}
                        class="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="addedAt">Sort by Date Added</option>
                        <option value="title">Sort by Title</option>
                        <option value="cookTime">Sort by Cook Time</option>
                        <option value="difficulty">Sort by Difficulty</option>
                      </select>
                      
                      <select
                        value={sortOrder()}
                        onChange={(e) => setSortOrder(e.currentTarget.value)}
                        class="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                      
                      <select
                        value={selectedDifficulty()}
                        onChange={(e) => setSelectedDifficulty(e.currentTarget.value)}
                        class="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">All Difficulties</option>
                        <For each={getUniqueValues('difficulty')}>
                          {(difficulty) => <option value={difficulty}>{difficulty}</option>}
                        </For>
                      </select>
                      
                      <select
                        value={selectedCuisine()}
                        onChange={(e) => setSelectedCuisine(e.currentTarget.value)}
                        class="px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">All Cuisines</option>
                        <For each={getUniqueValues('cuisine')}>
                          {(cuisine) => <option value={cuisine}>{cuisine}</option>}
                        </For>
                      </select>
                    </div>
                  </div>

                  <Show when={tagsStore.data()}>
                    <div>
                      <h3 class="text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Filter by tags:</h3>
                      <div class="flex flex-wrap gap-2">
                        <For each={tagsStore.data()}>
                          {(tag) => (
                            <button
                              onClick={() => toggleTag(tag.id)}
                              class={`px-3 py-1 rounded-full text-sm transition-colors ${
                                selectedTags().includes(tag.id)
                                  ? "bg-emerald-600 text-white"
                                  : "bg-gray-200 dark:bg-stone-600 text-gray-700 dark:text-stone-300 hover:bg-gray-300 dark:hover:bg-stone-500"
                              }`}
                              style={{ "background-color": selectedTags().includes(tag.id) ? tag.color : undefined }}
                            >
                              {tag.name}
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </div>

                {/* Invite Form */}
                <Show when={showInviteForm()}>
                <div class="bg-white dark:bg-stone-800 rounded-lg shadow-md p-6 mb-8">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-4">Invite Member</h2>
                    <form onSubmit={handleInviteUser}>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label for="inviteEmail" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                            Email Address *
                          </label>
                          <input
                            id="inviteEmail"
                            type="email"
                            value={inviteEmail()}
                            onInput={(e) => setInviteEmail(e.currentTarget.value)}
                            class="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-500 dark:placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                        <div>
                          <label for="inviteRole" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                            Role *
                          </label>
                          <select
                            id="inviteRole"
                            value={inviteRole()}
                            onChange={(e) => setInviteRole(e.currentTarget.value as 'editor' | 'contributor' | 'reader')}
                            class="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="reader">Reader (view only)</option>
                            <option value="contributor">Contributor (can add recipes)</option>
                            <option value="editor">Editor (can add/remove recipes and edit cookbook)</option>
                          </select>
                        </div>
                      </div>
                      <div class="mb-4">
                        <label for="inviteMessage" class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                          Optional Message
                        </label>
                        <textarea
                          id="inviteMessage"
                          value={inviteMessage()}
                          onInput={(e) => setInviteMessage(e.currentTarget.value)}
                          class="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 placeholder-gray-500 dark:placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Add a personal message to the invitation"
                          rows="3"
                        />
                      </div>
                      <div class="flex space-x-3">
                        <button
                          type="submit"
                          disabled={isInviting()}
                          class="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {isInviting() ? 'Sending...' : 'Send Invitation'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInviteForm(false)}
                          class="bg-gray-300 dark:bg-stone-600 text-gray-700 dark:text-stone-300 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-stone-500 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </Show>



                  {/* Recipes */}
                  <div class="mb-8">
                  <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-stone-100">
                      Recipes {recipes() ? `(${recipes()!.length})` : ''}
                    </h2>
                  </div>

                  <Show when={recipes.loading}>
                    <SkeletonCardGrid count={6} />
                  </Show>

                  <Show when={recipes.error}>
                    <div class="text-center py-8">
                      <div class="text-red-600 dark:text-red-400">Failed to load recipes</div>
                    </div>
                  </Show>

                  <Show when={recipes() && recipes()!.length === 0}>
                    <div class="text-center py-12 bg-white dark:bg-stone-800 rounded-lg shadow-md">
                      <div class="text-gray-400 dark:text-stone-500 text-6xl mb-4">🍽️</div>
                      <h3 class="text-xl font-medium text-gray-900 dark:text-stone-100 mb-2">No recipes found</h3>
                      <p class="text-gray-600 dark:text-stone-400 mb-6">
                        {searchQuery() || selectedTags().length > 0 || selectedDifficulty() || selectedCuisine() 
                          ? "Try adjusting your search or filters" 
                          : "Add recipes to start building this cookbook"}
                      </p>
                       <Show when={['owner', 'editor', 'contributor'].includes(cookbook()!.userRole)}>
                         <a
                           href={`/cookbooks/${cookbook()!.id}/add-recipe`}
                          class="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          {searchQuery() || selectedTags().length > 0 || selectedDifficulty() || selectedCuisine() 
                            ? "Add Recipe" 
                            : "Add First Recipe"}
                        </a>
                      </Show>
                    </div>
                  </Show>

                  <Show when={recipes() && recipes()!.length > 0}>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <For each={recipes()}>
                         {(recipeEntry) => (
                           <div 
                             class="bg-white dark:bg-stone-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                             onClick={() => navigate(`/recipe/${recipeEntry.recipe.id}?from=cookbook&cookbookId=${cookbook()!.id}`)}
                           >
                             <Show when={recipeEntry.recipe.imageUrl}>
                               <img
                                 src={recipeEntry.recipe.imageUrl}
                                 alt={recipeEntry.recipe.title}
                                 class="w-full h-48 object-cover"
                               />
                             </Show>
                             
                             <div class="p-6">
                               <h3 class="text-xl font-semibold text-gray-900 dark:text-stone-100 mb-2">{recipeEntry.recipe.title}</h3>
                               
                               <Show when={recipeEntry.recipe.description}>
                                 <p class="text-gray-600 dark:text-stone-400 mb-3 line-clamp-2">{recipeEntry.recipe.description}</p>
                               </Show>

                               <div class="flex flex-wrap gap-2 mb-3">
                                 <Show when={recipeEntry.recipe.cookTime}>
                                   <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                     🕐 {formatTime(recipeEntry.recipe.cookTime)}
                                   </span>
                                 </Show>
                                 <Show when={recipeEntry.recipe.servings}>
                                   <span class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                                     👥 {recipeEntry.recipe.servings} servings
                                   </span>
                                 </Show>
                                 <Show when={recipeEntry.recipe.difficulty}>
                                   <span class="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded-full">
                                     {recipeEntry.recipe.difficulty}
                                   </span>
                                 </Show>
                               </div>

                               <Show when={recipeEntry.recipe.tags && recipeEntry.recipe.tags.length > 0}>
                                 <div class="flex flex-wrap gap-1 mb-4">
                                   <For each={recipeEntry.recipe.tags}>
                                     {(tag) => (
                                       <span
                                         class="px-2 py-1 text-xs rounded-full text-white"
                                         style={{ "background-color": tag.color }}
                                       >
                                         {tag.name}
                                       </span>
                                     )}
                                   </For>
                                 </div>
                               </Show>

                               <div class="text-xs text-gray-500 dark:text-stone-400 mb-3">
                                 <div>Added by {recipeEntry.addedByUser.name || recipeEntry.addedByUser.email}</div>
                                 <div>{new Date(recipeEntry.addedAt).toLocaleDateString()}</div>
                                 <Show when={recipeEntry.isOriginalOwner}>
                                   <div class="text-green-600 dark:text-green-400 font-medium">Your Recipe</div>
                                 </Show>
                               </div>

                               <Show when={recipeEntry.notes}>
                                 <div class="bg-gray-50 dark:bg-stone-700 p-2 rounded text-sm text-gray-600 dark:text-stone-300 mb-3">
                                   <strong>Notes:</strong> {recipeEntry.notes}
                                 </div>
                               </Show>

                               <div class="flex justify-between items-center">
                                 <div class="flex space-x-2">
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       navigate(`/recipe/${recipeEntry.recipe.id}?from=cookbook&cookbookId=${cookbook()!.id}`);
                                     }}
                                     class="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 px-2 py-1 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800"
                                   >
                                     View
                                   </button>
                                   <Show when={recipeEntry.canEdit}>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         navigate(`/recipe/${recipeEntry.recipe.id}?edit=true&from=cookbook&cookbookId=${cookbook()!.id}`);
                                       }}
                                       class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                                     >
                                       Edit
                                     </button>
                                   </Show>
                                    <Show when={!recipeEntry.canEdit && ['owner', 'editor'].includes(cookbook()!.userRole)}>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleForkRecipe(recipeEntry.recipe.id);
                                       }}
                                       class="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-2 py-1 rounded hover:bg-orange-200 dark:hover:bg-orange-800"
                                     >
                                       Fork
                                     </button>
                                   </Show>
                                 </div>
                                 <Show when={['owner', 'editor'].includes(cookbook()!.userRole) || (cookbook()!.userRole === 'contributor' && recipeEntry.addedByUserId === user()!.id)}>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleRemoveRecipe(recipeEntry.id, recipeEntry.recipe.title);
                                     }}
                                     disabled={removingRecipe() === recipeEntry.id}
                                     class="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50"
                                     title="Remove from cookbook"
                                   >
                                     {removingRecipe() === recipeEntry.id ? '...' : 'Remove'}
                                   </button>
                                 </Show>
                               </div>
                             </div>
                           </div>
                         )}
                       </For>
                     </div>
                   </Show>
                 </div>

                 {/* Members & Management Section */}
                 <div class="bg-white dark:bg-stone-800 rounded-lg shadow-md p-6">
                  <div class="flex justify-between items-center mb-4">
                    <button
                      onClick={() => setShowMembersSection(!showMembersSection())}
                      class="flex items-center space-x-2 text-left text-gray-900 dark:text-stone-100"
                    >
                      <h2 class="text-xl font-semibold">Cookbook Management</h2>
                      <svg 
                        class={`w-5 h-5 transform transition-transform ${showMembersSection() ? 'rotate-180' : ''}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <div class="flex items-center space-x-2">
                       <span class="text-sm text-gray-500 dark:text-stone-400">{cookbook()!.members.length} member{cookbook()!.members.length !== 1 ? 's' : ''}</span>
                      <Show when={canInvite()}>
                        <button
                          onClick={() => setShowInviteForm(!showInviteForm())}
                          class="bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 transition-colors text-sm"
                        >
                          + Invite Member
                        </button>
                      </Show>
                    </div>
                  </div>

                  <Show when={showMembersSection()}>
                    <div class="space-y-6">
                      {/* Members List */}
                      <div>
                         <h3 class="text-lg font-medium text-gray-900 dark:text-stone-100 mb-3">Members ({cookbook()!.members.length})</h3>
                         <div class="space-y-3">
                           <For each={cookbook()!.members}>
                             {(member) => (
                               <MemberRow 
                                 member={member} 
                                 cookbook={cookbook()!}
                                currentUserId={user()!.id}
                                onMemberUpdate={() => window.location.reload()}
                              />
                            )}
                          </For>
                        </div>
                      </div>

                       {/* Pending Invitations */}
                        <Show when={['owner', 'editor'].includes(cookbook()!.userRole) && pendingInvitations() && pendingInvitations()!.length > 0}>
                        <div>
                          <h3 class="text-lg font-medium text-gray-900 dark:text-stone-100 mb-3">Pending Invitations ({pendingInvitations()!.length})</h3>
                          <div class="space-y-3">
                            <For each={pendingInvitations()}>
                              {(invitation) => (
                                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-stone-700 rounded-lg">
                                  <div class="flex-1">
                                    <div class="flex items-center gap-3">
                                      <div>
                                        <p class="font-medium text-gray-900 dark:text-stone-100">{invitation.inviteeEmail}</p>
                                        <p class="text-sm text-gray-500 dark:text-stone-400">
                                          Invited as {invitation.role} • {new Date(invitation.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <Show when={invitation.message}>
                                      <p class="text-sm text-gray-600 dark:text-stone-300 mt-1 italic">"{invitation.message}"</p>
                                    </Show>
                                  </div>
                                  <div class="flex items-center gap-2">
                                    <span class={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(invitation.role)}`}>
                                      {invitation.role}
                                    </span>
                                    <button
                                      onClick={() => handleResendInvitation(invitation.id)}
                                      disabled={resendingInvitation() === invitation.id}
                                      class="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
                                    >
                                      {resendingInvitation() === invitation.id ? 'Sending...' : 'Resend'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>
        </PageLayout>
      )}
    </>
  );
}