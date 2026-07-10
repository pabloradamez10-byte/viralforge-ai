import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import AppShell from '@/components/layout/AppShell';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Trends from '@/pages/Trends';
import History from '@/pages/History';
import Sources from '@/pages/Sources';
import Virals from '@/pages/Virals';
import FacelessGenerator from '@/pages/FacelessGenerator';
import Publications from '@/pages/Publications';
import FacelessScripts from '@/pages/FacelessScripts';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-200">
        <div className="animate-pulse">Carregando…</div>
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export default function App() {
  const fetchMe = useAuth((s) => s.fetchMe);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route
          path="/"
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trends" element={<Trends />} />
          <Route path="history" element={<History />} />
          <Route path="sources" element={<Sources />} />
          <Route path="virals" element={<Virals />} />
          <Route path="faceless" element={<FacelessScripts />} />
          <Route path="faceless/new/:videoId" element={<FacelessGenerator />} />
          <Route path="faceless/:id" element={<FacelessGenerator />} />
          <Route path="publications/:id" element={<Publications />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
