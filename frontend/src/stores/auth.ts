import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';
import { auth as authApi } from '../api/client';
import { ApiError } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(sessionStorage.getItem('token'));
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const needsBirthdate = computed(
    () => user.value !== null && (!user.value.birthdate || !user.value.birthdateConfirmed)
  );

  async function fetchUser(force = false): Promise<void> {
    if (initialized.value && !force) return;
    initialized.value = true;
    try {
      // Make the request with explicit Authorization header to ensure the
      // token is sent even when some callers bypass the shared client.
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const tokenLocal = sessionStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/users/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}),
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          user.value = null;
          token.value = null;
          sessionStorage.removeItem('token');
          return;
        }
        let text = '';
        try {
          const j = await res.json();
          text = j.error ?? JSON.stringify(j);
        } catch (e) {
          text = res.statusText;
        }
        throw new ApiError(res.status, { error: text });
      }

      user.value = await res.json();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        user.value = null;
        token.value = null;
        sessionStorage.removeItem('token');
      } else {
        throw err;
      }
    }
  }

  async function initFromStorage(): Promise<void> {
    const stored = sessionStorage.getItem('token');
    if (stored) {
      token.value = stored;
    }
  }

  function login(provider: 'google' | 'github' | 'microsoft'): void {
    window.location.href = authApi.loginUrl(provider);
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearSession();
  }

  async function setTokenAndFetch(newToken: string): Promise<void> {
    sessionStorage.setItem('token', newToken);
    token.value = newToken;
    loading.value = true;
    try {
      await fetchUser(true);
    } finally {
      loading.value = false;
    }
  }

  async function refreshUser(): Promise<void> {
    await fetchUser();
  }

  function clearSession(): void {
    sessionStorage.removeItem('token');
    token.value = null;
    user.value = null;
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    needsBirthdate,
    initFromStorage,
    login,
    logout,
    setTokenAndFetch,
    refreshUser,
    fetchUser,
    initialized,
  };
});
