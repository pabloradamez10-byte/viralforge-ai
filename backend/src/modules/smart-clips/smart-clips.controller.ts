import path from 'node:path';
import type { Request, Response } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler.js';
import { smartClipsService, type SmartClipAudioMode } from './smart-clips.service.js';
import type { TtsVoice } from '../video-render/tts.service.js';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const ALLOWED_VOICES = new Set<TtsVoice>([
  'alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer',
]);

export class SmartClipsController {
  upload = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const originalFilename = decodeURIComponent(String(req.header('x-file-name') || 'video.mp4'));
    const customScriptHeader = String(req.header('x-custom-script') || '');
    const customScript = customScriptHeader
      ? Buffer.from(customScriptHeader, 'base64').toString('utf8')
      : undefined;

    const result = await smartClipsService.create(userId, body, originalFilename, {
      clipCount: Number(req.query.clips ?? 3),
      durationSec: Number(req.query.durationSec ?? 30),
      audioMode: this.audioMode(req.query.audioMode),
      customScript,
      voice: this.voice(req.query.voice),
      captions: String(req.query.captions ?? 'true') !== 'false',
      removeSilence: String(req.query.removeSilence ?? 'true') !== 'false',
    });

    res.status(202).json({ data: result });
  });

  status = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const id = this.getRouteParam(req, 'id');
    const result = smartClipsService.get(userId, id);
    res.json({ data: result });
  });

  download = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const id = this.getRouteParam(req, 'id');
    const clipId = this.getRouteParam(req, 'clipId');
    const filePath = await smartClipsService.getClipFile(userId, id, clipId);
    res.download(filePath, path.basename(filePath));
  });

  private audioMode(value: unknown): SmartClipAudioMode {
    return value === 'rewrite' || value === 'custom' ? value : 'original';
  }

  private voice(value: unknown): TtsVoice {
    const selected = String(value || 'onyx') as TtsVoice;
    return ALLOWED_VOICES.has(selected) ? selected : 'onyx';
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.userId) throw new Error('Usuário não autenticado.');
    return req.userId;
  }

  private getRouteParam(req: Request, name: string): string {
    const value = req.params[name];
    if (!value) throw new Error(`Parâmetro obrigatório ausente: ${name}.`);
    return value;
  }
}

export const smartClipsController = new SmartClipsController();
