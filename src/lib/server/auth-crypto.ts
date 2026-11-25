import crypto from 'crypto';
import { cookies } from 'next/headers';
import { PublicUser, User } from '../types';

export const SESSION_COOKIE_NAME = 'devsisters_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 kun

export interface SessionPayload {
  userId: string;
  role: 'admin' | 'teacher' | 'student';
  email: string;
  exp: number;
}

function getSessionSecret(): string {
  const configured =
    process.env.ADMIN_SECRET_KEY?.trim() || process.env.SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }
  return 'devsisters-2026-dev-fallback-secret-change-in-prod';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(
  password: string,
  storedHash?: string
): { valid: boolean; needsRehash: boolean } {
  if (!storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) {
      return { valid: false, needsRehash: false };
    }
    const [, salt, hexHash] = parts;
    try {
      const derived = crypto.scryptSync(password, salt, 64);
      const storedBuf = Buffer.from(hexHash, 'hex');
      if (derived.length !== storedBuf.length) {
        return { valid: false, needsRehash: false };
      }
      return {
        valid: crypto.timingSafeEqual(derived, storedBuf),
        needsRehash: false,
      };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy plaintext compatibility — verifies safely and forces immediate scrypt migration
  const inputDigest = crypto.createHash('sha256').update(password).digest();
  const storedDigest = crypto.createHash('sha256').update(storedHash).digest();
  const matches = crypto.timingSafeEqual(inputDigest, storedDigest);
  return { valid: matches, needsRehash: matches };
}

export function createSessionToken(
  user: Pick<User, 'id' | 'role' | 'email'>
): string {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null
): SessionPayload | null {
  if (!token || !token.includes('.')) {
    return null;
  }
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (!payload.userId || !payload.role || !payload.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function sanitizeUser(user: User): PublicUser {
  // Strip password/hash before returning user object to clients
  const { password: _removed, ...rest } = user;
  void _removed;
  return rest;
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}
