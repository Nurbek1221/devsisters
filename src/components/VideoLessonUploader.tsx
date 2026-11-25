'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  getVideoDuration,
  uploadLessonVideo,
  validateVideoFile,
} from '@/lib/storage';

interface VideoLessonUploaderProps {
  subjectSlug: string;
  currentVideoUrl?: string;
  onUploaded: (result: {
    videoUrl: string;
    storagePath: string;
    duration?: string;
  }) => void;
  onUploadingChange?: (busy: boolean) => void;
}

export default function VideoLessonUploader({
  subjectSlug,
  currentVideoUrl = '',
  onUploaded,
  onUploadingChange,
}: VideoLessonUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [selectedName, setSelectedName] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [uploadedReady, setUploadedReady] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const activePreviewSrc = localPreviewUrl || currentVideoUrl;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadedReady(false);

    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setLocalPreviewUrl(preview);
    setSelectedName(file.name);
    setProgress(5);
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const [duration, uploaded] = await Promise.all([
        getVideoDuration(file),
        uploadLessonVideo(file, subjectSlug, (pct) => {
          setProgress(Math.max(5, pct));
        }),
      ]);

      onUploaded({
        videoUrl: uploaded.url,
        storagePath: uploaded.storagePath,
        duration,
      });
      setProgress(100);
      setUploadedReady(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Videoni bulut xotiraga yuklashda xatolik yuz berdi.'
      );
      setProgress(0);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      e.target.value = '';
    }
  };

  const handleClear = () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl('');
    }
    setSelectedName('');
    setUploadedReady(false);
    setProgress(0);
    setError('');
    onUploaded({ videoUrl: '', storagePath: '' });
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600/90 to-purple-600/90 hover:from-pink-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-pink-600/20 cursor-pointer disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>
            {uploading
              ? `Yuklanmoqda (${progress}%)`
              : activePreviewSrc
                ? 'Boshqa video tanlash (Tel / PC)'
                : 'Telefon yoki Kompyuterdan Video Tanlash'}
          </span>
        </button>

        {activePreviewSrc && !uploading && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Videoni olib tashlash</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Qo‘llab-quvvatlanadigan formatlar: MP4, WebM, MOV (maksimal 100 MB).
      </p>

      {uploading && (
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {selectedName && uploadedReady && (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{selectedName} muvaffaqiyatli yuklandi!</span>
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {activePreviewSrc ? (
        <div className="rounded-2xl overflow-hidden border border-purple-700/40 bg-black aspect-video">
          <video
            key={activePreviewSrc}
            src={activePreviewSrc}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain bg-black"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-purple-700/50 bg-white/[0.02] p-5 flex flex-col items-center justify-center text-center gap-1.5 text-slate-400">
          <Video className="w-7 h-7 text-purple-400/70" />
          <span className="text-xs font-medium">
            Hozircha video fayl tanlanmagan (xotiradan MP4/WebM/MOV tanlang)
          </span>
        </div>
      )}
    </div>
  );
}
