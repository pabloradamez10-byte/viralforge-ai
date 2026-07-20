import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface SubtitleSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export interface CreateSubtitleInput {
  workingDirectory: string;
  filename?: string;
  segments: SubtitleSegment[];
}

export interface CaptionSceneInput {
  voiceover: string;
  durationSec: number;
}

interface CaptionToken {
  text: string;
  sentenceEnd: boolean;
  strongPause: boolean;
}

export class SubtitleService {
  async createSrt(
    input: CreateSubtitleInput,
  ): Promise<string> {
    const workingDirectory = path.resolve(
      input.workingDirectory,
    );

    await mkdir(workingDirectory, {
      recursive: true,
    });

    const filename =
      input.filename?.trim() || 'subtitles.srt';

    const filePath = path.join(
      workingDirectory,
      filename,
    );

    const validSegments = input.segments
      .filter(
        (segment) =>
          Number.isFinite(segment.startSec) &&
          Number.isFinite(segment.endSec) &&
          segment.endSec > segment.startSec &&
          segment.text.trim().length > 0,
      )
      .sort(
        (first, second) =>
          first.startSec - second.startSec,
      );

    if (validSegments.length === 0) {
      throw new Error(
        'Nenhum segmento válido foi informado para gerar as legendas.',
      );
    }

    const content = validSegments
      .map((segment, index) => {
        return [
          String(index + 1),
          `${this.formatTime(segment.startSec)} --> ${this.formatTime(segment.endSec)}`,
          this.sanitizeCaptionText(segment.text),
          '',
        ].join('\n');
      })
      .join('\n');

    await writeFile(
      filePath,
      content,
      'utf8',
    );

    return filePath;
  }

  /**
   * Cria legendas curtas no estilo Shorts/Reels.
   *
   * Em vez de transformar uma cena inteira em uma legenda grande,
   * cada cena é quebrada em blocos de 2 a 5 palavras, com no máximo
   * duas linhas e timestamps proporcionais ao ritmo real da narração.
   */
  createShortSegmentsFromScenes(
    scenes: CaptionSceneInput[],
  ): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];
    let cursor = 0;

    for (const scene of scenes) {
      const text = this.sanitizeText(scene.voiceover);
      const durationSec = this.normalizeDuration(scene.durationSec);

      if (!text || durationSec <= 0) {
        cursor += Math.max(durationSec, 0);
        continue;
      }

      const blocks = this.buildCaptionBlocks(text);

      if (blocks.length === 0) {
        cursor += durationSec;
        continue;
      }

      const totalWeight = blocks.reduce(
        (total, block) => total + this.blockWeight(block),
        0,
      );

      let sceneCursor = cursor;

      blocks.forEach((block, index) => {
        const isLastBlock = index === blocks.length - 1;
        const rawDuration =
          totalWeight > 0
            ? (durationSec * this.blockWeight(block)) / totalWeight
            : durationSec / blocks.length;

        const blockDuration = isLastBlock
          ? cursor + durationSec - sceneCursor
          : rawDuration;

        const endSec = isLastBlock
          ? cursor + durationSec
          : Math.min(
              sceneCursor + blockDuration,
              cursor + durationSec,
            );

        if (endSec - sceneCursor >= 0.1) {
          segments.push({
            startSec: sceneCursor,
            endSec,
            text: this.formatCaptionBlock(block),
          });
        }

        sceneCursor = endSec;
      });

      cursor += durationSec;
    }

    return this.fixTinyGaps(segments);
  }

  /**
   * Método antigo mantido para compatibilidade.
   * Usa agora o formato curto, preservando a assinatura pública.
   */
  createSegmentsFromScenes(
    scenes: CaptionSceneInput[],
  ): SubtitleSegment[] {
    return this.createShortSegmentsFromScenes(scenes);
  }

  private buildCaptionBlocks(
    text: string,
  ): string[][] {
    const tokens = this.tokenize(text);
    const blocks: string[][] = [];
    let current: CaptionToken[] = [];

    for (const token of tokens) {
      current.push(token);

      const shouldBreak =
        current.length >= 5 ||
        (current.length >= 2 && token.strongPause) ||
        (current.length >= 3 && token.sentenceEnd);

      if (shouldBreak) {
        blocks.push(
          current.map((item) => item.text),
        );
        current = [];
      }
    }

    if (current.length > 0) {
      const words = current.map(
        (item) => item.text,
      );

      const lastBlock =
        blocks[blocks.length - 1];

      if (
        lastBlock &&
        words.length === 1 &&
        lastBlock.length < 5
      ) {
        lastBlock.push(...words);
      } else {
        blocks.push(words);
      }
    }

    return blocks.filter(
      (block) => block.length > 0,
    );
  }

  private tokenize(text: string): CaptionToken[] {
    return this.sanitizeText(text)
      .split(/\s+/)
      .map((rawWord) => {
        const word = rawWord.trim();

        return {
          text: word,
          sentenceEnd: /[.!?]$/.test(word),
          strongPause: /[,;:]$/.test(word),
        };
      })
      .filter((token) => token.text.length > 0);
  }

  private blockWeight(words: string[]): number {
    return Math.max(words.length, 1);
  }

  private formatCaptionBlock(words: string[]): string {
    const cleanedWords = words
      .map((word) => word.trim())
      .filter(Boolean);

    if (cleanedWords.length <= 3) {
      return cleanedWords.join(' ');
    }

    const splitIndex = Math.ceil(
      cleanedWords.length / 2,
    );

    return [
      cleanedWords.slice(0, splitIndex).join(' '),
      cleanedWords.slice(splitIndex).join(' '),
    ].join('\n');
  }

  private fixTinyGaps(
    segments: SubtitleSegment[],
  ): SubtitleSegment[] {
    return segments.map((segment, index) => {
      const next = segments[index + 1];

      if (
        !next ||
        next.startSec - segment.endSec > 0.08
      ) {
        return segment;
      }

      return {
        ...segment,
        endSec: Math.min(
          next.startSec,
          segment.endSec,
        ),
      };
    });
  }

  private normalizeDuration(durationSec: number): number {
    if (!Number.isFinite(durationSec)) {
      return 0;
    }

    return Math.max(durationSec, 0);
  }

  private formatTime(
    totalSeconds: number,
  ): string {
    const safeSeconds = Math.max(
      totalSeconds,
      0,
    );

    const hours = Math.floor(
      safeSeconds / 3600,
    );

    const minutes = Math.floor(
      (safeSeconds % 3600) / 60,
    );

    const seconds = Math.floor(
      safeSeconds % 60,
    );

    const milliseconds = Math.floor(
      (safeSeconds -
        Math.floor(safeSeconds)) *
        1000,
    );

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(seconds, 2)},${this.pad(milliseconds, 3)}`;
  }

  private sanitizeText(
    text: string,
  ): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sanitizeCaptionText(
    text: string,
  ): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) =>
        line
          .replace(/[ \t]+/g, ' ')
          .trim(),
      )
      .filter(Boolean)
      .slice(0, 2)
      .join('\n');
  }

  private pad(
    value: number,
    size: number,
  ): string {
    return String(value).padStart(
      size,
      '0',
    );
  }
}

export const subtitleService =
  new SubtitleService();
