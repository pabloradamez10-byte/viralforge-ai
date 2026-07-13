import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Clock3,
  ExternalLink,
  Eye,
  Flame,
  Gauge,
  Hash,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Input,
  Select,
} from '@/components/ui/Input';

import {
  useSearchViral,
  useViralVideos,
  type ScoredViralVideo,
  type ViralOrder,
  type ViralPlatform,
  type ViralTimeWindow,
  type ViralVideoDuration,
} from '@/features/viral';

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  REDDIT: 'Reddit',
};

const TIME_WINDOW_LABEL: Record<
  ViralTimeWindow,
  string
> = {
  '1h': 'Última hora',
  '6h': 'Últimas 6 horas',
  '24h': 'Últimas 24 horas',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
};

const DURATION_LABEL: Record<
  ViralVideoDuration,
  string
> = {
  ANY: 'Qualquer duração',
  SHORT: 'Vídeos curtos',
  MEDIUM: 'Vídeos médios',
  LONG: 'Vídeos longos',
};

const ORDER_LABEL: Record<
  ViralOrder,
  string
> = {
  VIRAL_SCORE: 'Score viral',
  VIEW_VELOCITY: 'Velocidade de views',
  ENGAGEMENT: 'Engajamento',
  RECENT: 'Mais recentes',
  VIEWS: 'Mais visualizações',
};

