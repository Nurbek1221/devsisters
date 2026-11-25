import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import {
  deleteBlobIfOwned,
  mutatePlatformState,
  readPlatformState,
} from '@/lib/server/db';
import { Lesson } from '@/lib/types';

function isYouTubeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('youtube.com') || lower.includes('youtu.be');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectSlug = searchParams.get('subject_slug');
  const state = await readPlatformState();
  const list = subjectSlug
    ? state.lessons.filter((l) => l.subject_slug === subjectSlug)
    : state.lessons;

  return NextResponse.json(
    {
      lessons: [...list].sort(
        (a, b) => (a.order_num || 1) - (b.order_num || 1)
      ),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    metric('lessons.mutation', 1, { action: 'create', outcome: 'error' });
    return NextResponse.json(
      { error: 'Dars qo‘shish uchun ustoz yoki admin huquqi kerak.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<Lesson>;
    const title = (body.title || '').trim();
    const subjectSlug = (body.subject_slug || '').trim();
    const videoUrl = (body.video_url || '').trim();

    if (!title || !subjectSlug) {
      return NextResponse.json(
        { error: 'Dars nomi va fan yo‘nalishi majburiy.' },
        { status: 400 }
      );
    }

    if (videoUrl && isYouTubeUrl(videoUrl)) {
      return NextResponse.json(
        {
          error:
            'YouTube havolalari taqiqlangan. Iltimos, qurilmangiz xotirasidan MP4/WebM/MOV video yuklang.',
        },
        { status: 400 }
      );
    }

    const result = await mutatePlatformState<{
      forbidden: boolean;
      lesson: Lesson | null;
    }>((draft) => {
      const currentUser = draft.users.find((u) => u.id === session.userId);
      if (
        session.role === 'teacher' &&
        currentUser?.subject_slug &&
        currentUser.subject_slug !== subjectSlug
      ) {
        return { state: draft, result: { forbidden: true, lesson: null } };
      }

      const nextOrder =
        draft.lessons.filter((l) => l.subject_slug === subjectSlug).length + 1;

      const newLesson: Lesson = {
        id: `l-${Date.now()}`,
        teacher_id: body.teacher_id || currentUser?.id,
        subject_slug: subjectSlug,
        title,
        description: (body.description || '').trim(),
        video_url: videoUrl,
        video_storage_path: (body.video_storage_path || '').trim() || undefined,
        duration: (body.duration || '10:00').trim(),
        order_num:
          typeof body.order_num === 'number' && body.order_num > 0
            ? body.order_num
            : nextOrder,
      };

      draft.lessons.push(newLesson);
      return { state: draft, result: { forbidden: false, lesson: newLesson } };
    });

    if (result.forbidden || !result.lesson) {
      metric('lessons.mutation', 1, { action: 'create', outcome: 'error' });
      return NextResponse.json(
        { error: 'Faqat o‘zingizga biriktirilgan fan uchun dars qo‘sha olasiz.' },
        { status: 403 }
      );
    }

    metric('lessons.mutation', 1, { action: 'create', outcome: 'success' });
    return NextResponse.json({ lesson: result.lesson }, { status: 201 });
  } catch (error) {
    metric('lessons.mutation', 1, { action: 'create', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    metric('lessons.mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json(
      { error: 'Ruxsat berilmadi.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<Lesson> & { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: 'Dars ID si kerak.' }, { status: 400 });
    }
    if (body.video_url && isYouTubeUrl(body.video_url)) {
      return NextResponse.json(
        {
          error:
            'YouTube havolasi qo‘llab-quvvatlanmaydi. Qurilmadan video yuklang.',
        },
        { status: 400 }
      );
    }

    let previousVideoUrl = '';

    const result = await mutatePlatformState<{
      status: number;
      lesson: Lesson | null;
    }>((draft) => {
      const idx = draft.lessons.findIndex((l) => l.id === body.id);
      if (idx === -1) {
        return { state: draft, result: { status: 404, lesson: null } };
      }

      const currentUser = draft.users.find((u) => u.id === session.userId);
      const existing = draft.lessons[idx];
      if (
        session.role === 'teacher' &&
        currentUser?.subject_slug &&
        existing.subject_slug !== currentUser.subject_slug
      ) {
        return { state: draft, result: { status: 403, lesson: null } };
      }

      if (
        typeof body.video_url === 'string' &&
        body.video_url !== existing.video_url
      ) {
        previousVideoUrl = existing.video_url;
      }

      draft.lessons[idx] = {
        ...existing,
        title: typeof body.title === 'string' ? body.title.trim() : existing.title,
        description:
          typeof body.description === 'string'
            ? body.description.trim()
            : existing.description,
        subject_slug:
          session.role === 'admin' && typeof body.subject_slug === 'string'
            ? body.subject_slug.trim()
            : existing.subject_slug,
        video_url:
          typeof body.video_url === 'string'
            ? body.video_url.trim()
            : existing.video_url,
        video_storage_path:
          typeof body.video_storage_path === 'string'
            ? body.video_storage_path.trim()
            : existing.video_storage_path,
        duration:
          typeof body.duration === 'string'
            ? body.duration.trim()
            : existing.duration,
        order_num:
          typeof body.order_num === 'number' ? body.order_num : existing.order_num,
      };

      return {
        state: draft,
        result: { status: 200, lesson: draft.lessons[idx] },
      };
    });

    if (result.status !== 200 || !result.lesson) {
      metric('lessons.mutation', 1, { action: 'update', outcome: 'error' });
      return NextResponse.json(
        {
          error:
            result.status === 404 ? 'Dars topilmadi.' : 'Tahrirlash taqiqlangan.',
        },
        { status: result.status }
      );
    }

    if (previousVideoUrl) {
      await deleteBlobIfOwned(previousVideoUrl);
    }

    metric('lessons.mutation', 1, { action: 'update', outcome: 'success' });
    return NextResponse.json({ lesson: result.lesson });
  } catch (error) {
    metric('lessons.mutation', 1, { action: 'update', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    metric('lessons.mutation', 1, { action: 'delete', outcome: 'error' });
    return NextResponse.json({ error: 'Ruxsat berilmadi.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID ko‘rsatilmagan.' }, { status: 400 });
  }

  let removedUrl = '';
  const status = await mutatePlatformState((draft) => {
    const target = draft.lessons.find((l) => l.id === id);
    if (!target) {
      return { state: draft, result: 404 as const };
    }
    const currentUser = draft.users.find((u) => u.id === session.userId);
    if (
      session.role === 'teacher' &&
      currentUser?.subject_slug &&
      target.subject_slug !== currentUser.subject_slug
    ) {
      return { state: draft, result: 403 as const };
    }

    removedUrl = target.video_url;
    draft.lessons = draft.lessons.filter((l) => l.id !== id);
    return { state: draft, result: 200 as const };
  });

  if (status !== 200) {
    metric('lessons.mutation', 1, { action: 'delete', outcome: 'error' });
    return NextResponse.json(
      { error: status === 404 ? 'Dars topilmadi.' : 'Ruxsat yo‘q.' },
      { status }
    );
  }

  if (removedUrl) {
    await deleteBlobIfOwned(removedUrl);
  }

  metric('lessons.mutation', 1, { action: 'delete', outcome: 'success' });
  return NextResponse.json({ ok: true });
}
