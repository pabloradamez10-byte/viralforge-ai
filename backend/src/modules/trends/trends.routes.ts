import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { audit } from '../../shared/middlewares/audit.js';
import { TrendsController } from './trends.controller.js';
import { SearchTrendsDto } from './trends.dto.js';

const c = new TrendsController();
export const trendsRoutes: Router = Router();

trendsRoutes.post('/search', auth, validate(SearchTrendsDto), audit('trends.search', 'trends'), c.search);
trendsRoutes.get('/', auth, c.list);
trendsRoutes.get('/top', auth, c.top);
trendsRoutes.get('/searches', auth, c.listSearches);
trendsRoutes.get('/:id', auth, c.get);
trendsRoutes.get('/:id/metrics', auth, c.metrics);
