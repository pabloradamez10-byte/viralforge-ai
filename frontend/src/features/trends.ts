import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResult, Source, TrendRecord } from '@/types/domain';

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Source[] }>('/sources');
      return data.data;
    },
  });
}

export interface SearchTrendsInput {
  query: string;
  region?: string;
  language?: string;
  sources?: string[];
  projectId?: string;
  limit?: number;
}

export function useSearchTrends() {
  return useMutation({
    mutationFn: async (input: SearchTrendsInput) => {
      const { data } = await api.post('/trends/search', input);
      return data.data;
    },
  });
}

export interface ListTrendsInput {
  sort?: 'opportunity' | 'growth' | 'recent' | 'volume';
  range?: '24h' | '7d' | '30d' | '90d';
  source?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export function useTrends(input: ListTrendsInput) {
  return useQuery({
    queryKey: ['trends', input],
    queryFn: async () => {
      const { data } = await api.get<{ data: PageResult<TrendRecord> & { items: any[] } }>('/trends', {
        params: input,
      });
      return data.data;
    },
  });
}

export function useTopTrends(range: '24h' | '7d' | '30d' | '90d' = '7d', limit = 10) {
  return useQuery({
    queryKey: ['trends-top', range, limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: TrendRecord[] }>('/trends/top', { params: { range, limit } });
      return data.data;
    },
  });
}

export function useHistory(range: '24h' | '7d' | '30d' | '90d' | '12m' = '30d', page = 1) {
  return useQuery({
    queryKey: ['history', range, page],
    queryFn: async () => {
      const { data } = await api.get('/history', { params: { range, page, pageSize: 20 } });
      return data.data;
    },
  });
}

export function useHistoryCompare(range: '7d' | '30d' | '90d' | '12m' = '30d') {
  return useQuery({
    queryKey: ['history-compare', range],
    queryFn: async () => {
      const { data } = await api.get('/history/compare', { params: { range } });
      return data.data;
    },
  });
}
