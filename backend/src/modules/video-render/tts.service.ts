import axios from 'axios';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';

export type TtsVoice =
  | 'alloy'
  | 'ash'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'nova'
  | 'onyx'
  | 'sage'
  | 'shimmer';

export interface GenerateSpeechInput {
  text: string;
  outputDirectory: string;
  outputFilename?: string;
  voice?: TtsVoice;
  instructions?: string;
  speed?: number;
}

export interface GenerateSpeechResult {
  filePath: string;
  filename: string;
  format: 'mp3';
  voice: TtsVoice;
  characterCount: number;
}

interface OpenAiSpeechError {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
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

    const text = this.normalizeText(input.text);

    if (!text) {
      throw new Error(
        'Não é possível gerar narração com texto vazio.',
      );
    }

    /*
     * Nesta primeira versão, o vídeo curto usa uma única
     * requisição de narração. Textos maiores serão divididos
     * quando implementarmos vídeos longos.
     */
    if (text.length > 4096) {
      throw new Error(
        `A narração possui ${text.length} caracteres. O limite atual é 4096. Reduza o roteiro ou gere uma versão curta.`,
      );
    }

    const voice: TtsVoice =
      input.voice ?? 'onyx';

    const speed = this.normalizeSpeed(
      input.speed ?? 1,
    );

    const outputDirectory = path.resolve(
      input.outputDirectory,
    );

    await mkdir(outputDirectory, {
      recursive: true,
    });

    const filename = this.normalizeFilename(
      input.outputFilename ??
        `narration-${Date.now()}.mp3`,
    );

    const filePath = path.join(
      outputDirectory,
      filename,
    );

    try {
      const response = await axios.post<ArrayBuffer>(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'gpt-4o-mini-tts',
          voice,
          input: text,
          instructions:
            input.instructions?.trim() ||
            [
              'Fale em português do Brasil.',
              'Use dicção clara e ritmo natural.',
              'Mantenha energia e curiosidade.',
              'Faça pequenas pausas entre as ideias.',
              'O estilo deve funcionar em um vídeo curto para redes sociais.',
            ].join(' '),
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
          maxContentLength: 25 * 1024 * 1024,
          maxBodyLength: 25 * 1024 * 1024,
        },
      );

      const audioBuffer = Buffer.from(
        response.data,
      );

      if (audioBuffer.length === 0) {
        throw new Error(
          'A API de voz retornou um arquivo vazio.',
        );
      }

      await writeFile(
        filePath,
        audioBuffer,
      );

      return {
        filePath,
        filename,
        format: 'mp3',
        voice,
        characterCount: text.length,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError<OpenAiSpeechError>(error)) {
        const status =
          error.response?.status;

        const apiMessage =
          error.response?.data?.error?.message;

        throw new Error(
          [
            'Falha ao gerar a narração pela OpenAI.',
            status
              ? `Status HTTP: ${status}.`
              : '',
            apiMessage
              ? `Mensagem: ${apiMessage}`
              : error.message,
          ]
            .filter(Boolean)
            .join(' '),
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        'Falha desconhecida ao gerar a narração.',
      );
    }
  }

  private normalizeText(
    text: string,
  ): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private normalizeSpeed(
    speed: number,
  ): number {
    if (!Number.isFinite(speed)) {
      return 1;
    }

    return Math.min(
      Math.max(speed, 0.25),
      4,
    );
  }

  private normalizeFilename(
    filename: string,
  ): string {
    const safeFilename = filename
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-');

    if (!safeFilename) {
      return `narration-${Date.now()}.mp3`;
    }

    return safeFilename
      .toLowerCase()
      .endsWith('.mp3')
      ? safeFilename
      : `${safeFilename}.mp3`;
  }
}

export const ttsService =
  new TtsService();
