import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { useFacelessScript } from '@/features/faceless';
import { usePreparePublication, exportFaceless } from '@/features/publications';
import { Download, Loader2, Send, Copy, ExternalLink, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Publications() {
  const { id } = useParams();
  const nav = useNavigate();
  const script = useFacelessScript(id);
  const prep = usePreparePublication();

  const [target, setTarget] = useState<'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'MANUAL'>('YOUTUBE');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [caption, setCaption] = useState('');

  function onPrepare() {
    if (!id) return;
    prep.mutate(
      { scriptId: id, target, visibility, caption: caption || undefined },
      {
        onSuccess: () => toast.success('Pacote de publicação preparado'),
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Falha'),
      },
    );
  }

  async function copyText(txt: string, label = 'Conteúdo') {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('Falha ao copiar');
    }
  }

  async function onExport(format: 'txt' | 'json' | 'srt' | 'markdown') {
    if (!id) return;
    try {
      await exportFaceless(id, format);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Falha ao exportar');
    }
  }

  if (script.isLoading) {
    return <div className="text-slate-400">Carregando roteiro…</div>;
  }
  if (!script.data) {
    return (
      <Card>
        <div className="p-8 text-center text-slate-400">
          Roteiro não encontrado. Volte para{' '}
          <button className="text-brand-400" onClick={() => nav('/faceless')}>
            Meus roteiros
          </button>
          .
        </div>
      </Card>
    );
  }

  const s = script.data;
  const result = prep.data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Publicação</h1>
          <p className="text-sm text-slate-400">
            Exportação manual nesta fase. Estrutura já preparada para APIs oficiais.
          </p>
        </div>
        <button onClick={() => nav(`/faceless/${id}`)} className="text-sm text-brand-400 inline-flex items-center gap-1">
          <Wand2 size={14} /> Voltar ao roteiro
        </button>
      </div>

      <Card>
        <CardHeader title={s.title} subtitle={`Ref: ${s.sourceTitle} (${s.sourcePlatform})`} />
        <div className="p-5 space-y-2">
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Hook:</span> {s.hook}
          </div>
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Duração estimada:</span> {s.estimatedDurationSec}s
          </div>
          {s.sourceUrl && (
            <a
              href={s.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> Ver original
            </a>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Preparar pacote de publicação"
          subtitle="Exportação manual nesta fase. APIs oficiais (YouTube/TikTok/IG) exigirão OAuth do usuário."
        />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Plataforma alvo</label>
            <Select value={target} onChange={(e) => setTarget(e.target.value as any)}>
              <option value="YOUTUBE">YouTube (manual / API oficial)</option>
              <option value="TIKTOK">TikTok (manual / Content Posting API)</option>
              <option value="INSTAGRAM">Instagram Reels (manual / Graph API)</option>
              <option value="MANUAL">Manual (sem integração)</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Visibilidade</label>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
              <option value="public">Público</option>
              <option value="unlisted">Não listado</option>
              <option value="private">Privado</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-400">Caption (opcional — usa o hook + CTA se vazio)</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={onPrepare} disabled={prep.isPending}>
              {prep.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Preparar pacote
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader
              title="Pacote pronto"
              subtitle={`Status: ${result.status}`}
              right={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onExport('txt')}>
                    <Download size={14} /> .txt
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onExport('markdown')}>
                    <Download size={14} /> .md
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onExport('srt')}>
                    <Download size={14} /> .srt
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyText(JSON.stringify(result, null, 2), 'JSON')}
                  >
                    <Copy size={14} /> JSON
                  </Button>
                </div>
              }
            />
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Título</div>
                <div className="text-slate-100 font-semibold">{result.payload.title}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Visibilidade</div>
                <Badge tone={result.visibility === 'public' ? 'green' : 'amber'}>{result.visibility}</Badge>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 mb-1">Descrição / Caption</div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 whitespace-pre-wrap text-sm">
                  {result.payload.description}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {result.payload.tags.map((t) => (
                    <Badge key={t}>{t.startsWith('#') ? t : '#' + t}</Badge>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 mb-1">Sugestão de thumbnail</div>
                <div className="text-slate-300 text-sm">{result.payload.thumbnailSuggestion}</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Integrações oficiais (estrutura pronta)" subtitle="Sem upload automático — você publica manualmente" />
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries((result.payload.integrations as Record<string, any>) ?? {}).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-slate-100">{k}</div>
                    <Badge tone="default">{v?.method || '—'}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 break-all">
                    <span className="text-slate-500">Endpoint:</span> {v?.endpoint || '—'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    <span className="text-slate-500">Auth:</span> {v?.requiredAuth || '—'}
                  </div>
                  {v?.note && <div className="text-xs text-slate-500 mt-2 italic">{v.note}</div>}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
