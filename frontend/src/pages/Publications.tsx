import { useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  Card,
  CardHeader,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Input,
  Select,
} from '@/components/ui/Input';

import { useFacelessScript } from '@/features/faceless';

import {
  exportFaceless,
  usePreparePublication,
} from '@/features/publications';

import {
  downloadVideoRender,
  useCreateVideoRender,
  useVideoRenderStatus,
  type VideoRenderScene,
} from '@/features/video-renders';

import {
  Copy,
  Download,
  ExternalLink,
  Film,
  Loader2,
  RefreshCw,
  Send,
  Wand2,
} from 'lucide-react';

import toast from 'react-hot-toast';

type PublicationTarget =
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'INSTAGRAM'
  | 'MANUAL';

type Visibility =
  | 'public'
  | 'unlisted'
  | 'private';

type VideoVoice =
  | 'alloy'
  | 'ash'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'nova'
  | 'onyx'
  | 'sage'
  | 'shimmer';

type VideoResolution =
  | '720p'
  | '1080p';

interface RawScene {
  order?: number;
  name?: string;
  visual?: string;
  voiceover?: string;
  narration?: string;
  durationSec?: number;
  searchKeywords?: string[];
  keywords?: string[];
}

export default function Publications() {
  const { id } = useParams();
  const navigate = useNavigate();

  const script = useFacelessScript(id);
  const preparation = usePreparePublication();
  const renderMutation = useCreateVideoRender();

  const [target, setTarget] =
    useState<PublicationTarget>('YOUTUBE');

  const [visibility, setVisibility] =
    useState<Visibility>('public');

  const [caption, setCaption] =
    useState('');

  const [voice, setVoice] =
    useState<VideoVoice>('onyx');

  const [resolution, setResolution] =
    useState<VideoResolution>('1080p');

  const [renderId, setRenderId] =
    useState<string>();

  const renderStatus =
    useVideoRenderStatus(renderId);

  const scriptData = script.data as any;

  const renderScenes =
    useMemo<VideoRenderScene[]>(() => {
      if (!scriptData) {
        return [];
      }

      return buildRenderScenes(
        scriptData.scenes,
        scriptData.narration ?? '',
        scriptData.title ?? 'Vídeo faceless',
        Number(
          scriptData.estimatedDurationSec ?? 60,
        ),
      );
    }, [scriptData]);

  function onPrepare() {
    if (!id) {
      return;
    }

    preparation.mutate(
      {
        scriptId: id,
        target,
        visibility,
        caption:
          caption.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            'Pacote de publicação preparado',
          );
        },

        onError: (error: any) => {
          toast.error(
            error?.response?.data?.error
              ?.message ||
              'Falha ao preparar o pacote',
          );
        },
      },
    );
  }

  async function copyText(
    text: string,
    label = 'Conteúdo',
  ) {
    try {
      await navigator.clipboard.writeText(
        text,
      );

      toast.success(
        `${label} copiado`,
      );
    } catch {
      toast.error(
        'Falha ao copiar',
      );
    }
  }

  async function onExport(
    format:
      | 'txt'
      | 'json'
      | 'srt'
      | 'markdown',
  ) {
    if (!id) {
      return;
    }

    try {
      await exportFaceless(
        id,
        format,
      );

      toast.success(
        'Arquivo exportado',
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error
          ?.message ||
          error?.message ||
          'Falha ao exportar',
      );
    }
  }

  function onGenerateVideo() {
    if (!id || !scriptData) {
      return;
    }

    if (
      !scriptData.narration?.trim()
    ) {
      toast.error(
        'O roteiro não possui narração.',
      );

      return;
    }

    if (
      renderScenes.length === 0
    ) {
      toast.error(
        'O roteiro não possui cenas válidas.',
      );

      return;
    }

    setRenderId(undefined);

    renderMutation.mutate(
      {
        facelessScriptId: id,

        title:
          scriptData.title ||
          'Vídeo ViralForge',

        narration:
          scriptData.narration,

        scenes: renderScenes,

        captions:
          scriptData.captions ||
          undefined,

        language:
          scriptData.language ||
          'pt-BR',

        voice,

        format: 'vertical',

        resolution,

        backgroundMusic: false,
      },
      {
        onSuccess: (result) => {
          setRenderId(result.id);

          toast.success(
            'Geração do vídeo iniciada',
          );
        },

        onError: (error: any) => {
          toast.error(
            error?.response?.data?.error
              ?.message ||
              error?.message ||
              'Falha ao iniciar a geração do vídeo',
          );
        },
      },
    );
  }

  async function onDownloadVideo() {
    const result =
      renderStatus.data;

    if (
      !renderId ||
      result?.status !== 'COMPLETED'
    ) {
      return;
    }

    try {
      await downloadVideoRender(
        renderId,
        result.outputFilename,
      );

      toast.success(
        'Download do MP4 iniciado',
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error
          ?.message ||
          error?.message ||
          'Falha ao baixar o vídeo',
      );
    }
  }

  if (script.isLoading) {
    return (
      <div className="text-slate-400">
        Carregando roteiro…
      </div>
    );
  }

  if (!scriptData) {
    return (
      <Card>
        <div className="p-8 text-center text-slate-400">
          Roteiro não encontrado.
          Volte para{' '}
          <button
            className="text-brand-400"
            onClick={() =>
              navigate('/faceless')
            }
          >
            Meus roteiros
          </button>
          .
        </div>
      </Card>
    );
  }

  const result =
    preparation.data;

  const currentRender =
    renderStatus.data;

  const renderIsRunning =
    renderMutation.isPending ||
    Boolean(
      renderId &&
        currentRender &&
        currentRender.status !==
          'COMPLETED' &&
        currentRender.status !==
          'FAILED',
    );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Publicação
          </h1>

          <p className="text-sm text-slate-400">
            Gere o vídeo faceless,
            baixe o MP4 e publique nas
            suas redes.
          </p>
        </div>

        <button
          onClick={() =>
            navigate(
              `/faceless/${id}`,
            )
          }
          className="text-sm text-brand-400 inline-flex items-center gap-1"
        >
          <Wand2 size={14} />
          Voltar ao roteiro
        </button>
      </div>

      <Card>
        <CardHeader
          title={scriptData.title}
          subtitle={`Ref: ${
            scriptData.sourceTitle
          } (${
            scriptData.sourcePlatform
          })`}
        />

        <div className="p-5 space-y-2">
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">
              Hook:
            </span>{' '}
            {scriptData.hook}
          </div>

          <div className="text-sm text-slate-300">
            <span className="text-slate-500">
              Duração estimada:
            </span>{' '}
            {
              scriptData.estimatedDurationSec
            }
            s
          </div>

          <div className="text-sm text-slate-300">
            <span className="text-slate-500">
              Cenas:
            </span>{' '}
            {renderScenes.length}
          </div>

          {scriptData.sourceUrl && (
            <a
              href={
                scriptData.sourceUrl
              }
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
            >
              <ExternalLink
                size={12}
              />
              Ver original
            </a>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Gerar vídeo faceless"
          subtitle="Narração por IA, clipes verticais, legendas e MP4"
        />

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">
              Voz
            </label>

            <Select
              value={voice}
              onChange={(event) =>
                setVoice(
                  event.target
                    .value as VideoVoice,
                )
              }
            >
              <option value="onyx">
                Onyx
              </option>

              <option value="alloy">
                Alloy
              </option>

              <option value="ash">
                Ash
              </option>

              <option value="coral">
                Coral
              </option>

              <option value="echo">
                Echo
              </option>

              <option value="fable">
                Fable
              </option>

              <option value="nova">
                Nova
              </option>

              <option value="sage">
                Sage
              </option>

              <option value="shimmer">
                Shimmer
              </option>
            </Select>
          </div>

          <div>
            <label className="text-xs text-slate-400">
              Resolução
            </label>

            <Select
              value={resolution}
              onChange={(event) =>
                setResolution(
                  event.target
                    .value as VideoResolution,
                )
              }
            >
              <option value="1080p">
                1080 × 1920
              </option>

              <option value="720p">
                720 × 1280
              </option>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full justify-center"
              onClick={
                onGenerateVideo
              }
              disabled={
                renderIsRunning ||
                renderScenes.length ===
                  0
              }
            >
              {renderIsRunning ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Film size={16} />
              )}

              {renderIsRunning
                ? 'Gerando vídeo…'
                : 'Gerar vídeo MP4'}
            </Button>
          </div>
        </div>

        {(renderMutation.data ||
          currentRender) && (
          <div className="px-5 pb-5">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    Renderização
                  </div>

                  <div className="text-xs text-slate-400">
                    {currentRender?.message ||
                      renderMutation.data
                        ?.message ||
                      'Preparando processamento...'}
                  </div>
                </div>

                <Badge
                  tone={
                    currentRender?.status ===
                    'COMPLETED'
                      ? 'green'
                      : currentRender?.status ===
                          'FAILED'
                        ? 'red'
                        : 'violet'
                  }
                >
                  {currentRender?.status ||
                    renderMutation.data
                      ?.status ||
                    'PENDING'}
                </Badge>
              </div>

              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all duration-500"
                  style={{
                    width: `${
                      currentRender?.progress ??
                      renderMutation.data
                        ?.progress ??
                      0
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Progresso
                </span>

                <span>
                  {currentRender?.progress ??
                    renderMutation.data
                      ?.progress ??
                    0}
                  %
                </span>
              </div>

              {currentRender?.error && (
                <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
                  {
                    currentRender.error
                  }
                </div>
              )}

              {currentRender?.status ===
                'COMPLETED' && (
                <div className="flex justify-end">
                  <Button
                    onClick={
                      onDownloadVideo
                    }
                  >
                    <Download
                      size={16}
                    />
                    Baixar MP4
                  </Button>
                </div>
              )}

              {renderId &&
                currentRender?.status !==
                  'COMPLETED' &&
                currentRender?.status !==
                  'FAILED' && (
                  <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                    <RefreshCw
                      size={12}
                      className="animate-spin"
                    />
                    Atualizando o
                    andamento
                    automaticamente…
                  </div>
                )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Preparar pacote de publicação"
          subtitle="Título, descrição, tags e legendas para postagem"
        />

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">
              Plataforma alvo
            </label>

            <Select
              value={target}
              onChange={(event) =>
                setTarget(
                  event.target
                    .value as PublicationTarget,
                )
              }
            >
              <option value="YOUTUBE">
                YouTube
              </option>

              <option value="TIKTOK">
                TikTok
              </option>

              <option value="INSTAGRAM">
                Instagram Reels
              </option>

              <option value="MANUAL">
                Manual
              </option>
            </Select>
          </div>

          <div>
            <label className="text-xs text-slate-400">
              Visibilidade
            </label>

            <Select
              value={visibility}
              onChange={(event) =>
                setVisibility(
                  event.target
                    .value as Visibility,
                )
              }
            >
              <option value="public">
                Público
              </option>

              <option value="unlisted">
                Não listado
              </option>

              <option value="private">
                Privado
              </option>
            </Select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs text-slate-400">
              Caption opcional
            </label>

            <Input
              value={caption}
              onChange={(event) =>
                setCaption(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <Button
              onClick={onPrepare}
              disabled={
                preparation.isPending
              }
            >
              {preparation.isPending ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Send size={16} />
              )}

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
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onExport('txt')
                    }
                  >
                    <Download
                      size={14}
                    />
                    .txt
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onExport(
                        'markdown',
                      )
                    }
                  >
                    <Download
                      size={14}
                    />
                    .md
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onExport('srt')
                    }
                  >
                    <Download
                      size={14}
                    />
                    .srt
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      copyText(
                        JSON.stringify(
                          result,
                          null,
                          2,
                        ),
                        'JSON',
                      )
                    }
                  >
                    <Copy size={14} />
                    JSON
                  </Button>
                </div>
              }
            />

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  Título
                </div>

                <div className="text-slate-100 font-semibold">
                  {
                    result.payload
                      .title
                  }
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">
                  Visibilidade
                </div>

                <Badge
                  tone={
                    result.visibility ===
                    'public'
                      ? 'green'
                      : 'amber'
                  }
                >
                  {
                    result.visibility
                  }
                </Badge>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 mb-1">
                  Descrição /
                  Caption
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 whitespace-pre-wrap text-sm">
                  {
                    result.payload
                      .description
                  }
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 mb-1">
                  Tags
                </div>

                <div className="flex flex-wrap gap-1">
                  {result.payload.tags.map(
                    (tag) => (
                      <Badge key={tag}>
                        {tag.startsWith(
                          '#',
                        )
                          ? tag
                          : `#${tag}`}
                      </Badge>
                    ),
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 mb-1">
                  Sugestão de
                  thumbnail
                </div>

                <div className="text-slate-300 text-sm">
                  {
                    result.payload
                      .thumbnailSuggestion
                  }
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Integrações oficiais"
              subtitle="Publicação manual nesta etapa"
            />

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(
                (result.payload
                  .integrations as Record<
                  string,
                  any
                >) ?? {},
              ).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-800 p-4 bg-slate-900/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-slate-100">
                        {key}
                      </div>

                      <Badge tone="default">
                        {value?.method ||
                          '—'}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-400 break-all">
                      <span className="text-slate-500">
                        Endpoint:
                      </span>{' '}
                      {value?.endpoint ||
                        '—'}
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      <span className="text-slate-500">
                        Auth:
                      </span>{' '}
                      {value?.requiredAuth ||
                        '—'}
                    </div>

                    {value?.note && (
                      <div className="text-xs text-slate-500 mt-2 italic">
                        {
                          value.note
                        }
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </Card>
        </>
      )}

      <div className="text-xs text-slate-600">
        <Link
          to="/virals"
          className="hover:text-slate-400"
        >
          Voltar para vídeos virais
        </Link>
      </div>
    </div>
  );
}

function buildRenderScenes(
  rawScenes: unknown,
  narration: string,
  title: string,
  estimatedDurationSec: number,
): VideoRenderScene[] {
  const scenes = Array.isArray(
    rawScenes,
  )
    ? (rawScenes as RawScene[])
    : [];

  const fallbackDuration =
    scenes.length > 0
      ? Math.max(
          1,
          Math.round(
            estimatedDurationSec /
              scenes.length,
          ),
        )
      : Math.max(
          1,
          estimatedDurationSec,
        );

  if (scenes.length === 0) {
    return [
      {
        order: 1,
        name: 'Cena principal',
        visual: title,
        voiceover:
          narration.trim(),
        durationSec:
          fallbackDuration,
        searchKeywords:
          createKeywords(title),
      },
    ];
  }

  const narrationParts =
    splitNarration(
      narration,
      scenes.length,
    );

  return scenes
    .map(
      (
        scene,
        index,
      ): VideoRenderScene => {
        const order =
          Number.isFinite(
            Number(scene.order),
          ) &&
          Number(scene.order) > 0
            ? Number(scene.order)
            : index + 1;

        const name =
          scene.name?.trim() ||
          `Cena ${order}`;

        const visual =
          scene.visual?.trim() ||
          name ||
          title;

        const voiceover =
          scene.voiceover?.trim() ||
          scene.narration?.trim() ||
          narrationParts[index] ||
          narration.trim();

        const durationSec =
          Number.isFinite(
            Number(
              scene.durationSec,
            ),
          ) &&
          Number(
            scene.durationSec,
          ) > 0
            ? Math.min(
                Math.max(
                  Number(
                    scene.durationSec,
                  ),
                  1,
                ),
                60,
              )
            : fallbackDuration;

        const providedKeywords =
          Array.isArray(
            scene.searchKeywords,
          )
            ? scene.searchKeywords
            : Array.isArray(
                  scene.keywords,
                )
              ? scene.keywords
              : [];

        const searchKeywords =
          providedKeywords
            .map((keyword) =>
              String(
                keyword,
              ).trim(),
            )
            .filter(Boolean)
            .slice(0, 10);

        return {
          order,
          name,
          visual,
          voiceover,
          durationSec,
          searchKeywords:
            searchKeywords.length > 0
              ? searchKeywords
              : createKeywords(
                  `${name} ${visual}`,
                ),
        };
      },
    )
    .filter(
      (scene) =>
        scene.visual.length > 0 &&
        scene.voiceover.length >
          0,
    )
    .sort(
      (first, second) =>
        first.order -
        second.order,
    );
}

function splitNarration(
  narration: string,
  parts: number,
): string[] {
  const sentences = narration
    .split(
      /(?<=[.!?])\s+/,
    )
    .map((sentence) =>
      sentence.trim(),
    )
    .filter(Boolean);

  if (
    parts <= 1 ||
    sentences.length === 0
  ) {
    return [
      narration.trim(),
    ];
  }

  const groups =
    Array.from(
      { length: parts },
      () => [] as string[],
    );

  sentences.forEach(
    (sentence, index) => {
      const groupIndex =
        Math.min(
          Math.floor(
            (index * parts) /
              sentences.length,
          ),
          parts - 1,
        );

      groups[
        groupIndex
      ]?.push(sentence);
    },
  );

  return groups.map(
    (group) =>
      group.join(' ').trim(),
  );
}

function createKeywords(
  text: string,
): string[] {
  const ignoredWords =
    new Set([
      'para',
      'com',
      'uma',
      'como',
      'que',
      'dos',
      'das',
      'por',
      'seu',
      'sua',
      'the',
      'and',
      'from',
      'this',
      'that',
    ]);

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-z0-9\s]/g,
      ' ',
    )
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !ignoredWords.has(word),
    )
    .slice(0, 6);
}
