-- =====================================================================
-- devsisters.uz — Supabase Database Schema & Storage RLS Policies
-- Loyiha: "Raqamli avlod qizlari" IT-ta'lim va mentorlik platformasi
-- Muallif: Nurbek Jabborov (2026)
-- =====================================================================

-- 1. ASOSIY JADVALLAR
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
  subject_slug TEXT DEFAULT 'ingliz-tili',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT NOT NULL,
  experience TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  telegram TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
  subject_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  video_storage_path TEXT DEFAULT '',
  duration TEXT NOT NULL DEFAULT '10:00',
  order_num INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  quiz_id TEXT,
  quiz_score INTEGER,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  cert_code TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  subject_slug TEXT,
  course_name TEXT NOT NULL,
  score_percent INTEGER NOT NULL,
  issued_at TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  subject_slug TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  subject_slug TEXT DEFAULT 'umumiy',
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'teacher', 'student')),
  sender_avatar TEXT DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'from-pink-500 to-rose-600',
  content TEXT NOT NULL,
  time TEXT NOT NULL,
  reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. JADVAL RLS (Row Level Security) SIYOSATLARI
-- =====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Ochiq o'qish siyosatlari (parolsiz ma'lumotlar server API orqali ham himoyalangan)
CREATE POLICY "Public read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public read certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Public read posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Public read chat" ON public.chat_messages FOR SELECT USING (true);

-- Service role yoki backend API orqali yozish (anon kalit orqali bevosita users jadvalini o'qish taqiqlangan)
CREATE POLICY "Deny direct anon users read" ON public.users
  FOR SELECT TO anon USING (false);

-- =====================================================================
-- 3. SUPABASE STORAGE BUCKETLAR (avatars va lesson-videos)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-videos',
  'lesson-videos',
  TRUE,
  104857600, -- 100 MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================================
-- 4. STORAGE RLS SIYOSATLARI (storage.objects)
-- =====================================================================
-- 4.1 Avatars bucket: hamma ko'ra oladi, foydalanuvchi rasm yuklashi va yangilashi mumkin
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated upload avatars"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated update avatars"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- 4.2 Lesson videos bucket: hamma tomosha qila oladi, o'qituvchi/admin yuklay oladi
CREATE POLICY "Public read lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');

CREATE POLICY "Upload lesson videos"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'lesson-videos');

CREATE POLICY "Update lesson videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-videos');

CREATE POLICY "Delete lesson videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-videos');
