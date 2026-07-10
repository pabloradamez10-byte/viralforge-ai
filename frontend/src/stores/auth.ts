import { create } from 'zustand';
import { api, clearTokens, setTokens } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    setTokens(accessToken, refreshToken);
    set({ user });
  },
  async register(email, password, name) {
    const { data } = await api.post('/auth/register', { email, password, name });
    const { user, accessToken, refreshToken } = data.data;
    setTokens(accessToken, refreshToken);
    set({ user });
  },
  async logout() {
    const refresh = localStorage.getItem('vf_refresh');
    try {
      if (refresh) await api.post('/auth/logout', { refreshToken: refresh });
    } catch {}
    clearTokens();
    set({ user: null });
  },
  async fetchMe() {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
