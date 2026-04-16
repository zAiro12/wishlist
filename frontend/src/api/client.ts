const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: { error: string; issues?: unknown[] }
  ) {
    super(data.error);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const hasBody = options.body !== undefined && options.body !== null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Only set Content-Type when actually sending a JSON body
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  function readToken(): string | null {
    try { return localStorage.getItem('token') ?? sessionStorage.getItem('token'); }
    catch { return null; }
  }
  const token = readToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // Always include credentials so server-set HttpOnly cookies are sent
    credentials: 'include',
  };

  const res = await fetch(`${API_BASE}${path}`, fetchOptions);

  if (!res.ok) {
    let data: { error: string; issues?: unknown[] };
    try {
      data = await res.json();
    } catch {
      data = { error: res.statusText };
    }
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  loginUrl: (provider: 'google' | 'github' | 'microsoft') =>
    `${API_BASE}/api/auth/login?provider=${provider}`,

  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  me: () => request<import('../types').User>('/api/users/me'),
  updateProfile: (data: { givenName?: string; familyName?: string; birthdate?: string }) =>
    request<import('../types').User>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groups = {
  list: () => request<import('../types').Group[]>('/api/groups'),
  create: (data: { name: string; description?: string }) =>
    request<import('../types').Group>('/api/groups', { method: 'POST', body: JSON.stringify(data) }),
  get: (groupId: string) => request<import('../types').Group>(`/api/groups/${groupId}`),
  update: (groupId: string, data: { name?: string; description?: string }) =>
    request<import('../types').Group>(`/api/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (groupId: string) =>
    request<{ message: string }>(`/api/groups/${groupId}`, { method: 'DELETE' }),

  members: {
    list: (groupId: string) =>
      request<import('../types').GroupMember[]>(`/api/groups/${groupId}/members`),
    join: (groupId: string) =>
      request<import('../types').GroupMember>(`/api/groups/${groupId}/members`, { method: 'POST' }),
    leave: (groupId: string) =>
      request<{ message: string }>(`/api/groups/${groupId}/members`, { method: 'DELETE' }),
    remove: (groupId: string, userId: string) =>
      request<{ message: string }>(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE',
      }),
  },

  transfer: (groupId: string, newOwnerId: string) =>
    request<import('../types').Group>(`/api/groups/${groupId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ newOwnerId }),
    }),

  wishlists: (groupId: string) =>
    request<import('../types').WishlistItem[]>(`/api/groups/${groupId}/wishlists`),

  nextCelebrated: (groupId: string) =>
    request<{ nextCelebrated: import('../types').User[]; daysUntil: number | null }>(
      `/api/groups/${groupId}/next-celebrated`
    ),
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const wishlist = {
  list: () => request<import('../types').WishlistItem[]>('/api/wishlist'),
  create: (data: {
    title: string;
    description?: string;
    url?: string;
    imageUrl?: string;
    priority?: number;
  }) =>
    request<import('../types').WishlistItem>('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (
    itemId: string,
    data: { title?: string; description?: string; url?: string; imageUrl?: string; priority?: number }
  ) =>
    request<import('../types').WishlistItem>(`/api/wishlist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (itemId: string) =>
    request<{ message: string }>(`/api/wishlist/${itemId}`, { method: 'DELETE' }),
};

// ─── Wishlist Status ──────────────────────────────────────────────────────────

export const wishlistStatus = {
  set: (
    itemId: string,
    data: { status: 'PRENOTATO' | 'COMPRATO'; groupId: string; version: number }
  ) =>
    request<import('../types').WishlistItemStatus>(`/api/wishlist-status/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  clear: (itemId: string, data: { groupId: string; version: number }) =>
    request<import('../types').WishlistItemStatus>(`/api/wishlist-status/${itemId}`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const admin = {
  users: {
    list: (params: { page?: number; limit?: number; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      if (params.search) q.set('search', params.search);
      return request<{ users: import('../types').User[]; total: number; page: number; limit: number }>(
        `/api/admin/users?${q.toString()}`
      );
    },
    update: (userId: string, data: { action: 'ban' | 'unban' | 'disable' | 'enable'; reason?: string }) =>
      request<import('../types').User>(`/api/admin/users?id=${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  groups: {
    list: (params: { page?: number; limit?: number; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      if (params.search) q.set('search', params.search);
      return request<{ groups: import('../types').Group[]; total: number; page: number; limit: number }>(
        `/api/admin/groups?${q.toString()}`
      );
    },
  },
  wishlists: {
    list: (params: { page?: number; limit?: number; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      if (params.search) q.set('search', params.search);
      return request<{
        items: import('../types').WishlistItem[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/admin/wishlists?${q.toString()}`);
    },
  },
  audit: {
    list: (params: { page?: number; limit?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      return request<{
        actions: import('../types').AdminAction[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/admin/audit?${q.toString()}`);
    },
  },
};
