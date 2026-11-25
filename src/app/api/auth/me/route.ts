import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import {
  getSessionPayload,
  sanitizeUser,
} from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const state = await readPlatformState();
  const user = state.users.find((u) => u.id === session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const progress = state.user_progress.filter((p) => p.user_id === user.id);
  const certificates = state.certificates.filter(
    (c) =>
      c.user_id === user.id ||
      c.student_name.trim().toLowerCase() === user.name.trim().toLowerCase()
  );

  return NextResponse.json({
    user: sanitizeUser(user),
    progress,
    certificates,
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    metric('auth.profile_update', 1, { outcome: 'error', reason: 'unauthorized' });
    return NextResponse.json(
      { error: 'Avval tizimga kiring.' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      subject_slug?: string;
      avatar_url?: string;
    };

    const updated = await mutatePlatformState((draft) => {
      const idx = draft.users.findIndex((u) => u.id === session.userId);
      if (idx === -1) {
        return { state: draft, result: null };
      }

      const current = draft.users[idx];
      const nextName =
        typeof body.name === 'string' && body.name.trim()
          ? body.name.trim()
          : current.name;

      draft.users[idx] = {
        ...current,
        name: nextName,
        phone: typeof body.phone === 'string' ? body.phone.trim() : current.phone,
        subject_slug:
          typeof body.subject_slug === 'string' && body.subject_slug.trim()
            ? body.subject_slug.trim()
            : current.subject_slug,
        avatar_url:
          typeof body.avatar_url === 'string' && body.avatar_url.trim()
            ? body.avatar_url.trim()
            : current.avatar_url,
      };

      // Sync teacher avatar if this user is a teacher linked by subject_slug
      if (
        current.role === 'teacher' &&
        typeof body.avatar_url === 'string' &&
        body.avatar_url.trim() &&
        current.subject_slug
      ) {
        const tIdx = draft.teachers.findIndex(
          (t) => t.slug === current.subject_slug
        );
        if (tIdx !== -1) {
          draft.teachers[tIdx] = {
            ...draft.teachers[tIdx],
            avatar_url: body.avatar_url.trim(),
          };
        }
      }

      return { state: draft, result: draft.users[idx] };
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi.' },
        { status: 404 }
      );
    }

    metric('auth.profile_update', 1, { outcome: 'success' });
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (error) {
    metric('auth.profile_update', 1, { outcome: 'error', reason: 'server_error' });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Profilni yangilashda xatolik yuz berdi.',
      },
      { status: 500 }
    );
  }
}
