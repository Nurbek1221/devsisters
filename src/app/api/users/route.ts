import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import {
  getSessionPayload,
  hashPassword,
  sanitizeUser,
} from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { User } from '@/lib/types';

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Foydalanuvchilar ro‘yxati faqat administrator uchun.' },
      { status: 403 }
    );
  }

  const state = await readPlatformState();
  return NextResponse.json(
    { users: state.users.map(sanitizeUser) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== 'admin') {
    metric('admin.users_mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<User> & {
      id?: string;
      new_password?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: 'Foydalanuvchi ID kerak.' }, { status: 400 });
    }

    if (body.new_password && body.new_password.trim().length < 6) {
      return NextResponse.json(
        { error: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      );
    }

    const updated = await mutatePlatformState((draft) => {
      const idx = draft.users.findIndex((u) => u.id === body.id);
      if (idx === -1) return { state: draft, result: null };

      const current = draft.users[idx];
      draft.users[idx] = {
        ...current,
        name: body.name?.trim() || current.name,
        phone: typeof body.phone === 'string' ? body.phone.trim() : current.phone,
        role:
          body.role && ['admin', 'teacher', 'student'].includes(body.role)
            ? body.role
            : current.role,
        subject_slug:
          typeof body.subject_slug === 'string'
            ? body.subject_slug.trim()
            : current.subject_slug,
        avatar_url:
          typeof body.avatar_url === 'string' && body.avatar_url.trim()
            ? body.avatar_url.trim()
            : current.avatar_url,
        points:
          typeof body.points === 'number' && body.points >= 0
            ? body.points
            : current.points,
        is_verified:
          typeof body.is_verified === 'boolean'
            ? body.is_verified
            : current.is_verified,
        password:
          body.new_password && body.new_password.trim().length >= 6
            ? hashPassword(body.new_password.trim())
            : current.password,
      };
      return { state: draft, result: draft.users[idx] };
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi.' },
        { status: 404 }
      );
    }

    metric('admin.users_mutation', 1, { action: 'update', outcome: 'success' });
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (error) {
    metric('admin.users_mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== 'admin') {
    metric('admin.users_mutation', 1, { action: 'delete', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
  }

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
