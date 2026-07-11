import path from 'node:path';
import fs from 'node:fs/promises';

import { ffmpegService } from './ffmpeg.service.js';
import { ttsService } from './tts.service.js';
import { mediaService } from './media.service.js';

export class VideoRenderService {
  async render(script: any) {
    const jobId = Date.now().toString();

    const workDir = path.join(
      process.cwd(),
      'storage',
      'renders',
      jobId,
    );

    await fs.mkdir(workDir, { recursive: true });

    console.log('🎬 Iniciando render...');

    // 1 - Narração
    const narration = await ttsService.generateSpeech({
      text: script.narration,
      outputDirectory: workDir,
      outputFilename: 'voice.mp3',
    });

    console.log('✅ Narração criada');

    // 2 - Baixar vídeos das cenas
    const videos: string[] = [];

    for (const scene of script.scenes) {
      const clip = await mediaService.downloadScene(scene, workDir);

      videos.push(clip);
    }

    console.log('✅ Clipes baixados');

    // 3 - Render final
    const output = await ffmpegService.renderVideo({
      videos,
      narration: narration.filePath,
      captions: script.captions,
      output: path.join(workDir, 'final.mp4'),
    });

    console.log('✅ Vídeo final criado');

    return {
      success: true,
      file: output,
    };
  }
}

export const videoRenderService =
  new VideoRenderService();
