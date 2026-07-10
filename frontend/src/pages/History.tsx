import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { useState } from 'react';
import { useHistory, useHistoryCompare } from '@/features/trends';

export default function History() {
  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d' | '12m'>('30d');
  const list = useHistory(range, 1);
  const compare = useHistoryCompare('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Histórico</h1>
          <p className="text-sm text-slate-400">Suas buscas e trends coletadas no tempo.</p>
        </div>
        <div className="w-48">
          <Select value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="12m">Últimos 12 meses</option>
          </Select>
        </div>
      </div>

      {compare.data && (
        <Card>
          <CardHeader title="Comparação" subtitle="Janela atual vs anterior" />
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Stat label="Trends (atual)" value={compare.data.current.total} />
            <Stat label="Trends (anterior)" value={compare.data.previous.total} />
            <Stat label="Volume total" value={compare.data.current.totalVolume} />
            <Stat label="Oportunidade média" value={`${(compare.data.current.avgOpportunity * 100).toFixed(0)}%`} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items?.map((s: any) => (
          <Card key={s.id}>
            <div className="p-5 space-y-2">
              <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString('pt-BR')}</div>
              <div className="text-slate-100 font-semibold">"{s.query}"</div>
              <div className="text-xs text-slate-500">
                {s.region} • {s.language} • {s._count?.records ?? 0} registros
              </div>
              <div className="flex flex-wrap gap-1">
                {s.records?.slice(0, 3).map((r: any) => (
                  <Badge key={r.id} tone="default">
                    {r.source?.name}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
        {list.data?.items?.length === 0 && (
          <Card className="md:col-span-3">
            <div className="p-8 text-center text-slate-400">Sem histórico neste intervalo.</div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-800 p-4 bg-slate-900/40">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-100 mt-1">{value}</div>
    </div>
  );
}
