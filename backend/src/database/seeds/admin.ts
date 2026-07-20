import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const INSECURE_PASSWORDS = new Set([
  '123456',
  'password',
  'admin',
  'changeme123!',
  'changeme',
]);

/**
 * Cria o administrador inicial somente quando ADMIN_EMAIL e ADMIN_PASSWORD
 * forem fornecidos explicitamente. Nunca cria credenciais padrão.
 */
export async function seedAdmin(): Promise<void> {
  const rawEmail = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!rawEmail || !password) {
    logger.info(
      'Admin seed skipped: ADMIN_EMAIL and ADMIN_PASSWORD were not provided',
    );
    return;
  }

  const email = rawEmail.toLowerCase();
  const normalizedPassword = password.toLowerCase();

  if (password.length < 12 || INSECURE_PASSWORDS.has(normalizedPassword)) {
    const message =
      'ADMIN_PASSWORD must contain at least 12 characters and cannot use a known default value';

    if (env.NODE_ENV === 'production') {
      throw new Error(message);
    }

    logger.warn({ email }, `${message}. Admin seed skipped.`);
    return;
  }

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
      name: process.env.ADMIN_NAME?.trim() || 'Administrator',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      emailVerified: true,
    },
  });

  logger.info({ email }, 'Admin user created from explicit seed credentials');
}
