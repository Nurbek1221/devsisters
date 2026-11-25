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
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

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
  const extAllowed = /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !extAllowed) {
    return 'Faqat PNG, JPG/JPEG yoki WebP formatidagi rasm fayllar ruxsat etilgan.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Rasm hajmi 5 MB dan oshmasligi kerak (tanlangan fayl: ${mb} MB).`;
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

function fileToCompactDataUrl(file: File, maxDimension = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Rasmni o‘qib bo‘lmadi'));
      };
      if (typeof reader.result === 'string') img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload lesson video to Supabase Storage (`lesson-videos` bucket) if reachable,
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

  // 1. Try Supabase Storage (`lesson-videos` bucket) when configured & reachable
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

  // 2. Upload via Vercel Blob client upload (`/api/upload`)
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
 * Upload profile or mentor avatar image to Supabase Storage (`avatars` bucket),
 * or Vercel Blob (`avatars/*`), with compressed DataURL fallback for offline local dev.
 */
export async function uploadAvatar(
  file: File,
  folder = 'users'
): Promise<UploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const cleanName = sanitizeFileName(file.name);
  const path = `avatars/${folder}/${Date.now()}-${cleanName}`;

  // 1. Try Supabase Storage (`avatars` bucket)
  const sb = isSupabaseConfigured() ? getSupabaseClient() : null;
  if (sb) {
    try {
      const bucketPath = path.replace(/^avatars\//, '');
      const { error } = await sb.storage
        .from('avatars')
        .upload(bucketPath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
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

  // 2. Upload via server multipart endpoint (`/api/upload`) -> Vercel Blob
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const json = (await res.json()) as {
        url?: string;
        storagePath?: string;
      };
      if (json.url) {
        return {
          url: json.url,
          storagePath: json.storagePath || path,
          provider: 'vercel-blob',
        };
      }
    }
  } catch {
    // Fallback to compact WebP data URL if offline
  }

  const compactUrl = await fileToCompactDataUrl(file);
  return {
    url: compactUrl,
    storagePath: path,
    provider: 'local-preview',
  };
}
