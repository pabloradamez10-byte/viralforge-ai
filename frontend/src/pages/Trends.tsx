import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useSearchTrends, useTrends, useSources } from '@/features/trends';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Trends() {
  const sources = useSources();
  const [query, setQuery] = useState('inteligência artificial');
  const [region, setRegion] = useState('BR');
  const [language, setLanguage] = useState('pt');
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const list = useTrends({ sort: 'opportunity', range: '7d', pageSize: 30 });
  const search = useSearchTrends();

  function toggleSource(slug: string) {
    setActiveSources((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  function onSearch() {
    search.mutate(
      { query, region, language, sources: activeSources.length ? activeSources : undefined, limit: 20 },
      {
        onSuccess: () => {
          toast.success('Busca concluída');
          list.refetch();
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Falha'),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Trends</h1>
        <p className="text-sm text-slate-400">Coletadas em tempo real das APIs oficiais.</p>
      </div>

      <Card>
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="text-xs text-slate-400">Busca</label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">Região</label>
            <Input value={region} onChange={(e) => setRegion(e.target.value.toUpperCase())} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">Idioma</label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="md:col-span-3 flex items-end">
            <Button className="w-full" onClick={onSearch} disabled={search.isPending}>
              {search.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </Button>
          </div>
          <div className="md:col-span-12">
            <label className="text-xs text-slate-400">Fontes (vazio = todas)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {sources.data?.map((s) => {
                const active = activeSources.includes(s.slug);
                return (
                  <button
                    key={s.slug}
                    onClick={() => toggleSource(s.slug)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      active
                        ? 'bg-brand-600/20 border-brand-700/40 text-brand-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items?.map((t: any) => {
          const m = t.metrics?.[0];
          return (
            <Card key={t.id}>
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="default">{t.source?.name}</Badge>
                  <Badge tone={(m?.growthPct ?? 0) > 0 ? 'green' : 'red'}>
                    {(m?.growthPct ?? 0) > 0 ? '+' : ''}
                    {m?.growthPct ?? 0}%
                  </Badge>
                </div>
                <div className="text-slate-100 font-semibold line-clamp-2">{t.title}</div>
                <div className="text-xs text-slate-500">
                  Score {Math.round((m?.opportunityScore ?? 0) * 100)} • Vol. {m?.volume ?? 0}
                </div>
                {t.url && (
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 inline-flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Abrir
                  </a>
                )}
              </div>
            </Card>
          );
        })}
        {list.data?.items?.length === 0 && !list.isLoading && (
          <Card className="md:col-span-3">
            <div className="p-8 text-center text-slate-400">Nenhuma trend. Configure suas chaves e faça uma busca.</div>
          </Card>
        )}
      </div>
    </div>
  );
}
