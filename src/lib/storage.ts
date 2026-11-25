import { upload } from '@vercel/blob/client';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
];
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024; // 20 MB gacha telefon rasmlari qisqartiriladi

export interface UploadResult {
  url: string;
  storagePath: string;
  provider: 'supabase' | 'vercel-blob' | 'local-preview';
}

function sanitizeFileName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-');
  return clean || `media-${Date.now()}`;
}

export function validateVideoFile(file: File): string | null {
  const extAllowed = /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name);
  if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !extAllowed) {
    return 'Faqat MP4, WebM yoki MOV formatidagi video fayllar ruxsat etilgan.';
  }
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = Math.round(file.size / (1024 * 1024));
    return `Video fayl hajmi 100 MB dan oshmasligi kerak (tanlangan fayl: ${mb} MB).`;
  }
  return null;
}

export function validateImageFile(file: File): string | null {
  const extAllowed = /\.(png|jpe?g|webp|jfif|gif|heic|heif|bmp)$/i.test(
    file.name
  );
  const isImageMime =
    file.type.startsWith('image/') || ALLOWED_IMAGE_TYPES.includes(file.type);
  if (!isImageMime && !extAllowed) {
    return 'Faqat rasm fayllari (PNG, JPG, WebP) ruxsat etilgan.';
  }
  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Rasm hajmi 20 MB dan oshmasligi kerak (tanlangan fayl: ${mb} MB).`;
  }
  return null;
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '10:00';
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getVideoDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('10:00');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      const formatted = formatDurationSeconds(video.duration);
      cleanup();
      resolve(formatted);
    };

    video.onerror = () => {
      cleanup();
      resolve('10:00');
    };

    video.src = objectUrl;
  });
}

/**
 * Browser-side image compression before upload so high-res 5-15MB phone camera
 * photos shrink cleanly under ~150KB and never hit 4.5MB serverless request limits.
 */
async function prepareCompactAvatarFile(
  file: File,
  maxDimension = 640
): Promise<File> {
  if (typeof window === 'undefined') {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('decode failed'));
        el.src = objectUrl;
      });

      const scale = Math.min(
        1,
        maxDimension / Math.max(img.width || 1, img.height || 1)
      );
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.86)
      );
      if (!blob) return file;

      const baseName = sanitizeFileName(file.name).replace(/\.[^.]+$/, '');
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return file;
  }
}

/**
 * Upload lesson video to Supabase Storage (`lesson-videos` bucket) if active,
 * or directly to Vercel Blob (`lesson-videos/*`) via client upload token.
 */
export async function uploadLessonVideo(
  file: File,
  subjectSlug: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const validationError = validateVideoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const cleanName = sanitizeFileName(file.name);
  const path = `lesson-videos/${subjectSlug || 'general'}/${Date.now()}-${cleanName}`;

  const sb = isSupabaseConfigured() ? getSupabaseClient() : null;
  if (sb) {
    try {
      const bucketPath = path.replace(/^lesson-videos\//, '');
      const { error } = await sb.storage
        .from('lesson-videos')
        .upload(bucketPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'video/mp4',
        });
      if (!error) {
        const { data } = sb.storage.from('lesson-videos').getPublicUrl(bucketPath);
        if (data?.publicUrl) {
          onProgress?.(100);
          return {
            url: data.publicUrl,
            storagePath: `lesson-videos/${bucketPath}`,
            provider: 'supabase',
          };
        }
      }
    } catch {
      // Fallback transparently to Vercel Blob
    }
  }

  const blob = await upload(path, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: file.type || 'video/mp4',
    onUploadProgress: (evt) => {
      if (onProgress) {
        onProgress(Math.round(evt.percentage));
      }
    },
  });

  onProgress?.(100);
  return {
    url: blob.url,
    storagePath: blob.pathname,
    provider: 'vercel-blob',
  };
}

/**
 * Upload profile or mentor avatar image (compressed in browser first)
 * to active Supabase Storage (`avatars` bucket) or Vercel Blob (`/api/upload`).
 */
export async function uploadAvatar(
  file: File,
  folder = 'users'
): Promise<UploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const readyFile = await prepareCompactAvatarFile(file);
  if (readyFile.size > 4 * 1024 * 1024) {
    throw new Error('Rasmni siqishdan keyin ham hajmi 4 MB dan katta bo‘ldi.');
  }

  const cleanName = sanitizeFileName(readyFile.name);
  const path = `avatars/${folder}/${Date.now()}-${cleanName}`;

  const sb = isSupabaseConfigured() ? getSupabaseClient() : null;
  if (sb) {
    try {
      const bucketPath = path.replace(/^avatars\//, '');
      const { error } = await sb.storage
        .from('avatars')
        .upload(bucketPath, readyFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: readyFile.type || 'image/jpeg',
        });
      if (!error) {
        const { data } = sb.storage.from('avatars').getPublicUrl(bucketPath);
        if (data?.publicUrl) {
          return {
            url: data.publicUrl,
            storagePath: `avatars/${bucketPath}`,
            provider: 'supabase',
          };
        }
      }
    } catch {
      // Fallback transparently to server / Vercel Blob
    }
  }

  const formData = new FormData();
  formData.append('file', readyFile);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    storagePath?: string;
    error?: string;
  };

  if (!res.ok || !json.url) {
    throw new Error(
      json.error ||
        'Rasmni serverga yuklab bo‘lmadi. Iltimos, PNG/JPG/WebP rasm tanlang.'
    );
  }

  return {
    url: json.url,
    storagePath: json.storagePath || path,
    provider: 'vercel-blob',
  };
}