export default function Virals() {
  const [niche, setNiche] = useState(
    'inteligência artificial',
  );

  const [platform, setPlatform] =
    useState<ViralPlatform>('YOUTUBE');

  const [region, setRegion] =
    useState('BR');

  const [language, setLanguage] =
    useState('pt');

  const [timeWindow, setTimeWindow] =
    useState<ViralTimeWindow>('24h');

  const [duration, setDuration] =
    useState<ViralVideoDuration>('SHORT');

  const [order, setOrder] =
    useState<ViralOrder>(
      'VIEW_VELOCITY',
    );

  const [minScore, setMinScore] =
    useState(0);

  const [
    includeComments,
    setIncludeComments,
  ] = useState(true);

  const [
    includeChannelStats,
    setIncludeChannelStats,
  ] = useState(true);

  const [
    includeHashtags,
    setIncludeHashtags,
  ] = useState(true);

  const list = useViralVideos({
    niche,
    platform,
    region,
    language,
    timeWindow,
    duration,
    order,
    minScore,
    includeComments,
    includeChannelStats,
    includeHashtags,
    page: 1,
    pageSize: 24,
  });

  const search = useSearchViral();

  /*
   * A busca manual tem prioridade sobre a listagem cacheada.
   */
  const displayedItems =
    search.data?.items ??
    list.data?.items ??
    [];

  const displayedTotal =
    search.data?.total ??
    list.data?.total ??
    0;

  const displayedSources =
    search.data?.sourcesUsed ??
    list.data?.sourcesUsed ??
    [];

  const isLoading =
    list.isLoading ||
    search.isPending;

  function clearManualSearch() {
    if (search.data) {
      search.reset();
    }
  }

  function onSearch() {
    const normalizedNiche =
      niche.trim();

    if (!normalizedNiche) {
      toast.error(
        'Informe um nicho para pesquisar.',
      );

      return;
    }

    search.mutate(
      {
        niche:
          normalizedNiche,

        platform,

        region:
          region
            .trim()
            .toUpperCase(),

        language:
          language
            .trim()
            .toLowerCase(),

        timeWindow,

        duration,

        order,

        minScore,

        includeComments,

        includeChannelStats,

        includeHashtags,

        maxResults:
          25,
      },
      {
        onSuccess: (data) => {
          toast.success(
            data.total > 0
              ? `${data.total} vídeos encontrados`
              : 'Busca concluída sem resultados',
          );
        },

        onError: (
          error: any,
        ) => {
          const message =
            error?.response
              ?.data?.error
              ?.message ??
            error?.response
              ?.data?.message ??
            error?.message ??
            'Falha na busca';

          if (
            String(message)
              .toLowerCase()
              .includes('quota')
          ) {
            toast.error(
              'A cota da API do YouTube foi atingida.',
            );

            return;
          }

          toast.error(message);
        },
      },
    );
  }

  async function onRefreshCached() {
    clearManualSearch();

    const result =
      await list.refetch();

    if (result.isSuccess) {
      toast.success(
        'Listagem cacheada atualizada.',
      );
    }

    if (result.isError) {
      toast.error(
        'Não foi possível atualizar a listagem.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Inteligência viral
          </h1>

          <p className="text-sm text-slate-400 max-w-3xl">
            Descubra vídeos em crescimento,
            compare velocidade, engajamento,
            desempenho do canal e sinais que
            podem enriquecer o próximo roteiro.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="violet">
            <Flame size={12} />
            {displayedTotal} resultados
          </Badge>

          <Badge tone="default">
            Fontes:{' '}
            {displayedSources
              .map(
                (source) =>
                  PLATFORM_LABEL[
                    source
                  ] ?? source,
              )
              .join(', ') || '—'}
          </Badge>

          {search.data && (
            <Badge tone="amber">
              Busca nova
            </Badge>
          )}
        </div>
      </header>

      <Card>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <FieldLabel>
                Nicho ou assunto
              </FieldLabel>

              <Input
                value={niche}
                onChange={(event) => {
                  setNiche(
                    event.target.value,
                  );

                  clearManualSearch();
                }}
                placeholder="ex: IA no mercado de trabalho"
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Plataforma
              </FieldLabel>

              <Select
                value={platform}
                onChange={(event) => {
                  setPlatform(
                    event.target
                      .value as ViralPlatform,
                  );

                  clearManualSearch();
                }}
              >
                <option value="YOUTUBE">
                  YouTube
                </option>

                <option value="TIKTOK">
                  TikTok
                </option>

                <option value="REDDIT">
                  Reddit
                </option>

                <option value="ALL">
                  Todas
                </option>
              </Select>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Período
              </FieldLabel>

              <Select
                value={timeWindow}
                onChange={(event) => {
                  setTimeWindow(
                    event.target
                      .value as ViralTimeWindow,
                  );

                  clearManualSearch();
                }}
              >
                {Object.entries(
                  TIME_WINDOW_LABEL,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Duração
              </FieldLabel>

              <Select
                value={duration}
                onChange={(event) => {
                  setDuration(
                    event.target
                      .value as ViralVideoDuration,
                  );

                  clearManualSearch();
                }}
              >
                {Object.entries(
                  DURATION_LABEL,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Ordenar por
              </FieldLabel>

              <Select
                value={order}
                onChange={(event) => {
                  setOrder(
                    event.target
                      .value as ViralOrder,
                  );

                  clearManualSearch();
                }}
              >
                {Object.entries(
                  ORDER_LABEL,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Região
              </FieldLabel>

              <Input
                value={region}
                maxLength={8}
                onChange={(event) => {
                  setRegion(
                    event.target.value
                      .toUpperCase(),
                  );

                  clearManualSearch();
                }}
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Idioma
              </FieldLabel>

              <Input
                value={language}
                maxLength={12}
                onChange={(event) => {
                  setLanguage(
                    event.target.value,
                  );

                  clearManualSearch();
                }}
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>
                Score mínimo
              </FieldLabel>

              <Input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(event) => {
                  const value =
                    Number(
                      event.target
                        .value,
                    );

                  setMinScore(
                    Number.isFinite(
                      value,
                    )
                      ? Math.min(
                          Math.max(
                            value,
                            0,
                          ),
                          100,
                        )
                      : 0,
                  );

                  clearManualSearch();
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ToggleOption
              checked={
                includeComments
              }
              onChange={(checked) => {
                setIncludeComments(
                  checked,
                );

                clearManualSearch();
              }}
              icon={
                <MessageCircle
                  size={16}
                />
              }
              title="Analisar comentários"
              description="Busca comentários dos principais vídeos para enriquecer o roteiro."
            />

            <ToggleOption
              checked={
                includeChannelStats
              }
              onChange={(checked) => {
                setIncludeChannelStats(
                  checked,
                );

                clearManualSearch();
              }}
              icon={
                <Users size={16} />
              }
              title="Dados do canal"
              description="Compara views com inscritos e desempenho histórico público."
            />

            <ToggleOption
              checked={
                includeHashtags
              }
              onChange={(checked) => {
                setIncludeHashtags(
                  checked,
                );

                clearManualSearch();
              }}
              icon={
                <Hash size={16} />
              }
              title="Extrair hashtags"
              description="Identifica hashtags encontradas no título, descrição e metadados."
            />
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="text-sm font-medium text-amber-200">
              Controle de cota do YouTube
            </div>

            <p className="text-xs text-amber-200/70 mt-1">
              “Buscar virais” executa uma
              descoberta nova e pode consumir
              quota. “Atualizar cache” reutiliza
              a listagem cacheada pelo backend
              sempre que possível.
            </p>
          </div>

          <div className="flex justify-end gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={
                onRefreshCached
              }
              disabled={
                list.isFetching
              }
            >
              {list.isFetching ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw
                  size={16}
                />
              )}

              Atualizar cache
            </Button>

            <Button
              onClick={onSearch}
              disabled={
                search.isPending ||
                !niche.trim()
              }
            >
              {search.isPending ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Search size={16} />
              )}

              Buscar virais
            </Button>
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2
            size={16}
            className="animate-spin"
          />

          Analisando vídeos e métricas…
        </div>
      )}

      {list.isError &&
        !search.data && (
          <ErrorCard
            message={
              getErrorMessage(
                list.error,
              )
            }
          />
        )}

      {search.isError && (
        <ErrorCard
          message={
            getErrorMessage(
              search.error,
            )
          }
        />
      )}

      {displayedItems.length ===
        0 &&
        !isLoading && (
          <Card>
            <div className="p-8 text-center">
              <div className="text-slate-200 font-semibold mb-1">
                Nenhum resultado encontrado
              </div>

              <div className="text-sm text-slate-500 max-w-xl mx-auto">
                Amplie o período, reduza o
                score mínimo ou confira as
                configurações em{' '}
                <Link
                  className="text-brand-400"
                  to="/sources"
                >
                  Fontes
                </Link>
                .
              </div>
            </div>
          </Card>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayedItems.map(
          (video) => (
            <ViralCard
              key={`${video.platform}:${video.externalId}`}
              video={video}
              niche={niche}
            />
          ),
        )}
      </div>
    </div>
  );
}

function ViralCard({
  video,
  niche,
}: {
  video: ScoredViralVideo;
  niche: string;
}) {
  const platform =
    PLATFORM_LABEL[
      video.platform
    ] ?? video.platform;

  const publishedDate =
    new Date(
      video.publishedAt,
    );

  const published =
    Number.isNaN(
      publishedDate.getTime(),
    )
      ? 'Data indisponível'
      : publishedDate.toLocaleString(
          'pt-BR',
          {
            dateStyle:
              'short',
            timeStyle:
              'short',
          },
        );

  const viewsPerHour =
    video.viewsPerHour ??
    video.scoreBreakdown
      ?.metrics
      ?.viewsPerHour ??
    0;

  const engagementRate =
    video.engagementRate ??
    video.scoreBreakdown
      ?.metrics
      ?.engagementRate ??
    0;

  const outperformance =
    video.channelOutperformance ??
    video.scoreBreakdown
      ?.metrics
      ?.channelOutperformance;

  const signals =
    video.scoreBreakdown
      ?.signals ??
    [];

  const hashtags =
    video.hashtags?.length
      ? video.hashtags
      : video.tags ?? [];

  const facelessUrl =
    `/faceless/new/${encodeURIComponent(
      video.externalId,
    )}` +
    `?p=${encodeURIComponent(
      video.platform,
    )}` +
    `&t=${encodeURIComponent(
      video.title,
    )}` +
    `&u=${encodeURIComponent(
      video.url,
    )}` +
    `&d=${encodeURIComponent(
      video.description ?? '',
    )}` +
    `&n=${encodeURIComponent(
      niche,
    )}` +
    `&tags=${encodeURIComponent(
      hashtags.join(','),
    )}`;

  return (
    <Card className="overflow-hidden flex flex-col">
      {video.thumbnailUrl ? (
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="block bg-slate-950"
        >
          <img
            src={
              video.thumbnailUrl
            }
            alt={video.title}
            className="w-full aspect-video object-cover opacity-90 hover:opacity-100 transition"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-slate-800 to-slate-900 grid place-items-center text-slate-500">
          {platform}
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            tone={
              video.platform ===
              'YOUTUBE'
                ? 'red'
                : video.platform ===
                    'TIKTOK'
                  ? 'violet'
                  : 'amber'
            }
          >
            {platform}
          </Badge>

          <Badge
            tone={
              video.score >= 80
                ? 'green'
                : video.score >=
                    60
                  ? 'brand'
                  : 'default'
            }
          >
            Score {video.score}
          </Badge>
        </div>

        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-slate-100 hover:text-brand-300 line-clamp-2"
          title={video.title}
        >
          {video.title}
        </a>

        <div className="text-xs text-slate-500">
          {video.channel
            ? `${video.channel} • `
            : ''}
          {published}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={<Eye size={14} />}
            label="Visualizações"
            value={formatNumber(
              video.views,
            )}
          />

          <Metric
            icon={
              <Activity size={14} />
            }
            label="Views por hora"
            value={formatNumber(
              viewsPerHour,
            )}
          />

          <Metric
            icon={
              <Gauge size={14} />
            }
            label="Engajamento"
            value={formatPercent(
              engagementRate,
            )}
          />

          <Metric
            icon={
              <MessageCircle
                size={14}
              />
            }
            label="Comentários"
            value={formatNumber(
              video.comments ??
                0,
            )}
          />

          {video.channelSubscribers !==
            undefined && (
            <Metric
              icon={
                <Users
                  size={14}
                />
              }
              label="Inscritos"
              value={formatNumber(
                video.channelSubscribers,
              )}
            />
          )}

          {outperformance !==
            undefined && (
            <Metric
              icon={
                <BarChart3
                  size={14}
                />
              }
              label="Views / inscritos"
              value={`${outperformance.toFixed(
                2,
              )}x`}
            />
          )}

          {video.durationSec !==
            undefined && (
            <Metric
              icon={
                <Clock3
                  size={14}
                />
              }
              label="Duração"
              value={formatDuration(
                video.durationSec,
              )}
            />
          )}
        </div>

        {signals.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
              Sinais identificados
            </div>

            <div className="flex flex-wrap gap-1">
              {signals
                .slice(0, 4)
                .map((signal) => (
                  <Badge
                    key={signal}
                    tone="brand"
                    className="text-[10px]"
                  >
                    {signal}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags
              .slice(0, 5)
              .map((tag) => (
                <Badge
                  key={tag}
                  tone="default"
                  className="text-[10px]"
                >
                  #
                  {tag.replace(
                    /^#/,
                    '',
                  )}
                </Badge>
              ))}
          </div>
        )}

        {video.topComments &&
          video.topComments.length >
            0 && (
            <details className="rounded-lg border border-slate-800 bg-slate-950/30">
              <summary className="cursor-pointer px-3 py-2 text-xs text-slate-300">
                Ver comentários usados
                na análise (
                {
                  video
                    .topComments
                    .length
                }
                )
              </summary>

              <div className="px-3 pb-3 space-y-2">
                {video.topComments
                  .slice(0, 3)
                  .map(
                    (
                      comment,
                      index,
                    ) => (
                      <div
                        key={`${comment.author ?? 'comentário'}-${index}`}
                        className="text-xs text-slate-400 border-t border-slate-800 pt-2"
                      >
                        <div className="line-clamp-3">
                          {
                            comment.text
                          }
                        </div>

                        <div className="text-[10px] text-slate-600 mt-1">
                          {comment.author ??
                            'Usuário'}{' '}
                          •{' '}
                          {
                            comment.likes
                          }{' '}
                          curtidas
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </details>
          )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-3">
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
          >
            <ExternalLink size={12} />
            Abrir original
          </a>

          <Link to={facelessUrl}>
            <Button size="sm">
              <Wand2 size={14} />
              Criar faceless
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-slate-400 mb-1">
      {children}
    </label>
  );
}

function ToggleOption({
  checked,
  onChange,
  icon,
  title,
  description,
}: {
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3 cursor-pointer hover:border-slate-700 transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="mt-1 h-4 w-4 accent-blue-600"
      />

      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {title}
        </div>

        <div className="text-xs text-slate-500 mt-1">
          {description}
        </div>
      </div>
    </label>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>

      <div className="text-sm font-semibold text-slate-200 mt-1">
        {value}
      </div>
    </div>
  );
}

function ErrorCard({
  message,
}: {
  message: string;
}) {
  const isQuotaError =
    message
      .toLowerCase()
      .includes('quota') ||
    message.includes('429') ||
    message
      .toLowerCase()
      .includes(
        'resource_exhausted',
      );

  return (
    <Card>
      <div className="p-5">
        <div className="text-sm font-semibold text-red-300">
          {isQuotaError
            ? 'Cota da API atingida'
            : 'Falha ao carregar vídeos'}
        </div>

        <p className="text-xs text-slate-400 mt-1 break-words">
          {isQuotaError
            ? 'A API do YouTube recusou novas buscas. Aguarde a renovação da cota ou use resultados cacheados.'
            : message}
        </p>
      </div>
    </Card>
  );
}

function getErrorMessage(
  error: unknown,
): string {
  const candidate =
    error as any;

  return (
    candidate?.response
      ?.data?.error?.message ??
    candidate?.response
      ?.data?.message ??
    candidate?.message ??
    'Erro desconhecido'
  );
}

function formatNumber(
  value: number,
): string {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return '0';
  }

  if (
    number >=
    1_000_000_000
  ) {
    return `${(
      number /
      1_000_000_000
    ).toFixed(1)}B`;
  }

  if (
    number >= 1_000_000
  ) {
    return `${(
      number /
      1_000_000
    ).toFixed(1)}M`;
  }

  if (number >= 1_000) {
    return `${(
      number /
      1_000
    ).toFixed(1)}K`;
  }

  if (number >= 100) {
    return Math.round(
      number,
    ).toString();
  }

  return number.toFixed(
    number < 10 &&
      number % 1 !== 0
      ? 1
      : 0,
  );
}

function formatPercent(
  value: number,
): string {
  const percentage =
    Number(value) * 100;

  if (
    !Number.isFinite(
      percentage,
    )
  ) {
    return '0%';
  }

  return `${percentage.toFixed(
    percentage >= 10
      ? 1
      : 2,
  )}%`;
}

function formatDuration(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(
      Math.round(seconds),
      0,
    );

  const minutes =
    Math.floor(
      safeSeconds / 60,
    );

  const remainingSeconds =
    safeSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(
    remainingSeconds,
  ).padStart(2, '0')}s`;
}
