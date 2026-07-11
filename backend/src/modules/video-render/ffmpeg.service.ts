import { spawn } from 'node:child_process';
import {
  mkdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

export interface RenderVideoInput {
  workingDirectory: string;
  outputFilename: string;

  inputVideos: string[];

  /**
   * Duração desejada de cada vídeo, na mesma ordem de inputVideos.
   */
  sceneDurations: number[];

  narrationFile: string;

  subtitleFile?: string;

  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderVideoResult {
  outputFile: string;
  normalizedVideos: string[];
}

export class FFmpegService {
  async render(
    input: RenderVideoInput,
  ): Promise<RenderVideoResult> {
    if (input.inputVideos.length === 0) {
      throw new Error(
        'Nenhum vídeo foi informado para renderização.',
      );
    }

    if (
      input.inputVideos.length !==
      input.sceneDurations.length
    ) {
      throw new Error(
        'A quantidade de vídeos deve ser igual à quantidade de durações.',
      );
    }

    const workingDirectory = path.resolve(
      input.workingDirectory,
    );

    await mkdir(workingDirectory, {
      recursive: true,
    });

    const width = input.width ?? 1080;
    const height = input.height ?? 1920;
    const fps = input.fps ?? 30;

    const normalizedDirectory = path.join(
      workingDirectory,
      'normalized',
    );

    await mkdir(normalizedDirectory, {
      recursive: true,
    });

    const normalizedVideos: string[] = [];

    for (
      let index = 0;
      index < input.inputVideos.length;
      index += 1
    ) {
      const sourceVideo =
        input.inputVideos[index];

      const duration = Math.max(
        input.sceneDurations[index] ?? 1,
        1,
      );

      const normalizedFile = path.join(
        normalizedDirectory,
        `scene-${String(index + 1).padStart(3, '0')}.mp4`,
      );

      await this.normalizeScene({
        sourceVideo,
        outputFile: normalizedFile,
        duration,
        width,
        height,
        fps,
      });

      normalizedVideos.push(
        normalizedFile,
      );
    }

    const concatFile = path.join(
      workingDirectory,
      'videos.txt',
    );

    const concatContent = normalizedVideos
      .map(
        (video) =>
          `file '${this.escapeConcatPath(video)}'`,
      )
      .join('\n');

    await writeFile(
      concatFile,
      concatContent,
      'utf8',
    );

    const joinedVideo = path.join(
      workingDirectory,
      'joined-video.mp4',
    );

    await this.exec('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatFile,
      '-c',
      'copy',
      joinedVideo,
    ]);

    const outputFile = path.join(
      workingDirectory,
      input.outputFilename,
    );

    const args = [
      '-y',
      '-i',
      joinedVideo,
      '-i',
      input.narrationFile,
    ];

    if (input.subtitleFile) {
      args.push(
        '-vf',
        `subtitles=${this.escapeSubtitlePath(input.subtitleFile)}:force_style='FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=140'`,
      );
    }

    args.push(
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',

      '-c:v',
      'libx264',

      '-preset',
      'veryfast',

      '-crf',
      '22',

      '-c:a',
      'aac',

      '-b:a',
      '192k',

      '-ar',
      '48000',

      '-movflags',
      '+faststart',

      '-pix_fmt',
      'yuv420p',

      '-shortest',

      outputFile,
    );

    await this.exec(
      'ffmpeg',
      args,
    );

    return {
      outputFile,
      normalizedVideos,
    };
  }

  private async normalizeScene(
    input: {
      sourceVideo: string;
      outputFile: string;
      duration: number;
      width: number;
      height: number;
      fps: number;
    },
  ): Promise<void> {
    const videoFilter = [
      `scale=${input.width}:${input.height}:force_original_aspect_ratio=increase`,
      `crop=${input.width}:${input.height}`,
      `fps=${input.fps}`,
      'setsar=1',
      'format=yuv420p',
    ].join(',');

    await this.exec('ffmpeg', [
      '-y',

      /**
       * Repete o clipe caso ele seja menor
       * que a duração exigida pela cena.
       */
      '-stream_loop',
      '-1',

      '-i',
      input.sourceVideo,

      '-t',
      String(input.duration),

      '-an',

      '-vf',
      videoFilter,

      '-c:v',
      'libx264',

      '-preset',
      'veryfast',

      '-crf',
      '23',

      '-movflags',
      '+faststart',

      input.outputFile,
    ]);
  }

  private escapeConcatPath(
    filePath: string,
  ): string {
    return filePath.replace(
      /'/g,
      "'\\''",
    );
  }

  private escapeSubtitlePath(
    filePath: string,
  ): string {
    return path
      .resolve(filePath)
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'");
  }

  private exec(
    command: string,
    args: string[],
  ): Promise<void> {
    return new Promise(
      (resolve, reject) => {
        const process = spawn(
          command,
          args,
          {
            stdio: [
              'ignore',
              'pipe',
              'pipe',
            ],
          },
        );

        let stderr = '';

        process.stderr.on(
          'data',
          (chunk: Buffer) => {
            stderr += chunk.toString();

            if (stderr.length > 20_000) {
              stderr = stderr.slice(
                -20_000,
              );
            }
          },
        );

        process.on(
          'error',
          (error) => {
            reject(
              new Error(
                `Não foi possível iniciar ${command}: ${error.message}`,
              ),
            );
          },
        );

        process.on(
          'close',
          (code) => {
            if (code === 0) {
              resolve();
              return;
            }

            reject(
              new Error(
                `FFmpeg terminou com código ${code}.\n${stderr.slice(-5000)}`,
              ),
            );
          },
        );
      },
    );
  }
}

export const ffmpegService =
  new FFmpegService();
