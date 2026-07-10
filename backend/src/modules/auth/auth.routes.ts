import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { auth } from '../../shared/middlewares/auth.js';
import { authRateLimit } from '../../shared/middlewares/rate-limit.js';
import { validate } from '../../shared/middlewares/validate.js';
import { LoginDto, RefreshDto, RegisterDto } from './auth.dto.js';

const c = new AuthController();

export const authRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar novo usuário
 */
authRoutes.post('/register', authRateLimit, validate(RegisterDto), c.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 */
authRoutes.post('/login', authRateLimit, validate(LoginDto), c.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token
 */
authRoutes.post('/refresh', authRateLimit, validate(RefreshDto), c.refresh);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (revoga refresh)
 */
authRoutes.post('/logout', validate(RefreshDto), c.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Perfil atual
 */
authRoutes.get('/me', auth, c.me);
