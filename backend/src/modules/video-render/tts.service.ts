import axios from 'axios';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';

export type TtsVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'nova'
  | 'onyx'
  | 'sage'
  | 'shimmer'
  | 'verse'
  | 'marin'
  | 'cedar';

export interface GenerateSpeechInput {
  text: string;
  voice?: TtsVoice;
  outputDirectory: string;
  outputFilename?: string;
  instructions?: string;
  speed?: number;
}

export interface GenerateSpeechResult {
  filePath: string;
  filename: string;
  format: 'mp3';
  voice: TtsVoice;
}

export class TtsService {
  async generateSpeech(
    input: GenerateSpeechInput,
  ): Promise<GenerateSpeechResult> {
    const apiKey = env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY não configurada no Railway.',
      );
    }

    const text = input.text.trim();

    if (!text) {
      throw new Error(
        'Não é possível gerar narração com texto vazio.',
      );
    }

    const voice: TtsVoice =
      input.voice ?? 'onyx';

    const speed = Math.min(
      Math.max(input.speed ?? 1, 0.25),
      4,
    );

    const outputDirectory = path.resolve(
      input.outputDirectory,
    );

    const filename =
      input.outputFilename?.trim() ||
      `narration-${Date.now()}.mp3`;

    const filePath = path.join(
      outputDirectory,
      filename,
    );

    await mkdir(outputDirectory, {
      recursive: true,
    });

    const response = await axios.post<ArrayBuffer>(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'gpt-4o-mini-tts',
        voice,
        input: text.slice(0, 4096),
        instructions:
          input.instructions ??
          'Fale em português do Brasil, com ritmo natural, clareza, energia e tom envolvente para um vídeo curto de redes sociais.',
        response_format: 'mp3',
        speed,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 120_000,
      },
    );

    await writeFile(
      filePath,
      Buffer.from(response.data),
    );

    return {
      filePath,
      filename,
      format: 'mp3',
      voice,
    };
  }
}

export const ttsService = new TtsService();
