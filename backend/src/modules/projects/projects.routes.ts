import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { ProjectsController } from './projects.controller.js';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto.js';

const c = new ProjectsController();
export const projectsRoutes: Router = Router();

projectsRoutes.get('/', auth, c.list);
projectsRoutes.post('/', auth, validate(CreateProjectDto), c.create);
projectsRoutes.get('/:id', auth, c.get);
projectsRoutes.patch('/:id', auth, validate(UpdateProjectDto), c.update);
projectsRoutes.delete('/:id', auth, c.remove);
