import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import { api } from '@/lib/api';

export type ViralPlatform =
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'REDDIT'
  | 'ALL';

export type ViralSourcePlatform =
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'REDDIT';

export type ViralTimeWindow =
  | '1h'
  | '6h'
  | '24h'
  | '7d'
  | '30d';

export type ViralVideoDuration =
  | 'ANY'
  | 'SHORT'
  | 'MEDIUM'
  | 'LONG';

export type ViralOrder =
  | 'VIRAL_SCORE'
  | 'VIEW_VELOCITY'
  | 'ENGAGEMENT'
  | 'RECENT'
  | 'VIEWS';

export interface ViralComment {
  text: string;
  author?: string;
  likes: number;
  publishedAt?: string;
}

export interface ViralScoreComponents {
  viewVelocity: number;
  engagement: number;
  commentVelocity: number;
  recency: number;
  channelOutperformance: number;
  absoluteReach: number;
  metadataQuality: number;
}

export interface ViralScoreMetrics {
  ageHours: number;
  viewsPerHour: number;
  likesPerHour: number;
  commentsPerHour: number;
  engagementRate: number;
  likeRate: number;
  commentRate: number;
  channelOutperformance?: number;
}

export interface ViralScoreBreakdown {
  score: number;

  components: ViralScoreComponents;

  metrics: ViralScoreMetrics;

  signals: string[];
}

export interface ScoredViralVideo {
  externalId: string;

  platform: ViralSourcePlatform;

  title: string;
  description?: string;

  channel?: string;
  channelId?: string;

  url: string;
  thumbnailUrl?: string;

  views: number;
  likes?: number;
  comments?: number;

  publishedAt: string;

  language?: string;
  region?: string;

  tags: string[];
  hashtags?: string[];

  durationSec?: number;
  ageHours?: number;

  viewsPerHour?: number;
  likesPerHour?: number;
  commentsPerHour?: number;

  engagementRate?: number;
  likeRate?: number;
  commentRate?: number;

  channelSubscribers?: number;
  channelTotalViews?: number;
  channelVideoCount?: number;
  channelHiddenSubscribers?: boolean;

  channelOutperformance?: number;

  topComments?: ViralComment[];

  score: number;

  scoreBreakdown: ViralScoreBreakdown;
}

export interface ListViralParams {
  niche?: string;

  platform?: ViralPlatform;

  region?: string;
  language?: string;

  timeWindow?: ViralTimeWindow;

  duration?: ViralVideoDuration;

  order?: ViralOrder;

  minScore?: number;

  includeComments?: boolean;
  includeChannelStats?: boolean;
  includeHashtags?: boolean;

  page?: number;
  pageSize?: number;
}

export interface SearchViralInput {
  niche: string;

  platform?: ViralPlatform;

  region?: string;
  language?: string;

  timeWindow?: ViralTimeWindow;

  duration?: ViralVideoDuration;

  order?: ViralOrder;

  minScore?: number;

  includeComments?: boolean;
  includeChannelStats?: boolean;
  includeHashtags?: boolean;

  maxResults?: number;
}

export interface ViralVideosListResponse {
  items: ScoredViralVideo[];
  total: number;
  page: number;
  pageSize: number;
  sourcesUsed: ViralSourcePlatform[];
}

export interface ViralVideosSearchResponse {
  items: ScoredViralVideo[];
  total: number;
  sourcesUsed: ViralSourcePlatform[];
}

/**
 * Listagem cacheada no backend.
 *
 * Essa consulta não deve ser tratada como uma nova
 * descoberta manual. O backend mantém cache por 10 minutos.
 */
export function useViralVideos(
  input: ListViralParams,
) {
  return useQuery<
    ViralVideosListResponse,
    Error
  >({
    queryKey: [
      'viral-videos',
      input,
    ],

    queryFn: async () => {
      const response =
        await api.get(
          '/viral-videos',
          {
            params: input,
          },
        );

      return response.data
        .data as ViralVideosListResponse;
    },

    staleTime:
      5 * 60 * 1000,

    refetchOnWindowFocus:
      false,

    retry:
      1,
  });
}

/**
 * Busca manual sem cache.
 *
 * Esse endpoint pode consumir cota das APIs externas,
 * especialmente search.list do YouTube.
 */
export function useSearchViral() {
  return useMutation<
    ViralVideosSearchResponse,
    Error,
    SearchViralInput
  >({
    mutationFn: async (
      input: SearchViralInput,
    ) => {
      const response =
        await api.post(
          '/viral-videos/search',
          input,
        );

      return response.data
        .data as ViralVideosSearchResponse;
    },
  });
}
