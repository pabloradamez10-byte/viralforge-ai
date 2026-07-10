import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useSources } from '@/features/trends';

export default function Sources() {
  const sources = useSources();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Fontes de dados</h1>
        <p className="text-sm text-slate-400">
          Apenas APIs oficiais ou feeds públicos permitidos. Configure suas chaves no <code className="text-slate-300">.env</code> do backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.data?.map((s) => (
          <Card key={s.id}>
            <CardHeader
              title={s.name}
              subtitle={s.slug}
              right={<Badge tone={s.active ? 'green' : 'red'}>{s.active ? 'Ativa' : 'Inativa'}</Badge>}
            />
            <div className="p-5 space-y-2 text-sm">
              <div className="text-slate-400">
                <span className="text-slate-500">Tipo:</span> {s.type}
              </div>
              {s.baseUrl && (
                <div className="text-slate-400 break-all">
                  <span className="text-slate-500">URL:</span> {s.baseUrl}
                </div>
              )}
              <div className="text-slate-400">
                <span className="text-slate-500">Requer chave:</span>{' '}
                {s.config?.requiresKey ? 'Sim' : 'Não'}
              </div>
              {s.config?.feeds && (
                <div className="text-xs text-slate-500">
                  Feeds: {(s.config.feeds as string[]).length}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
