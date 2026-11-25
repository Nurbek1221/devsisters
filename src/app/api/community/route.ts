import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { ChatMessage, CommunityPost } from '@/lib/types';

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-600',
  'from-purple-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-600',
];

function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function GET() {
  const state = await readPlatformState();
  return NextResponse.json(
    {
      chat_messages: state.chat_messages,
      community_posts: state.community_posts,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const session = await getSessionPayload();

  try {
    const body = (await request.json()) as {
      kind?: 'chat' | 'reaction' | 'post' | 'like_post';
      subject_slug?: string;
      content?: string;
      title?: string;
      messageId?: string;
      postId?: string;
      emoji?: string;
    };

    if (body.kind === 'reaction' && body.messageId && body.emoji) {
      const chatMessages = await mutatePlatformState((draft) => {
        draft.chat_messages = draft.chat_messages.map((m) => {
          if (m.id !== body.messageId) return m;
          const prevCount = m.reactions?.[body.emoji!] || 0;
          return {
            ...m,
            reactions: {
              ...m.reactions,
              [body.emoji!]: prevCount + 1,
            },
          };
        });
        return { state: draft, result: draft.chat_messages };
      });
      return NextResponse.json({ chat_messages: chatMessages });
    }

    if (body.kind === 'like_post' && body.postId) {
      const posts = await mutatePlatformState((draft) => {
        draft.community_posts = draft.community_posts.map((p) =>
          p.id === body.postId ? { ...p, likes: (p.likes || 0) + 1 } : p
        );
        return { state: draft, result: draft.community_posts };
      });
      return NextResponse.json({ community_posts: posts });
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Xabar yoki mavzu qoldirish uchun tizimga kiring.' },
        { status: 401 }
      );
    }

    if (body.kind === 'chat') {
      const content = (body.content || '').trim();
      if (!content) {
        return NextResponse.json(
          { error: 'Xabar matni bo‘sh bo‘lmasin.' },
          { status: 400 }
        );
      }

      const message = await mutatePlatformState((draft) => {
        const user = draft.users.find((u) => u.id === session.userId);
        const msg: ChatMessage = {
          id: `m-${Date.now()}`,
          subject_slug: body.subject_slug || user?.subject_slug || 'umumiy',
          sender_name: user?.name || 'Foydalanuvchi',
          sender_role: user?.role || session.role,
          sender_avatar: user?.avatar_url,
          avatar_color:
            AVATAR_GRADIENTS[draft.chat_messages.length % AVATAR_GRADIENTS.length],
          content,
          time: nowTimeString(),
          reactions: {},
        };
        draft.chat_messages.push(msg);
        if (draft.chat_messages.length > 100) {
          draft.chat_messages = draft.chat_messages.slice(-100);
        }
        return { state: draft, result: msg };
      });

      metric('community.activity', 1, { kind: 'chat', outcome: 'success' });
      return NextResponse.json({ message }, { status: 201 });
    }

    if (body.kind === 'post') {
      const title = (body.title || '').trim();
      const content = (body.content || '').trim();
      if (!title || !content) {
        return NextResponse.json(
          { error: 'Sarlavha va matnni to‘ldiring.' },
          { status: 400 }
        );
      }

      const post = await mutatePlatformState((draft) => {
        const user = draft.users.find((u) => u.id === session.userId);
        const newPost: CommunityPost = {
          id: `post-${Date.now()}`,
          author_name: user?.name || 'Foydalanuvchi',
          author_avatar: user?.avatar_url,
          subject_slug: body.subject_slug || user?.subject_slug || 'it-dasturlash',
          title,
          content,
          likes: 1,
          created_at: 'Hozirgina',
        };
        draft.community_posts.unshift(newPost);
        return { state: draft, result: newPost };
      });

      metric('community.activity', 1, { kind: 'post', outcome: 'success' });
      return NextResponse.json({ post }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Noto‘g‘ri so‘rov turi.' },
      { status: 400 }
    );
  } catch (error) {
    metric('community.activity', 1, { kind: 'error', outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionPayload();
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json(
      { error: 'Moderatsiya faqat ustoz yoki administrator uchun.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') || 'chat';
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID kerak.' }, { status: 400 });
  }

  await mutatePlatformState((draft) => {
    if (kind === 'post') {
      draft.community_posts = draft.community_posts.filter((p) => p.id !== id);
    } else {
      draft.chat_messages = draft.chat_messages.filter((m) => m.id !== id);
    }
    return { state: draft, result: true };
  });

  return NextResponse.json({ ok: true });
}
