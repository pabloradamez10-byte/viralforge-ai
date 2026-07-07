import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput) {
    return prisma.refreshToken.create({ data });
  }

  findRefreshTokenById(id: string) {
    return prisma.refreshToken.findUnique({ where: { id } });
  }

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  revokeRefreshTokenById(id: string) {
    return prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
