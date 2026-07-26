import path from 'node:path';
import type { Request, Response } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler.js';
import { smartClipsService } from './smart-clips.service.js';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

export class SmartClipsController {
  upload = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const originalFilename = String(req.header('x-file-name') || 'video.mp4');
    const clips = Number(req.query.clips ?? 3);
    const durationSec = Number(req.query.durationSec ?? 30);

    const result = await smartClipsService.create(
      userId,
      body,
      originalFilename,
      clips,
      durationSec,
    );

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
    const filePath = await smartClipsService.getClipFile(
      userId,
      id,
      clipId,
    );
    res.download(filePath, path.basename(filePath));
  });

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