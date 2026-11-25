import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  // 1. Direct FormData upload (used for avatar images)
  if (contentType.includes('multipart/form-data')) {
    try {
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
      const pathname = `avatars/${folder || 'users'}/${Date.now()}-${safeName}`;

      if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
        // Fallback when local machine runs offline without BLOB token
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

  // 2. Client token generation for large video uploads (`@vercel/blob/client`)
  try {
    const body = (await request.json()) as HandleUploadBody;

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
