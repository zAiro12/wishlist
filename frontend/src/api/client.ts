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
  if (token) {
    try {
      const safe = String(token).slice(0, 8) + '...';
      console.info('API request', path, 'using token prefix', safe);
    } catch (e) { void e; }
  } else {
    console.info('API request', path, 'no token present in storage');
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // Always include credentials so server-set HttpOnly cookies are sent
    credentials: 'include',
  };

  const res = await fetch(`${API_BASE}${path}`, fetchOptions);

  if (!res.ok) {
    // --- INIZIO blocco refresh ---
    if (res.status === 401) {
      const newToken = await tryRefresh()
      if (newToken) {
        // Riprova la richiesta originale con il nuovo token
        const retryHeaders: Record<string, string> = {
          ...(options.headers as Record<string, string> ?? {}),
        }
        if (hasBody) retryHeaders['Content-Type'] = 'application/json'
        retryHeaders['Authorization'] = `Bearer ${newToken}`

        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        })

        if (retryRes.ok) {
          if (retryRes.status === 204) return undefined as T
          try {
            const text = await retryRes.text()
            if (!text) return undefined as T
            return JSON.parse(text) as T
          } catch {
            return undefined as T
          }
        }

        // Il retry ha fallito — se ancora 401, forza logout
        if (retryRes.status === 401) {
          try { localStorage.removeItem('token') } catch { /* ignore */ }
          try { sessionStorage.removeItem('token') } catch { /* ignore */ }
          window.location.href = '/login'
          return undefined as T
        }

        // Altro errore nel retry
        let retryData: { error: string; issues?: unknown[] }
        try { retryData = await retryRes.json() }
        catch { retryData = { error: retryRes.statusText } }
        throw new ApiError(retryRes.status, retryData)
      }

      // Refresh fallito — forza logout
      try { localStorage.removeItem('token') } catch { /* ignore */ }
      try { sessionStorage.removeItem('token') } catch { /* ignore */ }
      window.location.href = '/login'
      return undefined as T
    }
    // --- FINE blocco refresh ---

    let data: { error: string; issues?: unknown[] };
    try { data = await res.json() }
    catch { data = { error: res.statusText } }
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;

  // Some endpoints may return 200 with an empty body. Handle empty responses
  // gracefully instead of throwing on JSON parse errors so callers can treat
  // HTTP 200 as success even when no JSON is present.
  try {
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } catch (e) {
    // Parsing failed — log for debugging and return undefined to treat as success
    // in callers that only care about the HTTP status.
    console.error('Errore nel parsing della risposta JSON per', path, e);
    return undefined as T;
  }
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'GET',
        credentials: 'include',
        headers: (() => {
          try {
            const t = localStorage.getItem('token') ?? sessionStorage.getItem('token')
            return (t ? { Authorization: `Bearer ${t}` } : {}) as Record<string, string>
          } catch { return {} as Record<string, string> }
        })(),
      })
      if (!res.ok) return null
      const data = await res.json() as { token: string }
      try { localStorage.setItem('token', data.token) } catch {
        try { sessionStorage.setItem('token', data.token) } catch { /* ignore */ }
      }
      return data.token
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
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
  updateBirthdate: (birthdate: string) =>
    request<{ birthdate: string }>('/api/users/me/birthdate', {
      method: 'PATCH',
      body: JSON.stringify({ birthdate }),
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

  join: (groupId: string) =>
    request<import('../types').GroupMember>(`/api/groups/${groupId}/join`, { method: 'POST' }),
  invitePreview: (groupId: string) =>
    request<{ id: string; name: string; description: string | null; owner: { id: string; givenName: string | null; familyName: string | null } | null; memberCount: number; isMember: boolean }>(`/api/groups/${groupId}/invite-preview`),

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
  }) =>
    request<import('../types').WishlistItem>('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (
    itemId: string,
    data: { title?: string; description?: string; url?: string; imageUrl?: string }
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
