import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { videoRenderController } from './video-render.controller.js';

export const videoRenderRouter = Router();

videoRenderRouter.use(authMiddleware);

videoRenderRouter.post(
  '/',
  videoRenderController.create,
);

videoRenderRouter.get(
  '/:id',
  videoRenderController.status,
);

videoRenderRouter.get(
  '/:id/download',
  videoRenderController.download,
);
