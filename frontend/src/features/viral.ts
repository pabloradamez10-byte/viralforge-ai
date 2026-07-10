import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ScoredViralVideo {
  externalId: string;
  platform: 'YOUTUBE' | 'TIKTOK' | 'REDDIT';
  title: string;
  description?: string;
  channel?: string;
  url: string;
  thumbnailUrl?: string;
  views: number;
  likes?: number;
  comments?: number;
  publishedAt: string;
  language?: string;
  region?: string;
  tags: string[];
  score: number;
}

export interface ListViralParams {
  niche?: string;
  platform?: 'YOUTUBE' | 'TIKTOK' | 'REDDIT' | 'ALL';
  region?: string;
  language?: string;
  minScore?: number;
  page?: number;
  pageSize?: number;
}

export function useViralVideos(input: ListViralParams) {
  return useQuery({
    queryKey: ['viral-videos', input],
    queryFn: async () => {
      const { data } = await api.get('/viral-videos', { params: input });
      return data.data as { items: ScoredViralVideo[]; total: number; page: number; pageSize: number; sourcesUsed: string[] };
    },
  });
}

export function useSearchViral() {
  return useMutation({
    mutationFn: async (input: {
      niche: string;
      platform?: 'YOUTUBE' | 'TIKTOK' | 'REDDIT' | 'ALL';
      region?: string;
      language?: string;
      maxResults?: number;
    }) => {
      const { data } = await api.post('/viral-videos/search', input);
      return data.data as { items: ScoredViralVideo[]; total: number };
    },
  });
}
