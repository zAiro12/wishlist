import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { users as usersApi, auth as authApi } from '../api/client';
import { ApiError } from '../api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (provider: 'google' | 'github' | 'microsoft') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setTokenAndFetch: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const u = await usersApi.me();
      setUser(u);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      setToken(stored);
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (provider: 'google' | 'github' | 'microsoft') => {
    window.location.href = authApi.loginUrl(provider);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const setTokenAndFetch = async (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setLoading(true);
    try {
      const u = await usersApi.me();
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, setTokenAndFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
