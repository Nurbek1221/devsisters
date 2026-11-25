import crypto from 'crypto';
import { del, get, list, put } from '@vercel/blob';
import {
  CertificateRecord,
  ChatMessage,
  CommunityPost,
  Lesson,
  PracticeItem,
  Quiz,
  Teacher,
  User,
  UserProgress,
} from '../types';
import {
  INITIAL_LESSONS,
  INITIAL_POSTS,
  INITIAL_PRACTICE,
  INITIAL_QUIZZES,
  INITIAL_TEACHERS,
} from '../data';
import { hashPassword, verifyPassword } from './auth-crypto';

const LEGACY_STATE_BLOB_PATHNAME = 'devsisters-db/state.json';
const STATE_PREFIX = 'devsisters-db/state/';

export interface PlatformState {
  users: User[];
  teachers: Teacher[];
  lessons: Lesson[];
  quizzes: Quiz[];
  practice_items: PracticeItem[];
  user_progress: UserProgress[];
  certificates: CertificateRecord[];
  community_posts: CommunityPost[];
  chat_messages: ChatMessage[];
}

const INITIAL_CHAT_SEED: ChatMessage[] = [
  {
    id: 'm-1',
    subject_slug: 'ingliz-tili',
    sender_name: 'Hazratova Sevinch',
    sender_role: 'teacher',
    avatar_color: 'from-pink-500 to-rose-600',
    content:
      'Qizlarjonlar, hammangizga xayrli kech! Yangi 1-darsimiz yuklandi, vazifalarni ko‘rib savollaringiz bo‘lsa shu yerda yozishingiz mumkin! 🌸',
    time: '20:15',
    reactions: { '❤️': 14, '🔥': 8 },
  },
  {
    id: 'm-2',
    subject_slug: 'it-dasturlash',
    sender_name: 'Karimova Aziza',
    sender_role: 'teacher',
    avatar_color: 'from-violet-500 to-indigo-600',
    content:
      'Raqamli avlod qizlari jamoasiga xush kelibsiz! Bugun HTML5 va zamonaviy UI asoslarini boshlaymiz 💻✨',
    time: '20:18',
    reactions: { '👏': 11, '💻': 9 },
  },
  {
    id: 'm-3',
    subject_slug: 'sport',
    sender_name: 'Mattiyeva Ilmira',
    sender_role: 'teacher',
    avatar_color: 'from-amber-500 to-rose-500',
    content:
      'Ertalab 07:00 da barchangiz bilan 10 daqiqalik yengil badantarbiya qilamiz! Sog‘lom qomat — go‘zallik garovi 💪',
    time: '20:25',
    reactions: { '🔥': 12, '💪': 15 },
  },
  {
    id: 'm-4',
    subject_slug: 'ingliz-tili',
    sender_name: 'Madina Rahimova',
    sender_role: 'student',
    avatar_color: 'from-purple-500 to-indigo-600',
    content:
      'Testni muvaffaqiyatli topshirib QR-kodli sertifikat oldim! Platforma juda qulay ekan 🎉',
    time: '20:31',
    reactions: { '🎉': 19, '✨': 11 },
  },
  {
    id: 'm-5',
    subject_slug: 'kimyo',
    sender_name: 'Abdurashidova Farida',
    sender_role: 'teacher',
    avatar_color: 'from-blue-500 to-cyan-600',
    content:
      'Barakalla qizlar! Hamma o‘quvchilarimizga omad tilayman, savollaringiz bo‘lsa doim yordamga tayyorman 🧪👏',
    time: '20:34',
    reactions: { '❤️': 10 },
  },
];

