import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { useGenerateFaceless, type FacelessScript } from '@/features/faceless';
import { exportFaceless } from '@/features/publications';
import { Copy, Download, Loader2, Wand2, Save, Send, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FacelessGenerator() {
  const { id, videoId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();

  const isNew = !id;
  const sourceVideoId = videoId ?? params.get('v') ?? params.get('id') ?? '';
  const sourcePlatform = (params.get('p') ?? 'YOUTUBE') as 'YOUTUBE' | 'TIKTOK' | 'REDDIT';
  const sourceTitle = decodeURIComponent(params.get('t') ?? '');
  const sourceUrl = decodeURIComponent(params.get('u') ?? '');
  const sourceDescription = decodeURIComponent(params.get('d') ?? '');
  const initialNiche = decodeURIComponent(params.get('n') ?? '');

  const [niche, setNiche] = useState(initialNiche);
  const [tone, setTone] = useState<'curioso' | 'educativo' | 'polêmico' | 'storytelling' | 'humor'>('curioso');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('short');
  const [script, setScript] = useState<(FacelessScript & { id?: string }) | null>(null);

  const generate = useGenerateFaceless();

  useEffect(() => {
    setScript(null);
  }, [sourceVideoId, sourcePlatform, sourceTitle]);

  function onGenerate() {
    if (!sourceVideoId || !sourceTitle) {
      toast.error('Vídeo de referência inválido. Volte e selecione um viral.');
      return;
    }
    generate.mutate(
      {
        sourceVideoId,
        sourcePlatform,
        sourceTitle,
        sourceDescription: sourceDescription || undefined,
        niche: niche || undefined,
        sourceUrl: sourceUrl || undefined,
        targetDuration: duration,
        tone,
        language: 'pt-BR',
      },
      {
        onSuccess: (data) => {
          setScript(data);
          toast.success('Roteiro gerado em PT-BR');
        },
        onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Falha ao gerar'),
      },
    );
  }

  async function copyText(txt: string, label = 'Conteúdo') {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  async function onExport(format: 'txt' | 'json' | 'srt' | 'markdown') {
    if (!script?.id) {
      toast.error('Gere e salve o roteiro antes de exportar.');
      return;
    }
    try {
      await exportFaceless(script.id, format);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Falha ao exportar');
    }
  }

  const hashtagsText = useMemo(
    () => (script?.hashtags ?? []).map((h) => (h.startsWith('#') ? h : '#' + h)).join(' '),
    [script],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isNew ? 'Gerador faceless' : 'Editar roteiro'}
          </h1>
          <p className="text-sm text-slate-400">
            Roteiro 100% original em PT-BR, baseado apenas no TÍTULO do vídeo de referência.
          </p>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <ExternalLink size={12} /> Ver vídeo de referência
          </a>
        )}
      </div>

      <Card>
        <CardHeader title="Vídeo de referência (apenas como insumo semântico)" subtitle="Não copiamos nada do original" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Plataforma</div>
            <div className="text-slate-200">
              <Badge tone={sourcePlatform === 'YOUTUBE' ? 'red' : sourcePlatform === 'TIKTOK' ? 'violet' : 'amber'}>
                {sourcePlatform}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">ID</div>
            <div className="text-slate-300 font-mono text-xs break-all">{sourceVideoId}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Título</div>
            <div className="text-slate-100">{sourceTitle || '—'}</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Configuração" subtitle="Defina o tom e a duração do seu vídeo" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Nicho (opcional)</label>
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="ex: marketing, humor, tech" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Tom</label>
            <Select value={tone} onChange={(e) => setTone(e.target.value as any)}>
              <option value="curioso">Curioso</option>
              <option value="educativo">Educativo</option>
              <option value="polêmico">Polêmico</option>
              <option value="storytelling">Storytelling</option>
              <option value="humor">Humor</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Duração</label>
            <Select value={duration} onChange={(e) => setDuration(e.target.value as any)}>
              <option value="short">Curto (30-60s)</option>
              <option value="medium">Médio (2-4 min)</option>
              <option value="long">Longo (6-12 min)</option>
            </Select>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={onGenerate} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {script ? 'Regenerar roteiro' : 'Gerar roteiro PT-BR'}
            </Button>
          </div>
        </div>
      </Card>

      {script && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Título" right={<CopyButton onCopy={() => copyText(script.title, 'Título')} />} />
              <div className="p-5 text-slate-100 font-semibold">{script.title}</div>
            </Card>

            <Card>
              <CardHeader title="Hook (0-3s)" right={<CopyButton onCopy={() => copyText(script.hook, 'Hook')} />} />
              <div className="p-5 text-slate-200">{script.hook}</div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Narração completa"
                subtitle={`${script.estimatedDurationSec}s • ${script.language}`}
                right={<CopyButton onCopy={() => copyText(script.narration, 'Narração')} />}
              />
              <div className="p-5 text-slate-200 whitespace-pre-wrap leading-relaxed">{script.narration}</div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Cenas sugeridas" />
              <div className="p-5 space-y-3">
                {script.scenes.map((s) => (
                  <div key={s.order} className="rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-slate-100">
                        {s.order}. {s.name}
                      </div>
                      <Badge tone="brand">{s.durationSec}s</Badge>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="text-slate-500">Visual:</span> {s.visual}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      <span className="text-slate-500">Voz:</span> {s.voiceover}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Legendas (SRT)" right={<CopyButton onCopy={() => copyText(script.captions, 'Legendas')} />} />
              <div className="p-5 max-h-72 overflow-auto text-xs text-slate-300 font-mono whitespace-pre">
                {script.captions}
              </div>
            </Card>

            <Card>
              <CardHeader title="CTA + Hashtags" />
              <div className="p-5 space-y-3">
                <div>
                  <div className="text-xs text-slate-500">CTA</div>
                  <div className="text-slate-200">{script.cta}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Hashtags</div>
                  <div className="text-slate-200 break-words">{hashtagsText}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Palavras-chave</div>
                  <div className="text-slate-200 break-words">{script.keywords.join(', ')}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Sugestão de thumbnail</div>
                  <div className="text-slate-200">{script.thumbnailSuggestion}</div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Exportar & Publicar" subtitle="Exportação manual nesta fase" />
            <div className="p-5 flex flex-wrap gap-2 justify-end">
              <Button variant="secondary" onClick={() => copyText(JSON.stringify(script, null, 2), 'JSON')}>
                <Copy size={14} /> Copiar JSON
              </Button>
              <Button variant="secondary" onClick={() => onExport('txt')}>
                <Download size={14} /> .txt
              </Button>
              <Button variant="secondary" onClick={() => onExport('markdown')}>
                <Download size={14} /> .md
              </Button>
              <Button variant="secondary" onClick={() => onExport('srt')}>
                <Download size={14} /> .srt
              </Button>
              <Button variant="secondary" onClick={() => onExport('json')}>
                <Download size={14} /> .json
              </Button>
              <Button
                onClick={() => {
                  if (!script?.id) {
                    toast.error('Gere o roteiro antes de ir para publicação.');
                    return;
                  }
                  nav(`/publications/${script.id}`);
                }}
              >
                <Send size={14} /> Ir para publicação
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onCopy}>
      <Copy size={14} /> Copiar
    </Button>
  );
}
