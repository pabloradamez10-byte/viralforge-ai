import { create } from 'zustand';
import { clearTokens } from '@/lib/api';

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

const TEST_USER: User = {
  id: 'test-admin',
  email: 'admin',
  name: 'Administrador',
  role: 'ADMIN',
  plan: 'ENTERPRISE',
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== 'admin@viralforge.ai' || password !== '123456') {
      throw new Error('Usuário ou senha inválidos.');
    }

    localStorage.setItem('vf_test_session', 'true');

    set({
      user: TEST_USER,
      loading: false,
    });
  },

  async register() {
    throw new Error('Cadastro desativado temporariamente.');
  },

  async logout() {
    localStorage.removeItem('vf_test_session');
    clearTokens();

    set({
      user: null,
      loading: false,
    });
  },

  async fetchMe() {
    const hasTestSession =
      localStorage.getItem('vf_test_session') === 'true';

    set({
      user: hasTestSession ? TEST_USER : null,
      loading: false,
    });
  },
}));
