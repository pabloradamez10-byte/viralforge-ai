import { Link } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useFacelessScripts, useDeleteFaceless } from '@/features/faceless';
import { Wand2, Trash2, ExternalLink, Send } from 'lucide-react';

export default function FacelessScripts() {
  const q = useFacelessScripts(1);
  const del = useDeleteFaceless();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Roteiros faceless</h1>
          <p className="text-sm text-slate-400">
            Todos os roteiros ORIGINAIS gerados em PT-BR. Crie novos a partir de{' '}
            <Link to="/virals" className="text-brand-400">Virais</Link>.
          </p>
        </div>
        <Link to="/virals">
          <Button>
            <Wand2 size={16} /> Criar novo roteiro
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {q.data?.items?.map((s: any) => (
          <Card key={s.id}>
            <CardHeader
              title={s.title}
              subtitle={`${s.estimatedDurationSec}s • ${s.language} • ${new Date(s.createdAt).toLocaleString('pt-BR')}`}
              right={
                <Badge tone="violet">
                  {s.sourcePlatform}
                </Badge>
              }
            />
            <div className="p-5 space-y-3">
              <div className="text-sm text-slate-300 line-clamp-2">{s.hook}</div>
              <div className="text-xs text-slate-500 line-clamp-1">
                Ref: {s.sourceTitle}
              </div>
              {s.sourceUrl && (
                <a
                  href={s.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Vídeo original
                </a>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link to={`/faceless/${s.id}`}>
                  <Button size="sm" variant="secondary">
                    Editar
                  </Button>
                </Link>
                <Link to={`/publications/${s.id}`}>
                  <Button size="sm">
                    <Send size={14} /> Publicar
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Excluir este roteiro?')) del.mutate(s.id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {q.data?.items?.length === 0 && !q.isLoading && (
          <Card className="md:col-span-3">
            <div className="p-8 text-center text-slate-400">
              Nenhum roteiro ainda. Comece em{' '}
              <Link to="/virals" className="text-brand-400">Virais</Link>.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
