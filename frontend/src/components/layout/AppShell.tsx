import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import {
  LayoutDashboard,
  TrendingUp,
  History as HistoryIcon,
  Database,
  Flame,
  Wand2,
  LogOut,
  Sparkles,
  Scissors,
  ShoppingBag,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/virals', label: 'Virais encontrados', icon: Flame },
  { to: '/faceless', label: 'Roteiros faceless', icon: Wand2 },
  { to: '/smart-clips', label: 'Smart Clips', icon: Scissors },
  { to: '/affiliates', label: 'Afiliados', icon: ShoppingBag },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/history', label: 'Histórico', icon: HistoryIcon },
  { to: '/sources', label: 'Fontes', icon: Database },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav$ = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = (onNavigate?: () => void) => (
    <>
      <div className="px-3 py-4 space-y-1">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-700/40'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white',
              )
            }
          >
            <n.icon size={18} />
            {n.label}
          </NavLink>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 border-r border-slate-800 bg-slate-950 flex-col">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white font-bold">
            V
          </div>
          <div>
            <div className="font-bold text-slate-100">ViralForge AI</div>
            <div className="text-[11px] text-slate-500">Trend intelligence</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">{navigation()}</nav>

        <div className="px-3 py-3 border-t border-slate-800">
          <div className="px-3 py-2 mb-2 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{user?.plan}</span>
              {user?.role === 'ADMIN' && (
                <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">ADMIN</span>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              await logout();
              nav$('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-lg"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative h-full w-[min(86vw,320px)] border-r border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
            <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white font-bold">V</div>
                <div>
                  <div className="font-bold text-slate-100">ViralForge AI</div>
                  <div className="text-[11px] text-slate-500">Criação e afiliados</div>
                </div>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-900" aria-label="Fechar menu">
                <X size={21} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">{navigation(() => setMobileMenuOpen(false))}</nav>
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg text-slate-200 hover:bg-slate-900" aria-label="Abrir menu">
              <Menu size={22} />
            </button>
            <Sparkles size={16} className="hidden sm:block text-brand-400" />
            <span className="hidden sm:inline">Transformando dados em conteúdo que gera resultados.</span>
            <span className="sm:hidden font-semibold text-slate-100">ViralForge AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">v1.0 • MVP</span>
          </div>
        </header>
        <div className="p-3 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
