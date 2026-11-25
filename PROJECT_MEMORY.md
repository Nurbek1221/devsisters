# devsisters.uz — Loyiha Xotirasi (Project Memory)

Ushbu hujjat **"Raqamli avlod qizlari"** tanlovi uchun ishlab chiqilgan **devsisters.uz** loyihasining barcha arxitekturaviy qarorlari, funksiyalari va texnik tuzilmasini jamlash uchun yaratilgan.

---

## 1. Loyiha Maqsadi va G‘oyasi
* **Nomi**: `devsisters.uz`
* **Muallif**: **Nurbek Jabborov** (`© 2026 devsisters.uz o‘quv platformasi`)
* **Yo‘nalishi**: O‘zbekistondagi qizlar uchun bepul IT, tillar va fanlarga oid video darslar, testlar, mashqlar, SisterAI repetitor va jonli hamjamiyat platformasi.
* **Dizayn uslubi**: Zamonaviy To‘q Binafsha va Pushti (`#0d071d`, `#ec4899`, `#a855f7`) neon-aksentli glassmorphism, Mobile-first moslashuvchan interfeys.

---

## 2. Arxitektura va Texnologiyalar
* **Frontend**: Next.js 16 (`App Router`, `cacheComponents: true`), React 19, TypeScript, Tailwind CSS v4, Lucide React icons, `qrcode`, `canvas-confetti`.
* **Shrift va SEO**: `next/font/google` (`Plus_Jakarta_Sans`), `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/opengraph-image.tsx`, `EducationalOrganization` JSON-LD.
* **Autentifikatsiya va Xavfsizlik (`src/lib/server/auth-crypto.ts`, `src/proxy.ts`)**:
  * Parollar Node `crypto.scryptSync` + 16-bayt tasodifiy salt (`scrypt$salt$hash`) bilan xeshlanadi (ochiq parol bazada ham, Admin panelda ham saqlanmaydi va ko‘rsatilmaydi).
  * Sessiyalar HMAC-SHA256 imzolangan `HttpOnly` cookie (`devsisters_session`) orqali `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me` route handlerlarida tekshiriladi.
  * `src/proxy.ts` orqali `/admin`, `/teacher`, `/student` marshrutlari himoyalanadi.
* **Saqlash va Ma’lumotlar Bazasi (`src/lib/server/db.ts`, `src/lib/storage.ts`, `supabase/schema.sql`)**:
  * **Vercel Blob (`devsisters-media`)**: Jonli bulut xotira va holat saqlash (`devsisters-db/state.json`), dars videolari (`lesson-videos/*`) va profil rasmlari (`avatars/*`) uchun asosiy saqlash tizimi.
  * **Supabase (ixtiyoriy moslik)**: `NEXT_PUBLIC_SUPABASE_URL` va `NEXT_PUBLIC_SUPABASE_ANON_KEY` mavjud bo‘lganda `lesson-videos` va `avatars` Storage bucketlari bilan avtomatik ishlaydi (`supabase/schema.sql` faylida to‘liq jadvallar va RLS siyosatlari keltirilgan).
* **Observability (`@vercel/functions` `metric()`)**:
  * Server API route handlerlarda (`auth.login`, `auth.register`, `auth.profile_update`, `media.upload`, `media.upload_token`, `lessons.mutation`, `admin.teachers_mutation`, `admin.users_mutation`, `student.progress_update`, `certificates.issue`, `community.activity`, `ai_tutor.reply`) maxsus metrikalar yoziladi.

---

## 3. Yo‘nalishlar (8 ta fan) va Ustozlar
1. **IT va Dasturlash** — Karimova Aziza (`it-dasturlash`) *(yangi qo‘shilgan yo‘nalish)*
2. **Ingliz tili** — Hazratova Sevinch (`ingliz-tili`)
3. **Arab tili** — Lutfulloyeva Mahliyo (`arab-tili`)
4. **Sport** — Mattiyeva Ilmira (`sport`)
5. **Ona tili** — Hikmatulloyeva Mubina (`ona-tili`)
6. **Geografiya** — Ergashboyeva Gulnoza (`geografiya`)
7. **Rus tili** — Normo‘minova Shaxrizoda (`rus-tili`)
8. **Kimyo** — Abdurashidova Farida (`kimyo`)

---

## 4. Asosiy Funksiyalar va Modullar
* **Gibrid Video Dars Tizimi (YouTube + Tel/PC xotira)**:
  * O‘qituvchi (`/teacher`) va Admin (`/admin`) panellarida `VideoLessonUploader` orqali **YouTube havola (`watch?v=`, `youtu.be`, `shorts`)** joylashtirish YOKI telefon/kompyuter xotirasidan video fayl (`MP4`, `WebM`, `MOV`, maks 100 MB) yuklash mumkin (`URL.createObjectURL` preview + avtomatik davomiylik).
  * Talabalar va bosh sahifada YouTube darslar `youtube-nocookie.com` iframe pleyerda, yuklangan fayllar esa HTML5 `<video controls playsInline preload="metadata" />` pleyerida ochiladi.
* **Profil Rasmlarini Yuklash (`AvatarUploader`)**:
  * Barcha rollar (O‘quvchi, Ustoz, Admin) va Ro‘yxatdan o‘tish oynasi telefon/kompyuterdan (`PNG`, `JPG`, `WebP`, maks 5 MB) rasm yuklab saqlay oladi.
* **QR-kodli Rasmiy Sertifikat va Tekshiruv (`/verify/[certId]`)**:
  * Video darslar va test (`>= 70%`) yakunlangach `/api/certificates` orqali noyob ID (`DS-2026-...`) va haqiqiy QR-kod generatsiya qilinadi.
* **Reyting (`StudentLeaderboard`) va SisterAI (`/api/ai-tutor`)**:
  * Dars yakunlash (+20 ball) va testdan o‘tish (+50 ball) real reytingni oshiradi.
  * SisterAI jonli darslar va fanlar asosida savollarga javob beradi.

---

## 5. Sinov Kirish Ma’lumotlari
* **Admin**: `admin@devsisters.uz` / `admin123` -> `/admin`
* **IT Ustoz**: `aziza@devsisters.uz` / `teacher123` -> `/teacher`
* **Ustoz (Ingliz tili)**: `sevinch@devsisters.uz` / `teacher123` -> `/teacher`
* **O‘quvchi**: `madina@devsisters.uz` / `student123` -> `/student`
* **Namuna Sertifikat Tekshiruvi**: `/verify/DS-2026-0001`
