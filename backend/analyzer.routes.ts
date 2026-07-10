import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Cria um admin inicial caso não exista.
 * Email/senha vêm de variáveis ADMIN_EMAIL / ADMIN_PASSWORD, ou usam defaults
 * que DEVEM ser alterados em produção.
 */
export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@viralforge.ai').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info({ email }, 'Admin already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Administrator',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      emailVerified: true,
    },
  });
  logger.warn({ email, defaultPassword: password === 'ChangeMe123!' }, 'Admin user created. CHANGE THE PASSWORD.');
}
