import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';
import { auth as authApi } from '../api/client';
import { ApiError } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  // token stored client-side (localStorage preferred, sessionStorage fallback)
  const token = ref<string | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  function readToken(): string | null {
    try { return localStorage.getItem('token') ?? sessionStorage.getItem('token'); }
    catch { return null; }
  }

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const needsBirthdate = computed(
    () => user.value !== null && (!user.value.birthdate || !user.value.birthdateConfirmed)
  );

  async function fetchUser(force = false): Promise<void> {
    if (initialized.value && !force) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const tokenLocal = readToken();
      console.debug('🔐 fetchUser: tokenLocal from readToken():', tokenLocal ? tokenLocal.slice(0, 50) + '...' : 'NULL');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}),
      };
      console.debug('📤 fetchUser: request headers:', { 'Content-Type': 'application/json', Authorization: tokenLocal ? 'Bearer ' + tokenLocal.slice(0, 20) + '...' : '(none)' });
      
      const res = await fetch(`${apiBase}/api/users/me`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      
      console.debug('📥 fetchUser: response status:', res.status);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.warn('⚠️ fetchUser: got 401/403, clearing user');
          user.value = null;
          // Mark as initialized even on auth failures so callers know we've
          // attempted an authenticated request. Other non-auth errors should
          // not flip this flag so retries remain possible.
          initialized.value = true;
          return;
        }
        let text = '';
        try {
          const j = await res.json();
          text = j.error ?? JSON.stringify(j);
        } catch {
          text = res.statusText;
        }
        console.error('❌ fetchUser: API error:', res.status, text);
        throw new ApiError(res.status, { error: text });
      }

      user.value = await res.json();
      console.debug('✅ fetchUser: user loaded:', user.value);
      initialized.value = true;
    } catch (err) {
      console.error('❌ fetchUser: caught error:', err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        user.value = null;
        initialized.value = true;
      } else {
        throw err;
      }
    }
  }


  function login(provider: 'google' | 'github' | 'microsoft'): void {
    // Preserve any `redirect` query parameter on the login page so the backend
    // can forward it through the OAuth flow and the frontend can resume.
    const currentParams = new URLSearchParams(window.location.search);
    const redirect = currentParams.get('redirect');
    const base = authApi.loginUrl(provider);
    const target = redirect ? `${base}&redirect=${encodeURIComponent(redirect)}` : base;
    window.location.href = target;
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearSession();
    // Full page reload to the app's login route so the browser re-evaluates
    // the server session (cookie) from scratch. If the logout request failed
    // and the cookie is still valid, main.ts will re-authenticate the user on
    // reload; if it succeeded, fetchUser returns 401 and the user stays on
    // /login.
    const loginUrl = new URL('login', `${window.location.origin}${import.meta.env.BASE_URL}`);
    window.location.href = loginUrl.toString();
  }

  // client-side token storage removed; cookie-based sessions are used.

  async function refreshUser(): Promise<void> {
    await fetchUser();
  }

  function setToken(t: string | null): void {
    token.value = t;
  }

  async function initFromStorage(): Promise<void> {
    console.debug('🚀 auth.initFromStorage(): checking for persisted token');
    const stored = readToken();
    if (stored) {
      console.debug('✅ auth.initFromStorage(): token found:', stored.slice(0, 30) + '...');
      token.value = stored;
    } else {
      console.warn('⚠️ auth.initFromStorage(): no token in storage');
    }
  }

  function clearSession(): void {
    token.value = null;
    user.value = null;
    initialized.value = false;
    try { localStorage.removeItem('token'); } catch { /* ignore */ }
    try { sessionStorage.removeItem('token'); } catch { /* ignore */ }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    needsBirthdate,
    login,
    logout,
    initFromStorage,
    setToken,
    
    refreshUser,
    fetchUser,
    initialized,
  };
});
