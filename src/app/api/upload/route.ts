import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase Storage limit)

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  // 1. Direct FormData upload (used for avatar images)
  if (contentType.includes('multipart/form-data')) {
    try {
      const session = await getSessionPayload();
      if (!session) {
        metric('media.upload', 1, { kind: 'avatar', outcome: 'error' });
        return NextResponse.json(
          { error: 'Rasm yuklash uchun tizimga kiring.' },
          { status: 401 }
        );
      }

      const formData = await request.formData();
      const file = formData.get('file');
      const folder = String(formData.get('folder') || 'users').replace(
        /[^a-z0-9\-_]/gi,
        ''
      );

      if (!(file instanceof File)) {
        metric('media.upload', 1, { kind: 'avatar', outcome: 'error' });
        return NextResponse.json(
          { error: 'Fayl yuborilmadi.' },
          { status: 400 }
        );
      }

      const allowedByMime = IMAGE_MIME_TYPES.includes(file.type);
      const allowedByExt = /\.(png|jpe?g|webp)$/i.test(file.name);
      if (!allowedByMime && !allowedByExt) {
        metric('media.upload', 1, { kind: 'avatar', outcome: 'error' });
        return NextResponse.json(
          { error: 'Faqat PNG, JPG yoki WebP rasmlar ruxsat etilgan.' },
          { status: 400 }
        );
      }

      const resolvedContentType = allowedByMime
        ? file.type
        : /\.png$/i.test(file.name)
          ? 'image/png'
          : /\.webp$/i.test(file.name)
            ? 'image/webp'
            : 'image/jpeg';

      if (file.size > MAX_AVATAR_BYTES) {
        metric('media.upload', 1, { kind: 'avatar', outcome: 'error' });
        return NextResponse.json(
          { error: 'Rasm hajmi 5 MB dan oshmasligi kerak.' },
          { status: 400 }
        );
      }

      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-');
      const objectSubPath = `${folder || 'users'}/${Date.now()}-${safeName}`;
      const pathname = `avatars/${objectSubPath}`;

      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: upErr } = await sbAdmin.storage
          .from('avatars')
          .upload(objectSubPath, buffer, {
            contentType: resolvedContentType,
            cacheControl: '3600',
            upsert: true,
          });
        if (upErr) {
          throw new Error(
            `Rasmni Supabase xotirasiga yuklashda xatolik: ${upErr.message}`
          );
        }
        const { data: pub } = sbAdmin.storage
          .from('avatars')
          .getPublicUrl(objectSubPath);
        metric('media.upload', 1, { kind: 'avatar', outcome: 'success' });
        return NextResponse.json({
          url: pub.publicUrl,
          storagePath: pathname,
          provider: 'supabase',
        });
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
        // Fallback when local machine runs offline without storage credentials
        const bytes = Buffer.from(await file.arrayBuffer());
        const dataUrl = `data:${resolvedContentType};base64,${bytes.toString('base64')}`;
        return NextResponse.json({
          url: dataUrl,
          storagePath: pathname,
          provider: 'inline-fallback',
        });
      }

      const blob = await put(pathname, file, {
        access: 'public',
        addRandomSuffix: true,
        contentType: resolvedContentType,
      });

      metric('media.upload', 1, { kind: 'avatar', outcome: 'success' });
      return NextResponse.json({
        url: blob.url,
        storagePath: blob.pathname,
        provider: 'vercel-blob',
      });
    } catch (error) {
      metric('media.upload', 1, { kind: 'avatar', outcome: 'error' });
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Rasm yuklashda xatolik yuz berdi.',
        },
        { status: 500 }
      );
    }
  }

  // 2. Client signed upload URL for lesson videos (Supabase Storage or Vercel Blob fallback)
  try {
    const rawBody = (await request.json()) as
      | (HandleUploadBody & { action?: string; pathname?: string })
      | { action?: string; pathname?: string; contentType?: string };

    if (
      'action' in rawBody &&
      rawBody.action === 'signed-video-upload' &&
      typeof rawBody.pathname === 'string'
    ) {
      const session = await getSessionPayload();
      if (
        !session ||
        (session.role !== 'teacher' && session.role !== 'admin')
      ) {
        metric('media.upload_token', 1, { kind: 'video', outcome: 'error' });
        return NextResponse.json(
          { error: 'Dars videosini faqat ustoz yoki administrator yuklay oladi.' },
          { status: 403 }
        );
      }

      const cleanPathname = rawBody.pathname.replace(/^\/+/, '');
      if (!cleanPathname.startsWith('lesson-videos/')) {
        return NextResponse.json(
          { error: 'Ruxsat etilmagan yuklash manzili.' },
          { status: 400 }
        );
      }

      const sbAdmin = getSupabaseAdmin();
      if (!sbAdmin) {
        return NextResponse.json(
          { error: 'Supabase Storage sozlanmagan.' },
          { status: 503 }
        );
      }

      const bucketPath = cleanPathname.replace(/^lesson-videos\//, '');
      const { data: signed, error: signErr } = await sbAdmin.storage
        .from('lesson-videos')
        .createSignedUploadUrl(bucketPath);

      if (signErr || !signed?.signedUrl) {
        metric('media.upload_token', 1, { kind: 'video', outcome: 'error' });
        return NextResponse.json(
          {
            error:
              signErr?.message ||
              'Video yuklash havolasini yaratib bo‘lmadi.',
          },
          { status: 500 }
        );
      }

      const { data: pub } = sbAdmin.storage
        .from('lesson-videos')
        .getPublicUrl(bucketPath);

      metric('media.upload_token', 1, { kind: 'video', outcome: 'success' });
      return NextResponse.json({
        provider: 'supabase',
        signedUrl: signed.signedUrl,
        token: signed.token,
        path: signed.path,
        storagePath: cleanPathname,
        publicUrl: pub.publicUrl,
      });
    }

    const body = rawBody as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname.startsWith('lesson-videos/')) {
          const session = await getSessionPayload();
          if (
            !session ||
            (session.role !== 'teacher' && session.role !== 'admin')
          ) {
            metric('media.upload_token', 1, {
              kind: 'video',
              outcome: 'error',
            });
            throw new Error(
              'Dars videosini faqat ustoz yoki administrator yuklay oladi.'
            );
          }

          metric('media.upload_token', 1, {
            kind: 'video',
            outcome: 'success',
          });
          return {
            allowedContentTypes: VIDEO_MIME_TYPES,
            maximumSizeInBytes: MAX_VIDEO_BYTES,
            addRandomSuffix: true,
          };
        }

        if (pathname.startsWith('avatars/')) {
          metric('media.upload_token', 1, {
            kind: 'avatar',
            outcome: 'success',
          });
          return {
            allowedContentTypes: IMAGE_MIME_TYPES,
            maximumSizeInBytes: MAX_AVATAR_BYTES,
            addRandomSuffix: true,
          };
        }

        metric('media.upload_token', 1, { kind: 'unknown', outcome: 'error' });
        throw new Error('Ruxsat etilmagan yuklash manzili.');
      },
      onUploadCompleted: async () => {
        // DB state is updated synchronously when lesson/profile form saves
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Yuklash tokenini yaratishda xatolik yuz berdi.',
      },
      { status: 400 }
    );
  }
}
