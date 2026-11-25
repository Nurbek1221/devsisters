import { NextResponse } from 'next/server';
import { readPlatformState } from '@/lib/server/db';
import { LeaderboardEntry } from '@/lib/types';

export async function GET() {
  const state = await readPlatformState();

  const teachers = [...state.teachers].sort(
    (a, b) => (a.display_order || 99) - (b.display_order || 99)
  );
  const lessons = [...state.lessons].sort(
    (a, b) => (a.order_num || 1) - (b.order_num || 1)
  );

  const leaderboard: LeaderboardEntry[] = state.users
    .filter((u) => u.role === 'student')
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar_url: u.avatar_url,
      subject_slug: u.subject_slug,
      points: u.points || 0,
      role: u.role,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  return NextResponse.json(
    {
      teachers,
      lessons,
      quizzes: state.quizzes,
      practice_items: state.practice_items,
      community_posts: state.community_posts,
      leaderboard,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
