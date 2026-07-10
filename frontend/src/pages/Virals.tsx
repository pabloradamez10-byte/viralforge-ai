import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useSearchViral,
  useViralVideos,
  type ScoredViralVideo,
} from '@/features/viral';
import {
  Flame,
  ExternalLink,
  Search,
  Loader2,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  REDDIT: 'Reddit',
};

export default function Virals() {
  const [niche, setNiche] = useState(
    'inteligência artificial',
  );
  const [platform, setPlatform] = useState<
    'YOUTUBE' | 'TIKTOK' | 'REDDIT' | 'ALL'
  >('ALL');
  const [region, setRegion] = useState('BR');
  const [language, setLanguage] = useState('pt');
  const [minScore, setMinScore] = useState(50);

  const list = useViralVideos({
    niche,
    platform,
    region,
    language,
    minScore,
    pageSize: 24,
  });

  const search = useSearchViral();

  /*
   * Quando uma busca manual termina, exibimos diretamente
   * os resultados retornados pelo endpoint /viral-videos/search.
   *
   * Isso evita depender da listagem cacheada.
   */
  const displayedItems =
    search.data?.items ?? list.data?.items ?? [];

  const displayedTotal =
    search.data?.total ?? list.data?.total ?? 0;

  const displayedSources: string[] = search.data?.items
    ? Array.from(
        new Set(
          search.data.items.map(
            (item) => item.platform,
          ),
        ),
      )
    : list.data?.sourcesUsed ?? [];

  function onSearch() {
    const normalizedNiche = niche.trim();

    if (!normalizedNiche) {
      toast.error('Informe um nicho para pesquisar.');
      return;
    }

    search.mutate(
      {
        niche: normalizedNiche,
        platform,
        region: region.trim().toUpperCase(),
        language: language.trim().toLowerCase(),
        maxResults: 25,
      },
      {
        onSuccess: (data) => {
          toast.success(
            data.total > 0
              ? `${data.total} vídeos encontrados`
              : 'Busca concluída sem resultados',
          );
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.error?.message ||
              error?.response?.data?.message ||
              'Falha na busca',
          );
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Virais encontrados
          </h1>

          <p className="text-sm text-slate-400">
            Vídeos públicos coletados via APIs oficiais.
            Usamos apenas como referência — nada é baixado
            ou redistribuído.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="violet">
            <Flame size={12} /> {displayedTotal}{' '}
            resultados
          </Badge>

          <Badge tone="default">
            Fontes:{' '}
            {displayedSources
              .map(
                (source) =>
                  PLATFORM_LABEL[source] ?? source,
              )
              .join(', ') || '—'}
          </Badge>
        </div>
      </div>

      <Card>
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="text-xs text-slate-400">
              Nicho
            </label>

            <Input
              value={niche}
              onChange={(event) =>
                setNiche(event.target.value)
              }
              placeholder="ex: marketing digital, finanças, humor"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">
              Plataforma
            </label>

            <Select
              value={platform}
              onChange={(event) =>
                setPlatform(
                  event.target.value as
                    | 'YOUTUBE'
                    | 'TIKTOK'
                    | 'REDDIT'
                    | 'ALL',
                )
              }
            >
              <option value="ALL">Todas</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="TIKTOK">TikTok</option>
              <option value="REDDIT">Reddit</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">
              Região
            </label>

            <Input
              value={region}
              onChange={(event) =>
                setRegion(
                  event.target.value.toUpperCase(),
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">
              Idioma
            </label>

            <Input
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value)
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">
              Score mínimo
            </label>

            <Input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(event) => {
                const value = Number(
                  event.target.value,
                );

                setMinScore(
                  Number.isFinite(value)
                    ? Math.min(
                        Math.max(value, 0),
                        100,
                      )
                    : 0,
                );
              }}
            />
          </div>

          <div className="md:col-span-12 flex justify-end gap-2">
            <Button
              onClick={onSearch}
              disabled={
                search.isPending || !niche.trim()
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

            <Button
              variant="secondary"
              onClick={() => list.refetch()}
              disabled={list.isFetching}
            >
              {list.isFetching ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : null}

              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {(list.isLoading || search.isPending) && (
        <div className="text-sm text-slate-400">
          Carregando…
        </div>
      )}

      {displayedItems.length === 0 &&
        !list.isLoading &&
        !search.isPending && (
          <Card>
            <div className="p-8 text-center">
              <div className="text-slate-200 font-semibold mb-1">
                Nenhum resultado encontrado
              </div>

              <div className="text-sm text-slate-500">
                Verifique se as APIs estão configuradas em{' '}
                <Link
                  className="text-brand-400"
                  to="/sources"
                >
                  Fontes
                </Link>{' '}
                — YouTube exige{' '}
                <code className="text-slate-300">
                  YOUTUBE_API_KEY
                </code>
                .
              </div>
            </div>
          </Card>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayedItems.map((video) => (
          <ViralCard
            key={`${video.platform}:${video.externalId}`}
            video={video}
            niche={niche}
          />
        ))}
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
    PLATFORM_LABEL[video.platform] ??
    video.platform;

  const views = formatNumber(video.views);

  const publishedDate = new Date(
    video.publishedAt,
  );

  const published = Number.isNaN(
    publishedDate.getTime(),
  )
    ? 'Data indisponível'
    : publishedDate.toLocaleDateString('pt-BR');

  const facelessUrl =
    `/faceless/new/${encodeURIComponent(
      video.externalId,
    )}` +
    `?p=${encodeURIComponent(video.platform)}` +
    `&t=${encodeURIComponent(video.title)}` +
    `&u=${encodeURIComponent(video.url)}` +
    `&d=${encodeURIComponent(
      video.description || '',
    )}` +
    `&n=${encodeURIComponent(niche)}`;

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
            src={video.thumbnailUrl}
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

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Badge
            tone={
              video.platform === 'YOUTUBE'
                ? 'red'
                : video.platform === 'TIKTOK'
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
                : video.score >= 60
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

        <div className="text-xs text-slate-500 line-clamp-1">
          {video.channel
            ? `${video.channel} • `
            : ''}
          {views} visualizações • {published}
        </div>

        {video.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {video.tags
              .slice(0, 4)
              .map((tag) => (
                <Badge
                  key={tag}
                  tone="default"
                  className="text-[10px]"
                >
                  #{tag}
                </Badge>
              ))}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
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
              Criar versão PT-BR faceless
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function formatNumber(value: number): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0';
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(1)}K`;
  }

  return String(number);
}
