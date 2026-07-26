import express, { Router } from 'express';

import { auth } from '../../shared/middlewares/auth.js';
import { audit } from '../../shared/middlewares/audit.js';
import { smartClipsController } from './smart-clips.controller.js';

export const smartClipsRoutes: Router = Router();

smartClipsRoutes.post(
  '/upload',
  auth,
  audit('smart-clips.upload', 'smart-clips'),
  express.raw({
    type: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm', 'application/octet-stream'],
    limit: '300mb',
  }),
  smartClipsController.upload,
);

smartClipsRoutes.get('/:id', auth, smartClipsController.status);

smartClipsRoutes.get(
  '/:id/clips/:clipId/download',
  auth,
  audit('smart-clips.download', 'smart-clips'),
  smartClipsController.download,
);
