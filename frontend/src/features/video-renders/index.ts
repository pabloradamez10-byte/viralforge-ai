import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import { api } from '@/lib/api';

export type VideoRenderStatus =
  | 'PENDING'
  | 'GENERATING_AUDIO'
  | 'SEARCHING_MEDIA'
  | 'DOWNLOADING_MEDIA'
  | 'GENERATING_SUBTITLES'
  | 'RENDERING'
  | 'COMPLETED'
  | 'FAILED';

export interface VideoRenderScene {
  order: number;
  name: string;
  visual: string;
  voiceover: string;
  durationSec: number;
  searchKeywords?: string[];
}

export interface CreateVideoRenderInput {
  facelessScriptId: string;
  title: string;
  narration: string;
  scenes: VideoRenderScene[];
  captions?: string;
  language?: string;
  voice?:
    | 'alloy'
    | 'ash'
    | 'coral'
    | 'echo'
    | 'fable'
    | 'nova'
    | 'onyx'
    | 'sage'
    | 'shimmer';
  format?:
    | 'vertical'
    | 'horizontal'
    | 'square';
  resolution?: '720p' | '1080p';
  backgroundMusic?: boolean;
}

export interface VideoRenderResult {
  id: string;
  status: VideoRenderStatus;
  progress: number;
  message?: string;
  downloadUrl?: string;
  outputFilename?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export function useCreateVideoRender() {
  return useMutation({
    mutationFn: async (
      input: CreateVideoRenderInput,
    ) => {
      const response =
        await api.post<{
          data: VideoRenderResult;
        }>(
          '/video-renders',
          input,
        );

      return response.data.data;
    },
  });
}

export function useVideoRenderStatus(
  renderId?: string,
) {
  return useQuery({
    queryKey: [
      'video-render',
      renderId,
    ],

    queryFn: async () => {
      const response =
        await api.get<{
          data: VideoRenderResult;
        }>(
          `/video-renders/${renderId}`,
        );

      return response.data.data;
    },

    enabled: Boolean(renderId),

    refetchInterval: (query) => {
      const status =
        query.state.data?.status;

      if (
        status === 'COMPLETED' ||
        status === 'FAILED'
      ) {
        return false;
      }

      return 3_000;
    },

    retry: 2,
  });
}

export async function downloadVideoRender(
  renderId: string,
  outputFilename?: string,
): Promise<void> {
  const response = await api.get(
    `/video-renders/${renderId}/download`,
    {
      responseType: 'blob',
    },
  );

  const blob = response.data as Blob;
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download =
    outputFilename ||
    `viralforge-${renderId}.mp4`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
