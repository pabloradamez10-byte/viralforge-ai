import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface RenderVideoInput {
  workingDirectory: string;
  outputFilename: string;
  inputVideos: string[];
  narrationFile: string;
}

export interface RenderVideoResult {
  outputFile: string;
}

export class FFmpegService {
  async render(
    input: RenderVideoInput,
  ): Promise<RenderVideoResult> {
    await mkdir(input.workingDirectory, {
      recursive: true,
    });

    const concatFile = path.join(
      input.workingDirectory,
      'videos.txt',
    );

    const fs = await import('node:fs/promises');

    await fs.writeFile(
      concatFile,
      input.inputVideos
        .map((video) => `file '${video}'`)
        .join('\n'),
    );

    const output = path.join(
      input.workingDirectory,
      input.outputFilename,
    );

    await this.exec(
      'ffmpeg',
      [
        '-y',

        '-f',
        'concat',

        '-safe',
        '0',

        '-i',
        concatFile,

        '-i',
        input.narrationFile,

        '-c:v',
        'libx264',

        '-c:a',
        'aac',

        '-shortest',

        '-pix_fmt',
        'yuv420p',

        output,
      ],
    );

    return {
      outputFile: output,
    };
  }

  private exec(
    command: string,
    args: string[],
  ) {
    return new Promise<void>(
      (resolve, reject) => {
        const proc = spawn(
          command,
          args,
          {
            stdio: 'inherit',
          },
        );

        proc.on(
          'close',
          (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(
                  `FFmpeg exited with code ${code}`,
                ),
              );
            }
          },
        );
      },
    );
  }
}

export const ffmpegService =
  new FFmpegService();
