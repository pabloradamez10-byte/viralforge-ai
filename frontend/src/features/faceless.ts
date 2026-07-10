import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FacelessScript {
  id?: string;
  title: string;
  hook: string;
  narration: string;
  scenes: Array<{ order: number; name: string; visual: string; voiceover: string; durationSec: number }>;
  captions: string;
  hashtags: string[];
  cta: string;
  keywords: string[];
  thumbnailSuggestion: string;
  estimatedDurationSec: number;
  language: string;
  createdAt?: string;
}

export interface GenerateFacelessInput {
  sourceVideoId: string;
  sourcePlatform: 'YOUTUBE' | 'TIKTOK' | 'REDDIT';
  sourceTitle: string;
  sourceDescription?: string;
  sourceTags?: string[];
  niche?: string;
  language?: string;
  targetDuration?: 'short' | 'medium' | 'long';
  tone?: 'curioso' | 'educativo' | 'polêmico' | 'storytelling' | 'humor';
  sourceUrl?: string;
}

export function useGenerateFaceless() {
  return useMutation({
    mutationFn: async (input: GenerateFacelessInput) => {
      const { data } = await api.post('/faceless/generate', input);
      return data.data as FacelessScript & { id: string };
    },
  });
}

export function useFacelessScripts(page = 1) {
  return useQuery({
    queryKey: ['faceless-scripts', page],
    queryFn: async () => {
      const { data } = await api.get('/faceless', { params: { page, pageSize: 20 } });
      return data.data;
    },
  });
}

export function useFacelessScript(id?: string) {
  return useQuery({
    queryKey: ['faceless-script', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/faceless/${id}`);
      return data.data;
    },
  });
}

export function useDeleteFaceless() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/faceless/${id}`);
    },
  });
}
