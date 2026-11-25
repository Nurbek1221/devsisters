import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import {
  getSessionPayload,
  hashPassword,
} from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { Teacher, User } from '@/lib/types';

function slugifySubject(input: string): string {
  const map: Record<string, string> = {
    'o‘': 'o',
    'o\'': 'o',
    'g‘': 'g',
    'g\'': 'g',
    sh: 'sh',
    ch: 'ch',
  };
  let s = input.toLowerCase().trim();
  for (const [k, v] of Object.entries(map)) {
    s = s.replaceAll(k, v);
  }
  return (
    s
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `fan-${Date.now()}`
  );
}

export async function GET() {
  const session = await getSessionPayload();
  const isAdmin = session?.role === 'admin';
  const state = await readPlatformState();

  const teachers = [...state.teachers]
    .sort((a, b) => (a.display_order || 99) - (b.display_order || 99))
    .map((t) => {
      if (!isAdmin) return t;
      const linkedUser = state.users.find(
        (u) => u.role === 'teacher' && u.subject_slug === t.slug
      );
      return {
        ...t,
        login_email: linkedUser?.email || '',
      };
    });

  return NextResponse.json(
    { teachers },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
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
    const body = (await request.json()) as Partial<Teacher> & {
      login_email?: string;
      login_password?: string;
    };
    const name = (body.name || '').trim();
    const subject = (body.subject || '').trim();
    if (!name || !subject) {
      return NextResponse.json(
        { error: 'Ism va fan nomi kiritilishi shart.' },
        { status: 400 }
      );
    }

    const baseSlug = slugifySubject(body.slug?.trim() || subject);
    const rawLoginEmail = (body.login_email || '').trim().toLowerCase();
    const rawPassword = (body.login_password || '').trim();

    if (rawPassword && rawPassword.length < 6) {
      return NextResponse.json(
        { error: 'Ustoz paroli kamida 6 ta belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      );
    }

    const result = await mutatePlatformState<{
      error?: string;
      teacher?: Teacher & { login_email?: string };
    }>((draft) => {
      let uniqueSlug = baseSlug;
      let counter = 2;
      while (draft.teachers.some((t) => t.slug === uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      const generatedEmail =
        rawLoginEmail || `${uniqueSlug.replace(/-/g, '')}@devsisters.uz`;
      const emailTaken = draft.users.some(
        (u) => u.email.toLowerCase() === generatedEmail
      );
      if (emailTaken) {
        return {
          state: draft,
          result: {
            error: `"${generatedEmail}" email manzili allaqachon boshqa hisobga biriktirilgan.`,
          },
        };
      }

      const teacherAvatar =
        (body.avatar_url || '').trim() ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600';

      const nextTeacher: Teacher = {
        id: `t-${Date.now()}`,
        name,
        subject,
        slug: uniqueSlug,
        bio:
          (body.bio || '').trim() ||
          `${subject} yo‘nalishi bo‘yicha tajribali ustoz va mentor.`,
        experience: (body.experience || 'Tajribali ustoz').trim(),
        avatar_url: teacherAvatar,
        telegram: (body.telegram || '').trim(),
        display_order: draft.teachers.length + 1,
      };

      const passwordToUse = rawPassword || `${uniqueSlug.replace(/-/g, '')}2026`;
      const teacherUser: User = {
        id: `u-teacher-${Date.now()}`,
        name,
        email: generatedEmail,
        password: hashPassword(passwordToUse),
        role: 'teacher',
        subject_slug: uniqueSlug,
        avatar_url: teacherAvatar,
        phone: '',
        points: 500,
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      draft.teachers.push(nextTeacher);
      draft.users.push(teacherUser);

      // Add starter quiz for new subject so quiz runner never appears broken
      if (!draft.quizzes.some((q) => q.subject_slug === uniqueSlug)) {
        draft.quizzes.push({
          id: `q-${uniqueSlug}`,
          subject_slug: uniqueSlug,
          title: `${subject}: Boshlang‘ich Bilim Testi`,
          description: `${subject} bo‘yicha asosiy ko‘nikmalarni tekshiruvchi savollar.`,
          questions: [
            {
              id: 1,
              question: `${subject} fanining asosiy maqsadi nima?`,
              options: [
                'Nazariya va amaliyotni mustahkamlash',
                'Faqat yod olish',
                'Rejasiz o‘qish',
                'Dars qoldirish',
              ],
              correct_index: 0,
              explanation: `${subject} bo‘yicha bilimlarni nazariya va amaliyot bilan o‘rganish eng samarali usuldir.`,
            },
          ],
        });
      }

      return {
        state: draft,
        result: {
          teacher: { ...nextTeacher, login_email: generatedEmail },
        },
      };
    });

    if (result.error || !result.teacher) {
      metric('admin.teachers_mutation', 1, { action: 'create', outcome: 'error' });
      return NextResponse.json(
        { error: result.error || 'Mentor yaratib bo‘lmadi.' },
        { status: 400 }
      );
    }

    metric('admin.teachers_mutation', 1, { action: 'create', outcome: 'success' });
    return NextResponse.json({ teacher: result.teacher }, { status: 201 });
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
    const body = (await request.json()) as Partial<Teacher> & {
      id?: string;
      login_email?: string;
      login_password?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: 'ID kerak.' }, { status: 400 });
    }

    if (body.login_password && body.login_password.trim().length < 6) {
      return NextResponse.json(
        { error: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.' },
        { status: 400 }
      );
    }

    const result = await mutatePlatformState<{
      status: number;
      error?: string;
      teacher?: Teacher & { login_email?: string };
    }>((draft) => {
      const idx = draft.teachers.findIndex((t) => t.id === body.id);
      if (idx === -1) {
        return {
          state: draft,
          result: { status: 404, error: 'Mentor topilmadi.' },
        };
      }

      const oldTeacher = draft.teachers[idx];
      const nextSlug = body.slug?.trim()
        ? slugifySubject(body.slug)
        : oldTeacher.slug;
      const nextName = body.name?.trim() || oldTeacher.name;
      const nextSubject = body.subject?.trim() || oldTeacher.subject;
      const nextAvatar =
        typeof body.avatar_url === 'string' && body.avatar_url.trim()
          ? body.avatar_url.trim()
          : oldTeacher.avatar_url;

      // Sync teacher user account email / password / subject / name / avatar
      const uIdx = draft.users.findIndex(
        (u) => u.role === 'teacher' && u.subject_slug === oldTeacher.slug
      );

      let resolvedEmail = uIdx !== -1 ? draft.users[uIdx].email : '';

      if (body.login_email && body.login_email.trim()) {
        const wantedEmail = body.login_email.trim().toLowerCase();
        const conflict = draft.users.some(
          (u, idxCheck) =>
            idxCheck !== uIdx && u.email.toLowerCase() === wantedEmail
        );
        if (conflict) {
          return {
            state: draft,
            result: {
              status: 409,
              error: `"${wantedEmail}" email allaqachon boshqa foydalanuvchiga tegishli.`,
            },
          };
        }
        resolvedEmail = wantedEmail;
      }

      if (uIdx !== -1) {
        draft.users[uIdx] = {
          ...draft.users[uIdx],
          name: nextName,
          email: resolvedEmail || draft.users[uIdx].email,
          subject_slug: nextSlug,
          avatar_url: nextAvatar,
          password:
            body.login_password && body.login_password.trim().length >= 6
              ? hashPassword(body.login_password.trim())
              : draft.users[uIdx].password,
        };
      } else if (resolvedEmail || body.login_password) {
        const finalEmail =
          resolvedEmail || `${nextSlug.replace(/-/g, '')}@devsisters.uz`;
        const finalPass =
          body.login_password?.trim() ||
          `${nextSlug.replace(/-/g, '')}2026`;
        draft.users.push({
          id: `u-teacher-${Date.now()}`,
          name: nextName,
          email: finalEmail,
          password: hashPassword(finalPass),
          role: 'teacher',
          subject_slug: nextSlug,
          avatar_url: nextAvatar,
          points: 500,
          is_verified: true,
          created_at: new Date().toISOString(),
        });
        resolvedEmail = finalEmail;
      }

      // If slug changed, cascade across lessons, quizzes, practice_items, and students
      if (nextSlug !== oldTeacher.slug) {
        draft.lessons = draft.lessons.map((l) =>
          l.subject_slug === oldTeacher.slug
            ? { ...l, subject_slug: nextSlug }
            : l
        );
        draft.quizzes = draft.quizzes.map((q) =>
          q.subject_slug === oldTeacher.slug
            ? { ...q, subject_slug: nextSlug }
            : q
        );
        draft.practice_items = draft.practice_items.map((p) =>
          p.subject_slug === oldTeacher.slug
            ? { ...p, subject_slug: nextSlug }
            : p
        );
        draft.users = draft.users.map((u) =>
          u.subject_slug === oldTeacher.slug
            ? { ...u, subject_slug: nextSlug }
            : u
        );
      }

      draft.teachers[idx] = {
        ...oldTeacher,
        name: nextName,
        subject: nextSubject,
        slug: nextSlug,
        bio: typeof body.bio === 'string' ? body.bio.trim() : oldTeacher.bio,
        experience:
          typeof body.experience === 'string'
            ? body.experience.trim()
            : oldTeacher.experience,
        avatar_url: nextAvatar,
        telegram:
          typeof body.telegram === 'string'
            ? body.telegram.trim()
            : oldTeacher.telegram,
      };

      return {
        state: draft,
        result: {
          status: 200,
          teacher: { ...draft.teachers[idx], login_email: resolvedEmail },
        },
      };
    });

    if (result.status !== 200 || !result.teacher) {
      metric('admin.teachers_mutation', 1, { action: 'update', outcome: 'error' });
      return NextResponse.json(
        { error: result.error || 'Yangilab bo‘lmadi.' },
        { status: result.status }
      );
    }

    metric('admin.teachers_mutation', 1, { action: 'update', outcome: 'success' });
    return NextResponse.json({ teacher: result.teacher });
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
    const target = draft.teachers.find((t) => t.id === id);
    draft.teachers = draft.teachers.filter((t) => t.id !== id);
    if (target) {
      draft.users = draft.users.filter(
        (u) => !(u.role === 'teacher' && u.subject_slug === target.slug)
      );
    }
    return { state: draft, result: true };
  });

  metric('admin.teachers_mutation', 1, { action: 'delete', outcome: 'success' });
  return NextResponse.json({ ok: true });
}