export const DEFAULT_TEACHER_ACCOUNTS: Array<{
  userId: string;
  teacherId: string;
  name: string;
  email: string;
  defaultPassword: string;
  subject_slug: string;
  avatar_url: string;
  phone: string;
}> = [
  {
    userId: 'u-teacher-1',
    teacherId: 't-1',
    name: 'Hazratova Sevinch',
    email: 'sevinch@devsisters.uz',
    defaultPassword: 'sevinch2026',
    subject_slug: 'ingliz-tili',
    avatar_url:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600',
    phone: '+998 91 234 56 78',
  },
  {
    userId: 'u-teacher-2',
    teacherId: 't-2',
    name: 'Lutfulloyeva Mahliyo',
    email: 'mahliyo@devsisters.uz',
    defaultPassword: 'mahliyo2026',
    subject_slug: 'arab-tili',
    avatar_url:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    phone: '+998 93 345 67 89',
  },
  {
    userId: 'u-teacher-3',
    teacherId: 't-3',
    name: 'Mattiyeva Ilmira',
    email: 'ilmira@devsisters.uz',
    defaultPassword: 'ilmira2026',
    subject_slug: 'sport',
    avatar_url:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
    phone: '+998 94 456 78 90',
  },
  {
    userId: 'u-teacher-4',
    teacherId: 't-4',
    name: 'Hikmatulloyeva Mubina',
    email: 'mubina@devsisters.uz',
    defaultPassword: 'mubina2026',
    subject_slug: 'ona-tili',
    avatar_url:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=600',
    phone: '+998 90 444 11 22',
  },
  {
    userId: 'u-teacher-5',
    teacherId: 't-5',
    name: 'Ergashboyeva Gulnoza',
    email: 'gulnoza@devsisters.uz',
    defaultPassword: 'gulnoza2026',
    subject_slug: 'geografiya',
    avatar_url:
      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=600',
    phone: '+998 91 555 22 33',
  },
  {
    userId: 'u-teacher-6',
    teacherId: 't-6',
    name: 'Normo‘minova Shaxrizoda',
    email: 'shaxrizoda@devsisters.uz',
    defaultPassword: 'shaxrizoda2026',
    subject_slug: 'rus-tili',
    avatar_url:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    phone: '+998 93 666 33 44',
  },
  {
    userId: 'u-teacher-7',
    teacherId: 't-7',
    name: 'Abdurashidova Farida',
    email: 'farida@devsisters.uz',
    defaultPassword: 'farida2026',
    subject_slug: 'kimyo',
    avatar_url:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
    phone: '+998 94 777 44 55',
  },
  {
    userId: 'u-teacher-8',
    teacherId: 't-8',
    name: 'Karimova Aziza',
    email: 'aziza@devsisters.uz',
    defaultPassword: 'aziza2026',
    subject_slug: 'it-dasturlash',
    avatar_url:
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=600',
    phone: '+998 97 777 12 34',
  },
];

function createInitialUsers(): User[] {
  const seededTeachers: User[] = DEFAULT_TEACHER_ACCOUNTS.map((acc) => ({
    id: acc.userId,
    name: acc.name,
    email: acc.email,
    password: hashPassword(acc.defaultPassword),
    role: 'teacher',
    subject_slug: acc.subject_slug,
    avatar_url: acc.avatar_url,
    phone: acc.phone,
    points: 520,
    is_verified: true,
    created_at: '2026-01-12T08:00:00.000Z',
  }));

  return [
    {
      id: 'u-admin',
      name: 'Nurbek Jabborov (Admin)',
      email: 'admin@devsisters.uz',
      password: hashPassword('admin123'),
      role: 'admin',
      avatar_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      phone: '+998 90 123 45 67',
      points: 999,
      is_verified: true,
      created_at: '2026-01-10T08:00:00.000Z',
    },
    ...seededTeachers,
    {
      id: 'u-student-1',
      name: 'Madina Rahimova',
      email: 'madina@devsisters.uz',
      password: hashPassword('student123'),
      role: 'student',
      subject_slug: 'ingliz-tili',
      avatar_url:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
      phone: '+998 95 901 23 45',
      points: 340,
      is_verified: true,
      created_at: '2026-02-01T09:00:00.000Z',
    },
    {
      id: 'u-student-2',
      name: 'Zilola Karimova',
      email: 'zilola@devsisters.uz',
      password: hashPassword('student123'),
      role: 'student',
      subject_slug: 'it-dasturlash',
      avatar_url:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=600',
      phone: '+998 99 412 11 22',
      points: 390,
      is_verified: true,
      created_at: '2026-02-02T10:00:00.000Z',
    },
    {
      id: 'u-student-3',
      name: 'Rayhona Jo‘rayeva',
      email: 'rayhona@devsisters.uz',
      password: hashPassword('student123'),
      role: 'student',
      subject_slug: 'sport',
      avatar_url:
        'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=600',
      phone: '+998 93 880 44 55',
      points: 280,
      is_verified: true,
      created_at: '2026-02-03T11:00:00.000Z',
    },
  ];
}

