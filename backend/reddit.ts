import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { audit } from '../../shared/middlewares/audit.js';
import { UsersController } from './users.controller.js';
import { ChangePasswordDto, UpdateUserDto } from './users.dto.js';

const c = new UsersController();
export const usersRoutes: Router = Router();

usersRoutes.get('/me', auth, c.me);
usersRoutes.patch('/me', auth, validate(UpdateUserDto), audit('user.update', 'user'), c.update);
usersRoutes.post('/me/change-password', auth, validate(ChangePasswordDto), audit('user.password', 'user'), c.changePassword);
usersRoutes.delete('/me', auth, audit('user.delete', 'user'), c.delete);
usersRoutes.get('/me/usage', auth, c.usage);
