import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import {
  getSessionPayload,
  hashPassword,
  sanitizeUser,
} from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { User } from '@/lib/types';

async function requireAdminSession(action?: 'update' | 'delete') {
  const session = await getSessionPayload();
  if (!session) {
    if (action) {
      metric('admin.users_mutation', 1, { action, outcome: 'error' });
    }
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            'Admin sessiyasi topilmadi yoki muddati tugagan. Iltimos, Admin sifatida qayta kiring.',
          code: 'SESSION_REQUIRED',
        },
        { status: 401 }
      ),
    };
  }

  if (session.role !== 'admin') {
    if (action) {
      metric('admin.users_mutation', 1, { action, outcome: 'error' });
    }
    const roleLabel =
      session.role === 'teacher'
        ? 'O‘qituvchi'
        : session.role === 'student'
          ? 'O‘quvchi'
          : session.role;
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: `Faol brauzer sessiyasi "${session.email}" (${roleLabel}) hisobiga o‘tgan (boshqa oynada kirilgan bo‘lishi mumkin). Admin amallari uchun Admin sifatida qayta kiring.`,
          code: 'ADMIN_ROLE_REQUIRED',
          currentRole: session.role,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, session };
}

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  const state = await readPlatformState();
  return NextResponse.json(
    { users: state.users.map(sanitizeUser) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession('update');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as Partial<User> & {
      id?: string;
      new_password?: string;
    };
    if (!body.id) {
      return NextResponse.json(
        { error: 'Foydalanuvchi ID kerak.' },
        { status: 400 }
      );
    }

    const nextPassword =
      typeof body.new_password === 'string' ? body.new_password.trim() : '';
    if (nextPassword && nextPassword.length < 6) {
      return NextResponse.json(
        { error: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      );
    }

    const rawPoints: unknown = body.points;
    const parsedPoints =
      typeof rawPoints === 'number'
        ? rawPoints
        : typeof rawPoints === 'string' && rawPoints.trim() !== ''
          ? Number(rawPoints)
          : NaN;

    const result = await mutatePlatformState<{
      status: number;
      error?: string;
      user?: User;
    }>((draft) => {
      const idx = draft.users.findIndex((u) => u.id === body.id);
      if (idx === -1) {
        return {
          state: draft,
          result: { status: 404, error: 'Foydalanuvchi topilmadi.' },
        };
      }

      const current = draft.users[idx];
      let nextEmail = current.email;
      if (typeof body.email === 'string' && body.email.trim()) {
        const cleanEmail = body.email.trim().toLowerCase();
        const duplicate = draft.users.some(
          (u, i) => i !== idx && u.email.toLowerCase() === cleanEmail
        );
        if (duplicate) {
          return {
            state: draft,
            result: {
              status: 409,
              error: `"${cleanEmail}" email manzili allaqachon band.`,
            },
          };
        }
        nextEmail = cleanEmail;
      }

      const nextName = body.name?.trim() || current.name;
      const nextAvatar =
        typeof body.avatar_url === 'string' && body.avatar_url.trim()
          ? body.avatar_url.trim()
          : current.avatar_url;
      const nextRole =
        body.role && ['admin', 'teacher', 'student'].includes(body.role)
          ? body.role
          : current.role;
      const nextSubjectSlug =
        typeof body.subject_slug === 'string'
          ? body.subject_slug.trim()
          : current.subject_slug;

      draft.users[idx] = {
        ...current,
        name: nextName,
        email: nextEmail,
        phone: typeof body.phone === 'string' ? body.phone.trim() : current.phone,
        role: nextRole,
        subject_slug: nextSubjectSlug,
        avatar_url: nextAvatar,
        points:
          Number.isFinite(parsedPoints) && parsedPoints >= 0
            ? Math.floor(parsedPoints)
            : current.points,
        is_verified:
          typeof body.is_verified === 'boolean'
            ? body.is_verified
            : current.is_verified,
        password:
          nextPassword.length >= 6
            ? hashPassword(nextPassword)
            : current.password,
      };

      if (nextRole === 'teacher' && nextSubjectSlug) {
        const tIdx = draft.teachers.findIndex(
          (t) => t.slug === nextSubjectSlug
        );
        if (tIdx !== -1) {
          draft.teachers[tIdx] = {
            ...draft.teachers[tIdx],
            name: nextName,
            avatar_url: nextAvatar || draft.teachers[tIdx].avatar_url,
          };
        }
      }

      return { state: draft, result: { status: 200, user: draft.users[idx] } };
    });

    if (result.status !== 200 || !result.user) {
      metric('admin.users_mutation', 1, { action: 'update', outcome: 'error' });
      return NextResponse.json(
        { error: result.error || 'Yangilashda xatolik.' },
        { status: result.status }
      );
    }

    metric('admin.users_mutation', 1, { action: 'update', outcome: 'success' });
    return NextResponse.json({ user: sanitizeUser(result.user) });
  } catch (error) {
    metric('admin.users_mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminSession('delete');
  if (!auth.ok) {
    return auth.response;
  }
  const { session } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID ko‘rsatilmagan.' }, { status: 400 });
  }
  if (id === session.userId) {
    return NextResponse.json(
      { error: 'O‘z administrator hisobingizni o‘chira olmaysiz.' },
      { status: 400 }
    );
  }

  await mutatePlatformState((draft) => {
    draft.users = draft.users.filter((u) => u.id !== id);
    draft.user_progress = draft.user_progress.filter((p) => p.user_id !== id);
    return { state: draft, result: true };
  });

  metric('admin.users_mutation', 1, { action: 'delete', outcome: 'success' });
  return NextResponse.json({ ok: true });
}
