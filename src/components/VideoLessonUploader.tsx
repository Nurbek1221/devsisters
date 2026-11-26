'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Link2,
} from 'lucide-react';
import {
  getVideoDuration,
  uploadLessonVideo,
  validateVideoFile,
} from '@/lib/storage';
import {
  getYouTubeEmbedUrl,
  getYouTubeId,
  isYouTubeUrl,
  YouTubeIcon,
} from '@/lib/youtube';

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
  const initialMode: 'youtube' | 'file' =
    !currentVideoUrl || isYouTubeUrl(currentVideoUrl) ? 'youtube' : 'file';

  const [sourceMode, setSourceMode] = useState<'youtube' | 'file'>(initialMode);
  const [youtubeInput, setYoutubeInput] = useState<string>(
    isYouTubeUrl(currentVideoUrl) ? currentVideoUrl : ''
  );
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

  const ytId = getYouTubeId(youtubeInput);
  const ytEmbedUrl = ytId ? getYouTubeEmbedUrl(youtubeInput, false) : '';
  const activeDirectFileSrc =
    localPreviewUrl || (!isYouTubeUrl(currentVideoUrl) ? currentVideoUrl : '');

  const normalizeInputUrl = (raw: string): string => {
    let val = raw.trim();
    // Extract src="..." if user pasted full <iframe> embed HTML
    const iframeMatch = val.match(/src=["']([^"']+)["']/i);
    if (iframeMatch?.[1]) {
      val = iframeMatch[1].trim();
    }
    if (
      val &&
      !val.startsWith('http://') &&
      !val.startsWith('https://') &&
      (val.includes('youtube') || val.includes('youtu.be'))
    ) {
      val = `https://${val}`;
    }
    return val;
  };

  const handleYouTubeChange = (val: string) => {
    setYoutubeInput(val);
    setError('');
    setUploadedReady(false);
    const normalized = normalizeInputUrl(val);
    if (!normalized) {
      onUploaded({ videoUrl: '', storagePath: '' });
      return;
    }
    const detectedId = getYouTubeId(normalized);
    if (detectedId) {
      onUploaded({ videoUrl: normalized, storagePath: '' });
    } else if (
      normalized.includes('youtube.com') ||
      normalized.includes('youtube-nocookie.com') ||
      normalized.includes('youtu.be')
    ) {
      onUploaded({ videoUrl: normalized, storagePath: '' });
    } else {
      setError('To‘g‘ri YouTube havolasini kiriting (masalan: https://youtu.be/...)');
    }
  };

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
    setYoutubeInput('');
    setSelectedName('');
    setUploadedReady(false);
    setProgress(0);
    setError('');
    onUploaded({ videoUrl: '', storagePath: '' });
  };

  return (
    <div className="space-y-3">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-purple-800/40">
        <button
          type="button"
          onClick={() => {
            setError('');
            setSourceMode('youtube');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            sourceMode === 'youtube'
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <YouTubeIcon className="w-4 h-4" />
          <span>YouTube Havola</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setError('');
            setSourceMode('file');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            sourceMode === 'file'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Tel / PC dan Yuklash</span>
        </button>
      </div>

      {/* Mode 1: YouTube URL Input */}
      {sourceMode === 'youtube' && (
        <div className="space-y-3">
          <div className="relative">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              inputMode="url"
              value={youtubeInput}
              onChange={(e) => handleYouTubeChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... yoki https://youtu.be/..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            {youtubeInput && (
              <button
                type="button"
                onClick={handleClear}
                title="Havolani tozalash"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Oddiy, Unlisted (yashirin) yoki Shorts YouTube video havolasini
            joylashtiring — dars sahifasida to‘g‘ridan-to‘g‘ri ko‘rinadi.
          </p>

          {ytId && ytEmbedUrl ? (
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>YouTube video aniqlandi (ID: {ytId}) ✓</span>
              </p>
              <div className="rounded-2xl overflow-hidden border border-purple-700/40 bg-black aspect-video">
                <iframe
                  src={ytEmbedUrl}
                  title="YouTube Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-purple-700/50 bg-white/[0.02] p-5 flex flex-col items-center justify-center text-center gap-1.5 text-slate-400">
              <YouTubeIcon className="w-7 h-7 text-rose-400/80" />
              <span className="text-xs font-medium">
                Yuqoriga YouTube havolasini qo‘ying yoki &ldquo;Tel / PC dan
                Yuklash&rdquo; ga o‘ting
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Local Device File Upload */}
      {sourceMode === 'file' && (
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
                  : activeDirectFileSrc
                    ? 'Boshqa video tanlash (Tel / PC)'
                    : 'Telefon yoki Kompyuterdan Video Tanlash'}
              </span>
            </button>

            {activeDirectFileSrc && !uploading && (
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
            Qo‘llab-quvvatlanadigan formatlar: MP4, WebM, MOV (maksimal 50 MB).
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

          {activeDirectFileSrc ? (
            <div className="rounded-2xl overflow-hidden border border-purple-700/40 bg-black aspect-video">
              <video
                key={activeDirectFileSrc}
                src={activeDirectFileSrc}
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
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
