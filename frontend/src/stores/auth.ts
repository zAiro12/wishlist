import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';
import { users as usersApi, auth as authApi } from '../api/client';
import { ApiError } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const loading = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const needsBirthdate = computed(
    () => user.value !== null && (!user.value.birthdate || !user.value.birthdateConfirmed)
  );

  async function fetchUser(): Promise<void> {
    try {
      user.value = await usersApi.me();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearSession();
      }
    }
  }

  async function initFromStorage(): Promise<void> {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      token.value = stored;
      loading.value = true;
      try {
        await fetchUser();
      } finally {
        loading.value = false;
      }
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
    localStorage.setItem('auth_token', newToken);
    token.value = newToken;
    loading.value = true;
    try {
      await fetchUser();
    } finally {
      loading.value = false;
    }
  }

  async function refreshUser(): Promise<void> {
    await fetchUser();
  }

  function clearSession(): void {
    localStorage.removeItem('auth_token');
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
  };
});