function createInitialState(): PlatformState {
  return {
    users: createInitialUsers(),
    teachers: INITIAL_TEACHERS.map((t) => ({ ...t })),
    lessons: INITIAL_LESSONS.map((l) => ({ ...l })),
    quizzes: INITIAL_QUIZZES.map((q) => ({ ...q })),
    practice_items: INITIAL_PRACTICE.map((p) => ({ ...p })),
    user_progress: [
      {
        id: 'prog-seed-1',
        user_id: 'u-student-1',
        lesson_id: 'l-1',
        completed: true,
        created_at: '2026-02-05T12:00:00.000Z',
      },
    ],
    certificates: [
      {
        id: 'cert-demo-1',
        cert_code: 'DS-2026-0001',
        user_id: 'u-student-1',
        student_name: 'Madina Rahimova',
        subject_slug: 'ingliz-tili',
        course_name: 'Ingliz tili',
        score_percent: 95,
        issued_at: '25-Noyabr, 2026',
      },
    ],
    community_posts: INITIAL_POSTS.map((p) => ({ ...p })),
    chat_messages: INITIAL_CHAT_SEED.map((m) => ({ ...m })),
  };
}

function normalizeState(raw: Partial<PlatformState>): PlatformState {
  const base = createInitialState();

  const teachers =
    Array.isArray(raw.teachers) && raw.teachers.length > 0
      ? raw.teachers
      : base.teachers;
  if (!teachers.some((t) => t.slug === 'it-dasturlash')) {
    const itTeacher = base.teachers.find((t) => t.slug === 'it-dasturlash');
    if (itTeacher) teachers.push(itTeacher);
  }

  const lessons = (
    Array.isArray(raw.lessons) && raw.lessons.length > 0
      ? raw.lessons
      : base.lessons
  ).map((l) => {
    const url = (l.video_url || '').trim();
    // Clean only the old dummy rickroll placeholder while keeping real YouTube lessons
    return url.includes('dQw4w9WgXcQ') ? { ...l, video_url: '' } : l;
  });
  if (!lessons.some((l) => l.subject_slug === 'it-dasturlash')) {
    const itLesson = base.lessons.find(
      (l) => l.subject_slug === 'it-dasturlash'
    );
    if (itLesson) lessons.push(itLesson);
  }

  const quizzes =
    Array.isArray(raw.quizzes) && raw.quizzes.length > 0
      ? raw.quizzes
      : base.quizzes;
  if (!quizzes.some((q) => q.subject_slug === 'it-dasturlash')) {
    const itQuiz = base.quizzes.find((q) => q.subject_slug === 'it-dasturlash');
    if (itQuiz) quizzes.unshift(itQuiz);
  }

  const practiceItems =
    Array.isArray(raw.practice_items) && raw.practice_items.length > 0
      ? raw.practice_items
      : base.practice_items;
  if (!practiceItems.some((p) => p.subject_slug === 'it-dasturlash')) {
    practiceItems.push(
      ...base.practice_items.filter((p) => p.subject_slug === 'it-dasturlash')
    );
  }

  const certificates =
    Array.isArray(raw.certificates) && raw.certificates.length > 0
      ? raw.certificates
      : base.certificates;

  const users: User[] =
    Array.isArray(raw.users) && raw.users.length > 0
      ? raw.users.map((u) => ({ ...u }))
      : base.users;

  // Ensure every active built-in teacher has a user account with an individual password
  for (const acc of DEFAULT_TEACHER_ACCOUNTS) {
    const teacherActive = teachers.some((t) => t.slug === acc.subject_slug);
    if (!teacherActive) continue;

    const existingIdx = users.findIndex(
      (u) =>
        u.id === acc.userId ||
        (u.subject_slug === acc.subject_slug && u.role === 'teacher')
    );
    if (existingIdx === -1) {
      users.push({
        id: acc.userId,
        name: acc.name,
        email: acc.email,
        password: hashPassword(acc.defaultPassword),
        role: 'teacher',
        subject_slug: acc.subject_slug,
        avatar_url: acc.avatar_url,
        phone: acc.phone,
        points: 520,
        is_verified: true,
        created_at: '2026-01-12T08:00:00.000Z',
      });
    } else if (verifyPassword('teacher123', users[existingIdx].password).valid) {
      // Upgrade legacy shared 'teacher123' password to teacher's individual default password
      users[existingIdx] = {
        ...users[existingIdx],
        password: hashPassword(acc.defaultPassword),
      };
    }
  }

  return {
    users,
    teachers,
    lessons,
    quizzes,
    practice_items: practiceItems,
    user_progress: Array.isArray(raw.user_progress)
      ? raw.user_progress
      : base.user_progress,
    certificates,
    community_posts:
      Array.isArray(raw.community_posts) && raw.community_posts.length > 0
        ? raw.community_posts
        : base.community_posts,
    chat_messages:
      Array.isArray(raw.chat_messages) && raw.chat_messages.length > 0
        ? raw.chat_messages
        : base.chat_messages,
  };
}

