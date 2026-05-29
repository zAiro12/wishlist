const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function readToken(): string | null {
  try {
    const storageToken = localStorage.getItem('token');
    if (storageToken) return storageToken;

    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;

    return null;
  } catch {
    return null;
  }
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

function buildRequestHeaders(options: RequestInit, hasBody: boolean): Record<string, string> {
  const headers = normalizeHeaders(options.headers);

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const token = readToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function buildRefreshHeaders(): Record<string, string> {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJsonResponse<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  return JSON.parse(text) as T;
}

async function readErrorResponse(response: Response): Promise<{ error: string; issues?: unknown[] }> {
  try {
    return (await response.json()) as { error: string; issues?: unknown[] };
  } catch {
    return { error: response.statusText };
  }
}

async function retryRequest<T>(
  path: string,
  options: RequestInit,
  hasBody: boolean,
  token: string
): Promise<T | null> {
  const retryHeaders = normalizeHeaders(options.headers);
  if (hasBody) {
    retryHeaders['Content-Type'] = 'application/json';
  }
  retryHeaders['Authorization'] = `Bearer ${token}`;

  const retryRes = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: retryHeaders,
    credentials: 'include',
  });

  if (retryRes.ok) {
    return (await readJsonResponse<T>(retryRes)) ?? null;
  }

  throw new ApiError(retryRes.status, await readErrorResponse(retryRes));
}

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
  const headers = buildRequestHeaders(options, hasBody);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // Always include credentials so server-set HttpOnly cookies are sent
    credentials: 'include',
  };

  const res = await fetch(`${API_BASE}${path}`, fetchOptions);

  if (!res.ok) {
    if (res.status === 401) {
      const newToken = await tryRefresh()
      if (newToken) {
        const retryResult = await retryRequest<T>(path, options, hasBody, newToken)
        if (retryResult !== null) return retryResult
      }

      throw new ApiError(res.status, await readErrorResponse(res))
    }

    throw new ApiError(res.status, await readErrorResponse(res));
  }

  return (await readJsonResponse<T>(res)) as T;
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
        headers: buildRefreshHeaders(),
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
  sharedWishlist: (userId: string) =>
    request<import('../types').SharedWishlistResponse>(`/api/users/${userId}/wishlist`),
  updateProfile: (data: { givenName?: string; familyName?: string; avatarUrl?: string; birthdate?: string }) =>
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

  gifts: {
    list: (groupId: string) => request<import('../types').GroupGiftBatch[]>(`/api/groups/${groupId}/gifts`),
    create: (
      groupId: string,
      data: {
        title: string;
        note?: string;
        totalAmountCents: number;
        paidByUserId: string;
        paidAt: string;
        beneficiaryUserIds: string[];
        settlements: Array<{ userId: string; amountCents: number }>;
      }
    ) =>
      request<{ message: string }>(`/api/groups/${groupId}/gifts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateSettlement: (
      groupId: string,
      giftId: string,
      data: { settlementId: string; settled: boolean }
    ) =>
      request<import('../types').GroupGiftSettlement>(`/api/groups/${groupId}/gifts/${giftId}/settlements`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  wishlists: (groupId: string) =>
    request<import('../types').WishlistItem[]>(`/api/groups/${groupId}/wishlists`),

  nextCelebrated: (groupId: string) =>
    request<{ nextCelebrated: import('../types').GroupUserBirthdaySummary[]; daysUntil: number | null }>(
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

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  get: () => request<Record<string, string>>('/api/settings'),
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
    getById: (userId: string) =>
      request<import('../types').User>(`/api/admin/users?id=${userId}`),
    update: (userId: string, data: {
      action?: 'ban' | 'unban' | 'disable' | 'enable';
      reason?: string;
      givenName?: string;
      familyName?: string;
      avatarUrl?: string;
      birthdate?: string;
      role?: 'USER' | 'ADMIN';
    }) =>
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
  settings: {
    get: () => request<Record<string, string>>('/api/admin/settings'),
    set: (key: string, value: string) =>
      request<{ key: string; value: string }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      }),
  },
  push: {
    sendBroadcast: (data: { payload: Record<string, unknown>; scheduledFor?: string; userIds?: string[] }) =>
      request<{ ok: boolean; scheduled: boolean; id?: string; scheduledFor?: string }>('/api/push/send-all', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
