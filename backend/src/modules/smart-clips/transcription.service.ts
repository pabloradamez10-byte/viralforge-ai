import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  language?: string;
  duration?: number;
  segments: TranscriptSegment[];
}

interface GroqTranscriptionResponse {
  text?: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
}

export class TranscriptionService {
  isEnabled(): boolean {
    return Boolean(env.GROQ_API_KEY);
  }

  async transcribe(filePath: string): Promise<TranscriptResult> {
    if (!env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não configurada para transcrição.');
    }

    const bytes = await readFile(filePath);
    const form = new FormData();
    form.append('file', new Blob([bytes]), path.basename(filePath));
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    form.append('temperature', '0');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: form,
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 800);
      throw new Error(`Falha na transcrição Groq (${response.status}). ${details}`);
    }

    const data = await response.json() as GroqTranscriptionResponse;
    const segments = (data.segments ?? [])
      .map((segment) => ({
        start: Number(segment.start ?? 0),
        end: Number(segment.end ?? 0),
        text: String(segment.text ?? '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((segment) => segment.text && segment.end > segment.start);

    const text = String(data.text ?? segments.map((segment) => segment.text).join(' '))
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      throw new Error('A transcrição retornou texto vazio.');
    }

    return {
      text,
      language: data.language,
      duration: data.duration,
      segments,
    };
  }
}

export const transcriptionService = new TranscriptionService();
