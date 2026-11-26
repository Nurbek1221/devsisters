import { upload } from '@vercel/blob/client';

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
];
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase Storage limit)

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
    return `Video fayl hajmi 50 MB dan oshmasligi kerak (tanlangan fayl: ${mb} MB).`;
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

function putFileWithProgress(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.max(1, Math.min(99, Math.round((evt.loaded / evt.total) * 100))));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Videoni yuklab bo‘lmadi (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Tarmoq xatosi tufayli video yuklanmadi.'));
    xhr.send(file);
  });
}

/**
 * Upload lesson video directly via signed Supabase Storage URL (`lesson-videos` bucket),
 * with Vercel Blob client upload fallback when Supabase is not configured.
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
  const contentType = file.type || 'video/mp4';

  const tokenRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'signed-video-upload',
      pathname: path,
      contentType,
    }),
  });

  if (tokenRes.ok) {
    const signedData = (await tokenRes.json()) as {
      provider?: string;
      signedUrl?: string;
      publicUrl?: string;
      storagePath?: string;
    };
    if (
      signedData.provider === 'supabase' &&
      signedData.signedUrl &&
      signedData.publicUrl
    ) {
      await putFileWithProgress(
        signedData.signedUrl,
        file,
        contentType,
        onProgress
      );
      onProgress?.(100);
      return {
        url: signedData.publicUrl,
        storagePath: signedData.storagePath || path,
        provider: 'supabase',
      };
    }
  } else if (tokenRes.status === 401 || tokenRes.status === 403) {
    const errBody = (await tokenRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errBody.error || 'Dars videosini faqat ustoz yoki administrator yuklay oladi.'
    );
  }

  const blob = await upload(path, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType,
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
 * via `/api/upload` to Supabase Storage (`avatars` bucket).
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

  const formData = new FormData();
  formData.append('file', readyFile);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });

  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    storagePath?: string;
    provider?: 'supabase' | 'vercel-blob' | 'local-preview';
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
    provider: json.provider || 'supabase',
  };
}
