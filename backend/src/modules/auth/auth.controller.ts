import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { LoginDto, RefreshDto, RegisterDto } from './auth.dto.js';

export class AuthController {
  constructor(private service = new AuthService()) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const dto = RegisterDto.parse(req.body);
    const result = await this.service.register(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json({ data: result });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const dto = LoginDto.parse(req.body);
    const result = await this.service.login(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ data: result });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const dto = RefreshDto.parse(req.body);
    const result = await this.service.refresh(dto.refreshToken);
    res.json({ data: result });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const dto = RefreshDto.parse(req.body);
    await this.service.logout(dto.refreshToken);
    res.status(204).send();
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const { prisma } = await import('../../config/prisma.js');
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true, name: true, role: true, plan: true, avatarUrl: true, createdAt: true },
    });
    res.json({ data: user });
  });
}
