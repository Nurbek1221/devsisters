import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ progress: [], points: 0 }, { status: 401 });
  }

  const state = await readPlatformState();
  const user = state.users.find((u) => u.id === session.userId);
  const progress = state.user_progress.filter(
    (p) => p.user_id === session.userId
  );

  return NextResponse.json({
    progress,
    points: user?.points || 0,
  });
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    metric('student.progress_update', 1, { outcome: 'error' });
    return NextResponse.json({ error: 'Tizimga kiring.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      lesson_id?: string;
      quiz_id?: string;
      quiz_score?: number;
      completed?: boolean;
    };

    const result = await mutatePlatformState((draft) => {
      let addedPoints = 0;

      if (body.lesson_id) {
        const existingIdx = draft.user_progress.findIndex(
          (p) => p.user_id === session.userId && p.lesson_id === body.lesson_id
        );
        const nextCompleted =
          typeof body.completed === 'boolean' ? body.completed : true;

        if (existingIdx === -1) {
          draft.user_progress.push({
            id: `prog-${Date.now()}`,
            user_id: session.userId,
            lesson_id: body.lesson_id,
            completed: nextCompleted,
            created_at: new Date().toISOString(),
          });
          if (nextCompleted) addedPoints += 20;
        } else {
          const prev = draft.user_progress[existingIdx].completed;
          draft.user_progress[existingIdx].completed = nextCompleted;
          if (!prev && nextCompleted) addedPoints += 20;
        }
      }

      if (body.quiz_id && typeof body.quiz_score === 'number') {
        const existingIdx = draft.user_progress.findIndex(
          (p) => p.user_id === session.userId && p.quiz_id === body.quiz_id
        );
        const passed = body.quiz_score >= 70;

        if (existingIdx === -1) {
          draft.user_progress.push({
            id: `prog-q-${Date.now()}`,
            user_id: session.userId,
            quiz_id: body.quiz_id,
            quiz_score: body.quiz_score,
            completed: passed,
            created_at: new Date().toISOString(),
          });
          if (passed) addedPoints += 50;
        } else {
          const prevPassed = draft.user_progress[existingIdx].completed;
          draft.user_progress[existingIdx].quiz_score = Math.max(
            draft.user_progress[existingIdx].quiz_score || 0,
            body.quiz_score
          );
          draft.user_progress[existingIdx].completed = prevPassed || passed;
          if (!prevPassed && passed) addedPoints += 50;
        }
      }

      let totalPoints = 0;
      const uIdx = draft.users.findIndex((u) => u.id === session.userId);
      if (uIdx !== -1) {
        draft.users[uIdx].points =
          (draft.users[uIdx].points || 0) + addedPoints;
        totalPoints = draft.users[uIdx].points || 0;
      }

      return {
        state: draft,
        result: {
          progress: draft.user_progress.filter(
            (p) => p.user_id === session.userId
          ),
          points: totalPoints,
          addedPoints,
        },
      };
    });

    metric('student.progress_update', 1, { outcome: 'success' });
    return NextResponse.json(result);
  } catch (error) {
    metric('student.progress_update', 1, { outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}
