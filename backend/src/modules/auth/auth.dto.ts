import { Router } from 'express';

import { auth } from '../../shared/middlewares/auth.js';
import { authRateLimit } from '../../shared/middlewares/rate-limit.js';
import { validate } from '../../shared/middlewares/validate.js';

import { AuthController } from './auth.controller.js';
import {
  LoginDto,
  RefreshDto,
  RegisterDto,
} from './auth.dto.js';

const controller = new AuthController();

export const authRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar novo usuário
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@exemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 72
 *                 example: MinhaSenha123!
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 80
 *                 example: Usuário ViralForge
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: E-mail já cadastrado
 */
authRoutes.post(
  '/register',
  authRateLimit,
  validate(RegisterDto),
  controller.register,
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Fazer login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@viralforge.local
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SuaSenhaAqui
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [USER, ADMIN]
 *                         plan:
 *                           type: string
 *                           enum: [FREE, PRO, AGENCY, ENTERPRISE]
 *                     accessToken:
 *                       type: string
 *                       description: Token JWT usado no botão Authorize
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: E-mail ou senha incorretos
 */
authRoutes.post(
  '/login',
  authRateLimit,
  validate(LoginDto),
  controller.login,
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 minLength: 20
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *       401:
 *         description: Refresh token inválido ou expirado
 */
authRoutes.post(
  '/refresh',
  authRateLimit,
  validate(RefreshDto),
  controller.refresh,
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout e revogação do refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 minLength: 20
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       204:
 *         description: Logout realizado com sucesso
 *       400:
 *         description: Dados inválidos
 */
authRoutes.post(
  '/logout',
  validate(RefreshDto),
  controller.logout,
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     summary: Obter perfil do usuário autenticado
 *     responses:
 *       200:
 *         description: Perfil atual
 *       401:
 *         description: Token ausente, inválido ou expirado
 */
authRoutes.get(
  '/me',
  auth,
  controller.me,
);
