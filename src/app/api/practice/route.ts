import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { PracticeItem } from '@/lib/types';

export async function GET(request: Request) {
  const session = await getSessionPayload();
  const { searchParams } = new URL(request.url);
  const includeStudents = searchParams.get('include_students') === '1';

  const state = await readPlatformState();

  let items = state.practice_items;
  if (!session) {
    items = items.filter((p) => !p.target_user_id);
  } else if (session.role === 'student') {
    items = items.filter(
      (p) => !p.target_user_id || p.target_user_id === session.userId
    );
  } else if (session.role === 'teacher') {
    const me = state.users.find((u) => u.id === session.userId);
    if (me?.subject_slug) {
      items = items.filter((p) => p.subject_slug === me.subject_slug);
    }
  }

  let students: Array<{
    id: string;
    name: string;
    email: string;
    subject_slug?: string;
    avatar_url?: string;
  }> = [];

  if (
    includeStudents &&
    session &&
    (session.role === 'teacher' || session.role === 'admin')
  ) {
    students = state.users
      .filter((u) => u.role === 'student')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        subject_slug: u.subject_slug,
        avatar_url: u.avatar_url,
      }));
  }

  return NextResponse.json(
    { practice_items: items, students },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    metric('practice.mutation', 1, { action: 'create', outcome: 'error' });
    return NextResponse.json(
      { error: 'Lug‘at va mashqlarni faqat ustoz yoki admin qo‘sha oladi.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<PracticeItem>;
    const title = (body.title || '').trim();
    const category = body.category || 'vocabulary';

    if (!title) {
      return NextResponse.json(
        { error: 'Topshiriq yoki lug‘at sarlavhasini kiriting.' },
        { status: 400 }
      );
    }

    const result = await mutatePlatformState<{
      forbidden?: boolean;
      item?: PracticeItem;
    }>((draft) => {
      const me = draft.users.find((u) => u.id === session.userId);
      const resolvedSubject =
        session.role === 'teacher' && me?.subject_slug
          ? me.subject_slug
          : (body.subject_slug || me?.subject_slug || 'it-dasturlash').trim();

      if (
        session.role === 'teacher' &&
        me?.subject_slug &&
        body.subject_slug &&
        body.subject_slug !== me.subject_slug
      ) {
        return { state: draft, result: { forbidden: true } };
      }

      const targetId = (body.target_user_id || '').trim() || undefined;
      const targetStudent = targetId
        ? draft.users.find((u) => u.id === targetId)
        : undefined;

      const newItem: PracticeItem = {
        id: `p-${Date.now()}`,
        subject_slug: resolvedSubject,
        category,
        title,
        target_user_id: targetId,
        target_student_name: targetStudent?.name,
        created_by: me?.name || 'Ustoz',
        created_at: new Date().toISOString(),
        data: body.data || {},
      };

      draft.practice_items.unshift(newItem);
      return { state: draft, result: { item: newItem } };
    });

    if (result.forbidden || !result.item) {
      metric('practice.mutation', 1, { action: 'create', outcome: 'error' });
      return NextResponse.json(
        { error: 'Faqat o‘z faningiz bo‘yicha topshiriq bera olasiz.' },
        { status: 403 }
      );
    }

    metric('practice.mutation', 1, { action: 'create', outcome: 'success' });
    return NextResponse.json({ item: result.item }, { status: 201 });
  } catch (error) {
    metric('practice.mutation', 1, { action: 'create', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    metric('practice.mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<PracticeItem> & {
      id?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: 'ID kerak.' }, { status: 400 });
    }

    const result = await mutatePlatformState<{
      status: number;
      item?: PracticeItem;
    }>((draft) => {
      const idx = draft.practice_items.findIndex((p) => p.id === body.id);
      if (idx === -1) return { state: draft, result: { status: 404 } };

      const existing = draft.practice_items[idx];
      const me = draft.users.find((u) => u.id === session.userId);
      if (
        session.role === 'teacher' &&
        me?.subject_slug &&
        existing.subject_slug !== me.subject_slug
      ) {
        return { state: draft, result: { status: 403 } };
      }

      const nextTargetId =
        typeof body.target_user_id === 'string'
          ? body.target_user_id.trim() || undefined
          : existing.target_user_id;
      const targetStudent = nextTargetId
        ? draft.users.find((u) => u.id === nextTargetId)
        : undefined;

      draft.practice_items[idx] = {
        ...existing,
        title: body.title?.trim() || existing.title,
        category: body.category || existing.category,
        subject_slug:
          session.role === 'admin' && body.subject_slug
            ? body.subject_slug
            : existing.subject_slug,
        target_user_id: nextTargetId,
        target_student_name: nextTargetId ? targetStudent?.name : undefined,
        data: body.data || existing.data,
      };

      return {
        state: draft,
        result: { status: 200, item: draft.practice_items[idx] },
      };
    });

    if (result.status !== 200 || !result.item) {
      metric('practice.mutation', 1, { action: 'update', outcome: 'error' });
      return NextResponse.json(
        { error: 'Topshiriqni yangilab bo‘lmadi.' },
        { status: result.status }
      );
    }

    metric('practice.mutation', 1, { action: 'update', outcome: 'success' });
    return NextResponse.json({ item: result.item });
  } catch (error) {
    metric('practice.mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    metric('practice.mutation', 1, { action: 'delete', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID kerak.' }, { status: 400 });
  }

  const status = await mutatePlatformState<number>((draft) => {
    const target = draft.practice_items.find((p) => p.id === id);
    if (!target) return { state: draft, result: 404 };
    const me = draft.users.find((u) => u.id === session.userId);
    if (
      session.role === 'teacher' &&
      me?.subject_slug &&
      target.subject_slug !== me.subject_slug
    ) {
      return { state: draft, result: 403 };
    }
    draft.practice_items = draft.practice_items.filter((p) => p.id !== id);
    return { state: draft, result: 200 };
  });

  if (status !== 200) {
    metric('practice.mutation', 1, { action: 'delete', outcome: 'error' });
    return NextResponse.json({ error: 'O‘chirib bo‘lmadi.' }, { status });
  }

  metric('practice.mutation', 1, { action: 'delete', outcome: 'success' });
  return NextResponse.json({ ok: true });
}
