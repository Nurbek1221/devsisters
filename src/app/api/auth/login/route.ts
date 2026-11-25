import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import {
  createSessionToken,
  getSessionCookieOptions,
  hashPassword,
  sanitizeUser,
  verifyPassword,
} from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanPassword = (body.password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      metric('auth.login', 1, { outcome: 'error', reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Email va parolni kiriting!' },
        { status: 400 }
      );
    }

    const state = await readPlatformState();
    const found = state.users.find(
      (u) => u.email.trim().toLowerCase() === cleanEmail
    );

    if (!found) {
      metric('auth.login', 1, { outcome: 'error', reason: 'invalid_credentials' });
      return NextResponse.json(
        { error: 'Email yoki parol noto‘g‘ri!' },
        { status: 401 }
      );
    }

    const check = verifyPassword(cleanPassword, found.password);
    if (!check.valid) {
      metric('auth.login', 1, { outcome: 'error', reason: 'invalid_credentials' });
      return NextResponse.json(
        { error: 'Email yoki parol noto‘g‘ri!' },
        { status: 401 }
      );
    }

    let finalUser = found;
    if (check.needsRehash) {
      finalUser = await mutatePlatformState((draft) => {
        const idx = draft.users.findIndex((u) => u.id === found.id);
        if (idx !== -1) {
          draft.users[idx] = {
            ...draft.users[idx],
            password: hashPassword(cleanPassword),
          };
          return { state: draft, result: draft.users[idx] };
        }
        return { state: draft, result: found };
      });
    }

    const token = createSessionToken(finalUser);
    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({
      user: sanitizeUser(finalUser),
    });
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    metric('auth.login', 1, { outcome: 'success', role: finalUser.role });
    metric('auth.login.duration_ms', Date.now() - start, { outcome: 'success' });
    return response;
  } catch (error) {
    metric('auth.login', 1, { outcome: 'error', reason: 'server_error' });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Kirishda tizim xatoligi yuz berdi.',
      },
      { status: 500 }
    );
  }
}
