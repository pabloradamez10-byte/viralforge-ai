import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { EdgeTTS } from 'edge-tts-universal';

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

const EDGE_VOICE_BY_APP_VOICE: Record<TtsVoice, string> = {
  alloy: 'pt-BR-FranciscaNeural',
  ash: 'pt-BR-AntonioNeural',
  coral: 'pt-BR-FranciscaNeural',
  echo: 'pt-BR-AntonioNeural',
  fable: 'pt-BR-FranciscaNeural',
  nova: 'pt-BR-FranciscaNeural',
  onyx: 'pt-BR-AntonioNeural',
  sage: 'pt-BR-FranciscaNeural',
  shimmer: 'pt-BR-FranciscaNeural',
};

export class TtsService {
  async generateSpeech(
    input: GenerateSpeechInput,
  ): Promise<GenerateSpeechResult> {
    const text = this.normalizeText(input.text);

    if (!text) {
      throw new Error(
        'Não é possível gerar narração com texto vazio.',
      );
    }

    if (text.length > 10_000) {
      throw new Error(
        `A narração possui ${text.length} caracteres. O limite atual é 10000.`,
      );
    }

    const voice: TtsVoice =
      input.voice ?? 'onyx';

    const edgeVoice =
      EDGE_VOICE_BY_APP_VOICE[voice];

    const speed = this.normalizeSpeed(
      input.speed ?? 1,
    );

    const rate = this.speedToRate(speed);

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
      const tts = new EdgeTTS(
        text,
        edgeVoice,
        {
          rate,
          volume: '+0%',
          pitch: '+0Hz',
        },
      );

      const result =
        await tts.synthesize();

      const audioBuffer = Buffer.from(
        await result.audio.arrayBuffer(),
      );

      if (audioBuffer.length === 0) {
        throw new Error(
          'O Edge TTS retornou um arquivo de áudio vazio.',
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
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido';

      throw new Error(
        `Falha ao gerar a narração pelo Edge TTS. ${message}`,
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
      Math.max(speed, 0.5),
      2,
    );
  }

  private speedToRate(
    speed: number,
  ): string {
    const percentage = Math.round(
      (speed - 1) * 100,
    );

    if (percentage === 0) {
      return '+0%';
    }

    return percentage > 0
      ? `+${percentage}%`
      : `${percentage}%`;
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
