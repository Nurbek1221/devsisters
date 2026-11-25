import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { Teacher } from '@/lib/types';

export async function GET() {
  const state = await readPlatformState();
  const teachers = [...state.teachers].sort(
    (a, b) => (a.display_order || 99) - (b.display_order || 99)
  );
  return NextResponse.json({ teachers }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== 'admin') {
    metric('admin.teachers_mutation', 1, { action: 'create', outcome: 'error' });
    return NextResponse.json(
      { error: 'Faqat administrator mentor qo‘sha oladi.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<Teacher>;
    const name = (body.name || '').trim();
    const subject = (body.subject || '').trim();
    if (!name || !subject) {
      return NextResponse.json(
        { error: 'Ism va fan nomi kiritilishi shart.' },
        { status: 400 }
      );
    }

    const rawSlug =
      (body.slug || subject)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `fan-${Date.now()}`;

    const teacher = await mutatePlatformState((draft) => {
      const nextTeacher: Teacher = {
        id: `t-${Date.now()}`,
        name,
        subject,
        slug: rawSlug,
        bio: (body.bio || '').trim(),
        experience: (body.experience || 'Tajribali ustoz').trim(),
        avatar_url:
          (body.avatar_url || '').trim() ||
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600',
        telegram: (body.telegram || '').trim(),
        display_order: draft.teachers.length + 1,
      };
      draft.teachers.push(nextTeacher);
      return { state: draft, result: nextTeacher };
    });

    metric('admin.teachers_mutation', 1, { action: 'create', outcome: 'success' });
    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    metric('admin.teachers_mutation', 1, { action: 'create', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== 'admin') {
    metric('admin.teachers_mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<Teacher> & { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: 'ID kerak.' }, { status: 400 });
    }

    const updated = await mutatePlatformState((draft) => {
      const idx = draft.teachers.findIndex((t) => t.id === body.id);
      if (idx === -1) return { state: draft, result: null };
      draft.teachers[idx] = {
        ...draft.teachers[idx],
        name: body.name?.trim() || draft.teachers[idx].name,
        subject: body.subject?.trim() || draft.teachers[idx].subject,
        slug: body.slug?.trim() || draft.teachers[idx].slug,
        bio: typeof body.bio === 'string' ? body.bio.trim() : draft.teachers[idx].bio,
        experience:
          typeof body.experience === 'string'
            ? body.experience.trim()
            : draft.teachers[idx].experience,
        avatar_url:
          typeof body.avatar_url === 'string' && body.avatar_url.trim()
            ? body.avatar_url.trim()
            : draft.teachers[idx].avatar_url,
        telegram:
          typeof body.telegram === 'string'
            ? body.telegram.trim()
            : draft.teachers[idx].telegram,
      };
      return { state: draft, result: draft.teachers[idx] };
    });

    if (!updated) {
      return NextResponse.json({ error: 'Mentor topilmadi.' }, { status: 404 });
    }

    metric('admin.teachers_mutation', 1, { action: 'update', outcome: 'success' });
    return NextResponse.json({ teacher: updated });
  } catch (error) {
    metric('admin.teachers_mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== 'admin') {
    metric('admin.teachers_mutation', 1, { action: 'delete', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID kerak.' }, { status: 400 });
  }

  await mutatePlatformState((draft) => {
    draft.teachers = draft.teachers.filter((t) => t.id !== id);
    return { state: draft, result: true };
  });

  metric('admin.teachers_mutation', 1, { action: 'delete', outcome: 'success' });
  return NextResponse.json({ ok: true });
}
