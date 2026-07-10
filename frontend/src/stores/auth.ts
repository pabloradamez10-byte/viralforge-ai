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
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  async login(email, password) {
    const normalizedEmail = email.toLowerCase().trim();

    const response = await api.post('/auth/login', {
      email: normalizedEmail,
      password,
    });

    const result = response.data?.data ?? response.data;

    const {
      user,
      accessToken,
      refreshToken,
    } = result;

    if (!user || !accessToken || !refreshToken) {
      throw new Error('O servidor não retornou os tokens de autenticação.');
    }

    setTokens(accessToken, refreshToken);

    set({
      user,
      loading: false,
    });
  },

  async register(email, password, name) {
    const response = await api.post('/auth/register', {
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
    });

    const result = response.data?.data ?? response.data;

    const {
      user,
      accessToken,
      refreshToken,
    } = result;

    if (!user || !accessToken || !refreshToken) {
      throw new Error('O servidor não retornou os tokens de autenticação.');
    }

    setTokens(accessToken, refreshToken);

    set({
      user,
      loading: false,
    });
  },

  async logout() {
    const refreshToken = localStorage.getItem('vf_refresh');

    try {
      if (refreshToken) {
        await api.post('/auth/logout', {
          refreshToken,
        });
      }
    } catch {
      // Limpa o acesso local mesmo que o backend esteja indisponível.
    }

    clearTokens();

    set({
      user: null,
      loading: false,
    });
  },

  async fetchMe() {
    const accessToken = localStorage.getItem('vf_access');

    if (!accessToken) {
      set({
        user: null,
        loading: false,
      });

      return;
    }

    try {
      const response = await api.get('/auth/me');
      const user = response.data?.data ?? response.data;

      set({
        user,
        loading: false,
      });
    } catch {
      clearTokens();

      set({
        user: null,
        loading: false,
      });
    }
  },
}));
