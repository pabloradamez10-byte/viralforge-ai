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
} from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/virals', label: 'Virais encontrados', icon: Flame },
  { to: '/faceless', label: 'Roteiros faceless', icon: Wand2 },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/history', label: 'Histórico', icon: HistoryIcon },
  { to: '/sources', label: 'Fontes', icon: Database },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav$ = useNavigate();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white font-bold">
            V
          </div>
          <div>
            <div className="font-bold text-slate-100">ViralForge AI</div>
            <div className="text-[11px] text-slate-500">Trend intelligence</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
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
        </nav>

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

      {/* Content */}
      <main className="flex-1 min-w-0">
        <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles size={16} className="text-brand-400" />
            <span>Transformando dados em conteúdo que gera resultados.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">v1.0 • MVP</span>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
