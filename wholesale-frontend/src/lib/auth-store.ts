// Updated: 2026-03-17T00:06:00 - P0 闭环: auth 请求使用 authApi（/api/auth/*）
import { create } from 'zustand';

import { authApi } from './api';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName: string;
  tenantSlug: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  // Updated: 2026-03-17T00:07:00 - P0 闭环: 使用 authApi 走 /api/auth/*
  login: async (email, password, tenantSlug?: string) => {
    const payload: { email: string; password: string; tenantSlug?: string } = { email, password };
    if (tenantSlug?.trim()) payload.tenantSlug = tenantSlug.trim();
    const { data } = await authApi.post('/auth/wholesale/login', payload);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('userId', data.user.id);
    const slugToSave = tenantSlug?.trim() || data.user?.tenantSlug;
    if (slugToSave) localStorage.setItem('lastTenantSlug', slugToSave);
    set({ user: data.user, isAuthenticated: true });
    try {
      const profile = await authApi.get('/auth/profile');
      set({ user: profile.data });
    } catch { /* profile fetch optional */ }
  },

  register: async (registerData) => {
    const { data } = await authApi.post('/auth/register', registerData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('userId', data.user.id);
    set({ user: data.user, isAuthenticated: true });
    const profile = await authApi.get('/auth/profile');
    set({ user: profile.data });
  },

  logout: async () => {
    try {
      await authApi.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const { data } = await authApi.get('/auth/profile');
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  // Updated: 2026-03-17T00:08:00 - P0 闭环: 使用 authApi 验证 token 有效性
  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const { data } = await authApi.get('/auth/profile');
        set({ user: data, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
