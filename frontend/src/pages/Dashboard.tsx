import { Link } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTopTrends } from '@/features/trends';
import { useFacelessScripts } from '@/features/faceless';
import { Flame, TrendingUp, Wand2, Database } from 'lucide-react';

export default function Dashboard() {
  const top = useTopTrends('7d', 5);
  const scripts = useFacelessScripts(1);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">Visão geral de inteligência de mercado</p>
        </div>
        <Link to="/virals">
          <Button>
            <Flame size={16} /> Explorar virais
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Top oportunidades" subtitle="Últimos 7 dias" />
          <div className="p-5 space-y-3">
            {top.isLoading && <div className="text-sm text-slate-500">Carregando…</div>}
            {top.data?.slice(0, 5).map((t: any) => {
              const m = t.metrics?.[0];
              return (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100 truncate">{t.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {t.source?.name} • score {Math.round(m?.opportunityScore * 100 || 0)}
                    </div>
                  </div>
                  <Badge tone={m?.growthPct > 0 ? 'green' : 'red'}>
                    {m?.growthPct > 0 ? '+' : ''}
                    {m?.growthPct || 0}%
                  </Badge>
                </div>
              );
            })}
            {top.data?.length === 0 && (
              <div className="text-sm text-slate-500">
                Nenhuma trend encontrada. Configure suas chaves em{' '}
                <Link to="/sources" className="text-brand-400">
                  Fontes
                </Link>{' '}
                e faça uma busca em{' '}
                <Link to="/trends" className="text-brand-400">
                  Trends
                </Link>
                .
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Roteiros faceless" subtitle="Gerados recentemente" />
          <div className="p-5 space-y-3">
            {scripts.isLoading && <div className="text-sm text-slate-500">Carregando…</div>}
            {scripts.data?.items?.slice(0, 5).map((s: any) => (
              <Link
                key={s.id}
                to={`/faceless/${s.id}`}
                className="flex items-center justify-between hover:bg-slate-800/40 p-2 -mx-2 rounded-lg"
              >
                <div className="min-w-0">
                  <div className="text-sm text-slate-100 truncate">{s.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {s.estimatedDurationSec}s • {s.language}
                  </div>
                </div>
                <Wand2 size={14} className="text-violet-400" />
              </Link>
            ))}
            {scripts.data?.items?.length === 0 && (
              <div className="text-sm text-slate-500">
                Nenhum roteiro ainda. Comece em{' '}
                <Link to="/virals" className="text-brand-400">
                  Virais
                </Link>
                .
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Atalhos" />
          <div className="p-5 grid grid-cols-2 gap-3">
            <Link to="/trends">
              <Button variant="secondary" className="w-full justify-center">
                <TrendingUp size={16} /> Trends
              </Button>
            </Link>
            <Link to="/virals">
              <Button variant="secondary" className="w-full justify-center">
                <Flame size={16} /> Virais
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="secondary" className="w-full justify-center">
                <Database size={16} /> Histórico
              </Button>
            </Link>
            <Link to="/sources">
              <Button variant="secondary" className="w-full justify-center">
                <Database size={16} /> Fontes
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
