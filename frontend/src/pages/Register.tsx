import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/stores/auth';

export default function Register() {
  const nav = useNavigate();
  const register = useAuth((s) => s.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-brand-600 text-white items-center justify-center text-xl font-bold">
            V
          </div>
          <h1 className="mt-4 text-2xl font-bold">Criar conta</h1>
          <p className="text-sm text-slate-500">Comece a explorar tendências agora</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Senha (mín. 8)</label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <button
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-600 font-semibold">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
