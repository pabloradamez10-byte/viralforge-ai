import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PreparePublicationInput {
  scriptId: string;
  target: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'MANUAL';
  scheduledAt?: string;
  caption?: string;
  visibility?: 'public' | 'unlisted' | 'private';
}

export interface PreparePublicationResult {
  target: string;
  scheduledAt: string | null;
  visibility: string;
  status: string;
  payload: {
    title: string;
    description: string;
    tags: string[];
    visibility: string;
    thumbnailSuggestion: string;
    metadata: Record<string, unknown>;
    integrations: Record<string, unknown>;
  };
}

export function usePreparePublication() {
  return useMutation({
    mutationFn: async (input: PreparePublicationInput) => {
      const { data } = await api.post('/publications/prepare', input);
      return data.data as PreparePublicationResult;
    },
  });
}

export async function exportFaceless(scriptId: string, format: 'txt' | 'json' | 'srt' | 'markdown') {
  const { data } = await api.post(
    '/publications/export',
    { scriptId, format },
    { responseType: 'blob' },
  );
  const blob = data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roteiro.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
