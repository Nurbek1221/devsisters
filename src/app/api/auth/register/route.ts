import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import {
  createSessionToken,
  getSessionCookieOptions,
  hashPassword,
  sanitizeUser,
} from '@/lib/server/auth-crypto';
import { mutatePlatformState } from '@/lib/server/db';
import { User } from '@/lib/types';

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      subject_slug?: string;
      avatar_url?: string;
    };

    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const phone = (body.phone || '').trim();
    const subjectSlug = (body.subject_slug || 'ingliz-tili').trim();
    const avatarUrl = (body.avatar_url || '').trim();

    if (!name || !email || !password) {
      metric('auth.register', 1, { outcome: 'error', reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Ism, email va parol kiritilishi shart!' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      metric('auth.register', 1, { outcome: 'error', reason: 'weak_password' });
      return NextResponse.json(
        { error: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      );
    }

    const result = await mutatePlatformState<{
      duplicate: boolean;
      user: User | null;
    }>((draft) => {
      const exists = draft.users.some(
        (u) => u.email.trim().toLowerCase() === email
      );
      if (exists) {
        return { state: draft, result: { duplicate: true, user: null } };
      }

      const newUser: User = {
        id: `u-student-${Date.now()}`,
        name,
        email,
        password: hashPassword(password),
        role: 'student',
        subject_slug: subjectSlug || 'ingliz-tili',
        avatar_url:
          avatarUrl ||
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
        phone,
        points: 15, // Yangi a'zolik bonusi
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      draft.users.unshift(newUser);
      return { state: draft, result: { duplicate: false, user: newUser } };
    });

    if (result.duplicate || !result.user) {
      metric('auth.register', 1, { outcome: 'error', reason: 'duplicate_email' });
      return NextResponse.json(
        {
          error:
            'Bu email manzili bilan foydalanuvchi allaqachon ro‘yxatdan o‘tgan!',
        },
        { status: 409 }
      );
    }

    const token = createSessionToken(result.user);
    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json(
      { user: sanitizeUser(result.user) },
      { status: 201 }
    );
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    metric('auth.register', 1, { outcome: 'success' });
    metric('auth.register.duration_ms', Date.now() - start, { outcome: 'success' });
    return response;
  } catch (error) {
    metric('auth.register', 1, { outcome: 'error', reason: 'server_error' });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ro‘yxatdan o‘tishda xatolik yuz berdi.',
      },
      { status: 500 }
    );
  }
}
