import crypto from 'node:crypto';
import { env } from '../../config/env.js';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const k = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (k.length !== 32) {
    // fallback: derive deterministically from string
    return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
  }
  return k;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${enc.toString('base64')}.${tag.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, encB64, tagB64] = payload.split('.');
  if (!ivB64 || !encB64 || !tagB64) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(ivB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
