// Utility for making API calls with proper URL handling
export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // On server side, use localhost (this shouldn't happen with our auth-gated resources)
  if (typeof window === 'undefined') {
    // You might need to adjust this based on your dev/prod setup
    const baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${normalizedPath}`;
  }
  
  // On client side, use current origin
  return `${window.location.origin}${normalizedPath}`;
}

// Enhanced fetch wrapper with error handling
export async function apiCall<T = any>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path);
  
  console.log('🔍 apiCall:', { 
    path, 
    url, 
    method: options.method || 'GET',
    hasBody: !!options.body,
    hasSignal: !!options.signal
  });
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies in requests
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  console.log('🔍 apiCall response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ apiCall error response:', { 
      status: response.status, 
      statusText: response.statusText, 
      errorText 
    });
    
    let errorMessage: string;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    
    console.log('❌ Throwing error:', errorMessage);
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

// Specific API methods
export const api = {
  // Generic call method
  call: apiCall,

  // Specific methods
  // Auth
  async checkAuth() {
    return apiCall<{ user: any }>('/api/auth/me');
  },

  async checkAuthWithTimeout(signal?: AbortSignal) {
    return apiCall<{ user: any }>('/api/auth/me', {
      signal
    });
  },

  async login(email: string, password: string) {
    console.log('🔍 API client login called:', { email, passwordLength: password.length });
    
    const requestBody = { email, password };
    const jsonBody = JSON.stringify(requestBody);
    
    console.log('🔍 Request body object:', requestBody);
    console.log('🔍 JSON string being sent:', jsonBody);
    
    try {
      const result = await apiCall<{ user: any }>('/api/auth/login', {
        method: 'POST',
        body: jsonBody,
      });
      
      console.log('✅ API client login successful:', result);
      return result;
    } catch (error) {
      console.error('❌ API client login failed:', error);
      throw error;
    }
  },

  async register(email: string, password: string, name?: string) {
    return apiCall<{ user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async logout() {
    return apiCall('/api/auth/logout', { method: 'POST' });
  },

  // Resources
  async getTags() {
    return apiCall<{ tags: any[] }>('/api/tags');
  },

  async getRecipes(params?: URLSearchParams) {
    const path = params ? `/api/recipes?${params.toString()}` : '/api/recipes';
    return apiCall<{ recipes: any[] }>(path);
  },

  async getCookbooks() {
    return apiCall<{ cookbooks: any[] }>('/api/cookbooks');
  },

  async getGroceryLists() {
    return apiCall<{ groceryLists: any[] }>('/api/grocery-lists');
  },

  async getInvitations() {
    return apiCall<{ invitations: any[] }>('/api/invitations');
  },

  async respondToInvitation(invitationId: string, response: 'accepted' | 'declined') {
    return apiCall(`/api/invitations/${invitationId}`, {
      method: 'PUT',
      body: JSON.stringify({ response }),
    });
  },
};