let memoryState: PlatformState | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/**
 * Reads platform state from immutable versioned Blob snapshots (`devsisters-db/state/<ts>-<id>.json`).
 * Avoids CDN overwrite propagation delays so writes are visible immediately across all serverless regions.
 */
export async function readPlatformState(): Promise<PlatformState> {
  if (hasBlobToken()) {
    const listed = await list({ prefix: STATE_PREFIX });
    const ordered = [...listed.blobs].sort((a, b) =>
      b.pathname.localeCompare(a.pathname)
    );

    for (const candidate of ordered.slice(0, 3)) {
      try {
        const res = await fetch(candidate.url, { cache: 'no-store' });
        if (res.ok) {
          const parsed = (await res.json()) as Partial<PlatformState>;
          const normalized = normalizeState(parsed);
          memoryState = normalized;
          return normalized;
        }
      } catch {
        // Try next snapshot if candidate was just rotated out
      }
    }

    // One-time migration from legacy fixed-path `devsisters-db/state.json` if present
    try {
      const legacy = await get(LEGACY_STATE_BLOB_PATHNAME, {
        access: 'public',
        useCache: false,
      });
      if (legacy && legacy.statusCode === 200) {
        const parsed = (await new Response(
          legacy.stream
        ).json()) as Partial<PlatformState>;
        const normalized = normalizeState(parsed);
        await writePlatformState(normalized);
        return normalized;
      }
    } catch {
      // No legacy state present
    }

    const seeded = createInitialState();
    await writePlatformState(seeded);
    return seeded;
  }

  if (!memoryState) {
    memoryState = createInitialState();
  }
  return memoryState;
}

export async function writePlatformState(
  nextState: PlatformState
): Promise<PlatformState> {
  const normalized = normalizeState(nextState);
  memoryState = normalized;

  if (hasBlobToken()) {
    const ts = String(Date.now()).padStart(15, '0');
    const rand = crypto.randomBytes(3).toString('hex');
    const key = `${STATE_PREFIX}${ts}-${rand}.json`;

    await put(key, JSON.stringify(normalized), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    // Retain latest 5 immutable snapshots so concurrent readers never hit 404
    try {
      const listed = await list({ prefix: STATE_PREFIX });
      const ordered = [...listed.blobs].sort((a, b) =>
        b.pathname.localeCompare(a.pathname)
      );
      const stale = ordered.slice(5).map((b) => b.url);
      if (stale.length > 0) {
        await del(stale);
      }
    } catch {
      // Best-effort cleanup
    }
  }
  return normalized;
}

export async function mutatePlatformState<T>(
  mutator: (
    state: PlatformState
  ) =>
    | Promise<{ state: PlatformState; result: T }>
    | { state: PlatformState; result: T }
): Promise<T> {
  let output!: T;
  const run = async () => {
    const current = await readPlatformState();
    const cloned = structuredClone(current);
    const updated = await mutator(cloned);
    await writePlatformState(updated.state);
    output = updated.result;
  };
  writeQueue = writeQueue.then(run, run);
  await writeQueue;
  return output;
}

export async function deleteBlobIfOwned(urlOrPath?: string): Promise<void> {
  if (!urlOrPath || !hasBlobToken()) return;
  if (!urlOrPath.includes('blob.vercel-storage.com')) return;
  try {
    await del(urlOrPath);
  } catch {
    // Best-effort cleanup
  }
}
