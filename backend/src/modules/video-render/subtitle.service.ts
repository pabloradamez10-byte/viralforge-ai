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
          this.sanitizeText(segment.text),
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

  createSegmentsFromScenes(
    scenes: Array<{
      voiceover: string;
      durationSec: number;
    }>,
  ): SubtitleSegment[] {
    let cursor = 0;

    return scenes
      .filter(
        (scene) =>
          scene.voiceover.trim().length > 0 &&
          Number.isFinite(scene.durationSec) &&
          scene.durationSec > 0,
      )
      .map((scene) => {
        const startSec = cursor;
        const endSec =
          cursor + scene.durationSec;

        cursor = endSec;

        return {
          startSec,
          endSec,
          text: scene.voiceover.trim(),
        };
      });
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
      .trim();
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
