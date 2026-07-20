import { corsOrigins, env } from './env.js';

const INSECURE_MARKERS = [
  'change-me',
  'changeme',
  'replace-with',
  'default',
  'example',
  '1234',
];

function assertStrongSecret(name: string, value: string): void {
  const normalized = value.toLowerCase();

  if (INSECURE_MARKERS.some((marker) => normalized.includes(marker))) {
    throw new Error(`${name} contains an insecure default or placeholder value`);
  }
}

export function validateProductionConfig(): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  assertStrongSecret('JWT_SECRET', env.JWT_SECRET);
  assertStrongSecret('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET);
  assertStrongSecret('ENCRYPTION_KEY', env.ENCRYPTION_KEY);

  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (corsOrigins.includes('*')) {
    throw new Error('CORS wildcard is not allowed in production');
  }

  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one production origin');
  }
}
