import { spawn } from 'node:child_process';
import {
  access,
  mkdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

export interface RenderVideoInput {
  workingDirectory: string;
  outputFilename: string;

  /**
   * Caminhos dos vídeos usados em cada cena.
   */
  inputVideos: string[];

  /**
   * Duração desejada de cada cena.
   * Deve seguir a mesma ordem de inputVideos.
   */
  sceneDurations: number[];

  /**
   * Arquivo MP3 com a narração.
   */
  narrationFile: string;

  /**
   * Arquivo SRT opcional.
   */
  subtitleFile?: string;

  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderVideoResult {
  outputFile: string;
  normalizedVideos: string[];
}

interface NormalizeSceneInput {
  sourceVideo: string;
  outputFile: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

interface ExecOptions {
  timeoutMs?: number;
  label?: string;
}

export class FFmpegService {
  private readonly ffmpegThreads = 2;
  private readonly filterThreads = 1;

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

    if (!input.narrationFile.trim()) {
      throw new Error(
        'O arquivo de narração não foi informado.',
      );
    }

    if (!input.outputFilename.trim()) {
      throw new Error(
        'O nome do arquivo final não foi informado.',
      );
    }

    await this.assertFileExists(
      input.narrationFile,
      'Arquivo de narração',
    );

    const workingDirectory = path.resolve(
      input.workingDirectory,
    );

    await mkdir(workingDirectory, {
      recursive: true,
    });

    /*
     * Mantém o formato solicitado, mas limita valores
     * absurdos que poderiam derrubar o container.
     */
    const width = this.normalizeDimension(
      input.width ?? 720,
      720,
    );

    const height = this.normalizeDimension(
      input.height ?? 1280,
      1280,
    );

    const fps = this.normalizeFps(
      input.fps ?? 30,
    );

    const normalizedDirectory = path.join(
      workingDirectory,
      'normalized',
    );

    await mkdir(normalizedDirectory, {
      recursive: true,
    });

    const normalizedVideos: string[] = [];

    /*
     * As cenas são processadas uma por vez.
     * Isso evita vários processos FFmpeg concorrentes
     * consumindo memória no Railway.
     */
    for (
      let index = 0;
      index < input.inputVideos.length;
      index += 1
    ) {
      const sourceVideo =
        input.inputVideos[index];

      const sceneDuration =
        input.sceneDurations[index];

      if (!sourceVideo) {
        throw new Error(
          `Vídeo da cena ${index + 1} não encontrado.`,
        );
      }

      await this.assertFileExists(
        sourceVideo,
        `Vídeo da cena ${index + 1}`,
      );

      if (
        sceneDuration === undefined ||
        !Number.isFinite(sceneDuration)
      ) {
        throw new Error(
          `Duração inválida para a cena ${index + 1}.`,
        );
      }

      const duration = Math.min(
        Math.max(sceneDuration, 1),
        60,
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

      await this.assertOutputFile(
        normalizedFile,
        `Cena normalizada ${index + 1}`,
      );

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

    await this.exec(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'warning',

        '-y',

        '-threads',
        String(this.ffmpegThreads),

        '-f',
        'concat',

        '-safe',
        '0',

        '-i',
        concatFile,

        '-map',
        '0:v:0',

        '-an',

        '-c',
        'copy',

        '-movflags',
        '+faststart',

        joinedVideo,
      ],
      {
        label:
          'Junção dos vídeos normalizados',
        timeoutMs: 10 * 60 * 1000,
      },
    );

    await this.assertOutputFile(
      joinedVideo,
      'Vídeo unido',
    );

    const outputFile = path.join(
      workingDirectory,
      this.normalizeOutputFilename(
        input.outputFilename,
      ),
    );

    const args: string[] = [
      '-hide_banner',
      '-loglevel',
      'warning',

      '-y',

      '-threads',
      String(this.ffmpegThreads),

      '-filter_threads',
      String(this.filterThreads),

      '-filter_complex_threads',
      String(this.filterThreads),

      '-i',
      joinedVideo,

      '-i',
      input.narrationFile,
    ];

    const subtitleFile =
      input.subtitleFile?.trim();

    if (subtitleFile) {
      await this.assertFileExists(
        subtitleFile,
        'Arquivo de legenda',
      );

      const escapedSubtitlePath =
        this.escapeSubtitlePath(
          subtitleFile,
        );

      args.push(
        '-vf',
        [
          `subtitles='${escapedSubtitlePath}'`,
          "force_style='FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=140'",
        ].join(':'),
      );
    }

    args.push(
      '-map',
      '0:v:0',

      '-map',
      '1:a:0',

      '-c:v',
      'libx264',

      /*
       * Superfast reduz bastante CPU e memória.
       * O arquivo fica um pouco maior, mas é mais
       * seguro para o primeiro render no Railway.
       */
      '-preset',
      'superfast',

      '-crf',
      '24',

      '-profile:v',
      'main',

      '-level',
      '4.0',

      '-pix_fmt',
      'yuv420p',

      '-r',
      String(fps),

      '-threads',
      String(this.ffmpegThreads),

      '-c:a',
      'aac',

      '-b:a',
      '128k',

      '-ar',
      '44100',

      '-ac',
      '2',

      '-max_muxing_queue_size',
      '1024',

      '-movflags',
      '+faststart',

      '-shortest',

      outputFile,
    );

    await this.exec(
      'ffmpeg',
      args,
      {
        label:
          'Renderização do vídeo final',
        timeoutMs: 20 * 60 * 1000,
      },
    );

    await this.assertOutputFile(
      outputFile,
      'Vídeo final',
    );

    return {
      outputFile,
      normalizedVideos,
    };
  }

  private async normalizeScene(
    input: NormalizeSceneInput,
  ): Promise<void> {
    const videoFilter = [
      `scale=${input.width}:${input.height}:force_original_aspect_ratio=increase:flags=fast_bilinear`,
      `crop=${input.width}:${input.height}`,
      `fps=${input.fps}`,
      'setsar=1',
      'format=yuv420p',
    ].join(',');

    await this.exec(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'warning',

        '-y',

        '-threads',
        String(this.ffmpegThreads),

        '-filter_threads',
        String(this.filterThreads),

        '-filter_complex_threads',
        String(this.filterThreads),

        /*
         * Repete o clipe quando ele for menor
         * que a duração necessária.
         */
        '-stream_loop',
        '-1',

        '-i',
        input.sourceVideo,

        '-t',
        String(input.duration),

        /*
         * Remove o áudio original do clipe.
         */
        '-an',

        '-vf',
        videoFilter,

        '-c:v',
        'libx264',

        '-preset',
        'ultrafast',

        '-crf',
        '26',

        '-profile:v',
        'main',

        '-level',
        '4.0',

        '-threads',
        String(this.ffmpegThreads),

        '-movflags',
        '+faststart',

        '-pix_fmt',
        'yuv420p',

        '-max_muxing_queue_size',
        '1024',

        input.outputFile,
      ],
      {
        label: `Normalização de ${path.basename(
          input.sourceVideo,
        )}`,
        timeoutMs: 8 * 60 * 1000,
      },
    );
  }

  private normalizeDimension(
    value: number,
    fallback: number,
  ): number {
    if (
      !Number.isFinite(value) ||
      value < 240
    ) {
      return fallback;
    }

    /*
     * Mantém no máximo 1080p em qualquer eixo.
     * Também força número par, exigido pelo H.264.
     */
    const limited = Math.min(
      Math.round(value),
      1920,
    );

    return limited % 2 === 0
      ? limited
      : limited - 1;
  }

  private normalizeFps(
    value: number,
  ): number {
    if (!Number.isFinite(value)) {
      return 30;
    }

    return Math.min(
      Math.max(Math.round(value), 24),
      30,
    );
  }

  private normalizeOutputFilename(
    filename: string,
  ): string {
    const safeFilename = filename
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-');

    if (!safeFilename) {
      return `video-${Date.now()}.mp4`;
    }

    return safeFilename
      .toLowerCase()
      .endsWith('.mp4')
      ? safeFilename
      : `${safeFilename}.mp4`;
  }

  private async assertFileExists(
    filePath: string,
    label: string,
  ): Promise<void> {
    const resolved = path.resolve(
      filePath,
    );

    try {
      await access(resolved);

      const fileStats = await stat(
        resolved,
      );

      if (!fileStats.isFile()) {
        throw new Error(
          `${label} não é um arquivo válido: ${resolved}`,
        );
      }

      if (fileStats.size === 0) {
        throw new Error(
          `${label} está vazio: ${resolved}`,
        );
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (
          error.message.includes(
            'não é um arquivo',
          ) ||
          error.message.includes(
            'está vazio',
          )
        )
      ) {
        throw error;
      }

      throw new Error(
        `${label} não encontrado: ${resolved}`,
      );
    }
  }

  private async assertOutputFile(
    filePath: string,
    label: string,
  ): Promise<void> {
    const resolved = path.resolve(
      filePath,
    );

    try {
      const fileStats = await stat(
        resolved,
      );

      if (
        !fileStats.isFile() ||
        fileStats.size < 1024
      ) {
        throw new Error(
          `${label} foi gerado vazio ou incompleto.`,
        );
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes(
          'vazio ou incompleto',
        )
      ) {
        throw error;
      }

      throw new Error(
        `${label} não foi criado pelo FFmpeg.`,
      );
    }
  }

  private escapeConcatPath(
    filePath: string,
  ): string {
    return path
      .resolve(filePath)
      .replace(/\\/g, '/')
      .replace(/'/g, "'\\''");
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
    options: ExecOptions = {},
  ): Promise<void> {
    return new Promise<void>(
      (resolve, reject) => {
        const timeoutMs =
          options.timeoutMs ??
          10 * 60 * 1000;

        const label =
          options.label ?? command;

        let settled = false;
        let stderr = '';

        const childProcess = spawn(
          command,
          args,
          {
            stdio: [
              'ignore',
              'ignore',
              'pipe',
            ],
            env: {
              ...process.env,

              /*
               * Evita que bibliotecas internas usem
               * todas as CPUs disponíveis.
               */
              OMP_NUM_THREADS: '1',
              OPENBLAS_NUM_THREADS: '1',
              MKL_NUM_THREADS: '1',
            },
          },
        );

        const timeout = setTimeout(
          () => {
            if (settled) {
              return;
            }

            settled = true;

            childProcess.kill(
              'SIGKILL',
            );

            reject(
              new Error(
                `${label} excedeu o limite de ${Math.round(
                  timeoutMs / 1000,
                )} segundos e foi interrompida.`,
              ),
            );
          },
          timeoutMs,
        );

        childProcess.stderr.on(
          'data',
          (chunk: Buffer) => {
            stderr += chunk.toString();

            /*
             * Mantém apenas a parte final do log,
             * evitando consumo excessivo de memória.
             */
            if (stderr.length > 30_000) {
              stderr = stderr.slice(
                -30_000,
              );
            }
          },
        );

        childProcess.on(
          'error',
          (error) => {
            if (settled) {
              return;
            }

            settled = true;
            clearTimeout(timeout);

            reject(
              new Error(
                `Não foi possível iniciar ${label}: ${error.message}`,
              ),
            );
          },
        );

        childProcess.on(
          'close',
          (
            code: number | null,
            signal: NodeJS.Signals | null,
          ) => {
            if (settled) {
              return;
            }

            settled = true;
            clearTimeout(timeout);

            if (code === 0) {
              resolve();
              return;
            }

            const finalLog =
              stderr.trim().slice(-8000);

            if (signal) {
              reject(
                new Error(
                  [
                    `${label} foi encerrada pelo sistema com o sinal ${signal}.`,
                    signal === 'SIGKILL'
                      ? 'Isso normalmente indica falta de memória ou limite de CPU no Railway.'
                      : '',
                    finalLog,
                  ]
                    .filter(Boolean)
                    .join('\n'),
                ),
              );

              return;
            }

            reject(
              new Error(
                [
                  `${label} terminou com código ${
                    code ?? 'desconhecido'
                  }.`,
                  finalLog,
                ]
                  .filter(Boolean)
                  .join('\n'),
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
