import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { env } from '../../config/env.js';
import { AuthRepository } from './auth.repository.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt.js';
import { hashToken } from '../../shared/utils/crypto.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../../shared/errors/app-error.js';
import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
} from './auth.dto.js';

export class AuthService {
  constructor(private repo = new AuthRepository()) {}

  async register(
    input: RegisterDto,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.repo.findUserByEmail(email);

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      env.BCRYPT_COST,
    );

    const user = await this.repo.createUser({
      email,
      passwordHash,
      name: input.name,
    });

    return this.issueTokens(
      user.id,
      user.email,
      user.name,
      user.role,
      user.plan,
      meta,
    );
  }

  async login(
    input: LoginDto,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();
    const user = await this.repo.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const passwordIsValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.issueTokens(
      user.id,
      user.email,
      user.name,
      user.role,
      user.plan,
      meta,
    );
  }

  async refresh(token: string): Promise<AuthResponse> {
    let payload;

    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const stored = await this.repo.findRefreshTokenById(
      payload.jti,
    );

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const { prisma } = await import('../../config/prisma.js');

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      throw new UnauthorizedError();
    }

    await this.repo.revokeRefreshToken(stored.id);

    return this.issueTokens(
      user.id,
      user.email,
      user.name,
      user.role,
      user.plan,
    );
  }

  async logout(token: string): Promise<void> {
    let payload;

    try {
      payload = verifyRefreshToken(token);
    } catch {
      return;
    }

    await this.repo.revokeRefreshTokenById(payload.jti);
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string,
    role: 'USER' | 'ADMIN',
    plan: 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE',
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const accessToken = signAccessToken({
      sub: userId,
      email,
      role,
      plan,
    });

    const refreshId = uuid();

    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await this.repo.createRefreshToken({
      id: refreshId,
      userId,
      tokenHash: hashToken(refreshId),
      userAgent: meta?.userAgent,
      ip: meta?.ip,
      expiresAt,
    });

    const refreshToken = signRefreshToken({
      sub: userId,
      jti: refreshId,
    });

    return {
      user: {
        id: userId,
        email,
        name,
        role,
        plan,
      },
      accessToken,
      refreshToken,
    };
  }
}
