'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';

import { ApiError, apiFetch, clearCsrfToken } from '@/lib/api';
import type { User } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ user: User }>('/auth/me');
        return res.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(['auth', 'me'], res.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearCsrfToken();
      queryClient.clear();
      window.location.href = '/login';
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user: data ?? null, isLoading, login, logout }),
    [data, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
