import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';
import { users as usersApi, auth as authApi } from '../api/client';
import { ApiError } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
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
      user.value = await usersApi.me();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        // Silently clear user info on unauthorized; do not perform navigation here.
        user.value = null;
      } else {
        // For other errors, rethrow so callers can decide how to handle them.
        throw err;
      }
    }
  }

  async function initFromStorage(): Promise<void> {
    const stored = localStorage.getItem('token');
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
    localStorage.setItem('token', newToken);
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
    localStorage.removeItem('token');
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
