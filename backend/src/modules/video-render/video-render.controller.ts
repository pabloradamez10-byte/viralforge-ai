import path from 'node:path';

import type {
  Request,
  Response,
} from 'express';

import { asyncHandler } from '../../shared/utils/async-handler.js';

import {
  CreateVideoRenderDto,
  VideoRenderParamsDto,
} from './video-render.dto.js';

import { videoRenderService } from './video-render.service.js';

interface AuthenticatedRequest
  extends Request {
  user?: {
    id: string;
  };
}

export class VideoRenderController {
  create = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
    ) => {
      const userId = this.getUserId(req);

      const dto =
        CreateVideoRenderDto.parse(
          req.body,
        );

      const result =
        await videoRenderService.render(
          userId,
          dto,
        );

      res.status(202).json({
        data: result,
      });
    },
  );

  status = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
    ) => {
      const userId = this.getUserId(req);

      const { id } =
        VideoRenderParamsDto.parse(
          req.params,
        );

      const result =
        await videoRenderService.status(
          userId,
          id,
        );

      res.json({
        data: result,
      });
    },
  );

  download = asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response,
    ) => {
      const userId = this.getUserId(req);

      const { id } =
        VideoRenderParamsDto.parse(
          req.params,
        );

      const filePath =
        await videoRenderService.getOutputFile(
          userId,
          id,
        );

      const filename =
        path.basename(filePath);

      res.download(
        filePath,
        filename,
      );
    },
  );

  private getUserId(
    req: AuthenticatedRequest,
  ): string {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error(
        'Usuário não autenticado.',
      );
    }

    return userId;
  }
}

export const videoRenderController =
  new VideoRenderController();
