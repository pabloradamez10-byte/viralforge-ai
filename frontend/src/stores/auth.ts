import { create } from 'zustand';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE';
  accessStatus: 'PENDING' | 'APPROVED' | 'BLOCKED';
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível identificar a conta.');
    const user = await loadUser(data.user);
    await requireApproved(user);
    set({ user, loading: false });
  },

  async register(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível criar a conta.');
    if (!data.session) {
      throw new Error('Conta criada. Confirme o e-mail recebido e depois faça login.');
    }
    const user = await loadUser(data.user);
    await requireApproved(user);
    set({ user, loading: false });
  },

  async logout() {
    await supabase.auth.signOut();
    set({
      user: null,
      loading: false,
    });
  },

  async fetchMe() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return set({ user: null, loading: false });
      const user = await loadUser(data.user);
      await requireApproved(user);
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));

async function loadUser(authUser: SupabaseUser): Promise<User> {
  const { data } = await supabase
    .from('profiles')
    .select('name, role, plan, access_status')
    .eq('id', authUser.id)
    .single();

  const plan = data?.plan;

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: data?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
    role: data?.role === 'ADMIN' ? 'ADMIN' : 'USER',
    plan: plan && ['PRO', 'AGENCY', 'ENTERPRISE'].includes(plan) ? plan : 'FREE',
    accessStatus: data?.access_status === 'APPROVED' || data?.access_status === 'BLOCKED'
      ? data.access_status
      : 'PENDING',
  } as User;
}

async function requireApproved(user: User) {
  if (user.accessStatus === 'APPROVED') return;
  await supabase.auth.signOut();
  if (user.accessStatus === 'BLOCKED') {
    throw new Error('Seu acesso foi bloqueado pelo administrador.');
  }
  throw new Error('Cadastro recebido. Aguarde a aprovação do administrador.');
}
