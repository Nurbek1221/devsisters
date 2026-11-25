'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadAvatar, validateImageFile } from '@/lib/storage';

interface AvatarUploaderProps {
  currentUrl?: string;
  name?: string;
  folder?: string;
  size?: 'sm' | 'md' | 'lg';
  onUploaded: (url: string) => Promise<void> | void;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
}

export default function AvatarUploader({
  currentUrl,
  name = 'Foydalanuvchi',
  folder = 'users',
  size = 'md',
  onUploaded,
  onBusyChange,
  label = 'Rasm yuklash (Tel / PC)',
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sizeClass =
    size === 'sm'
      ? 'w-12 h-12 rounded-xl'
      : size === 'lg'
        ? 'w-20 h-20 rounded-2xl'
        : 'w-14 h-14 rounded-2xl';

  const displayUrl = previewUrl || currentUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setDone(false);

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);
    onBusyChange?.(true);

    try {
      const result = await uploadAvatar(file, folder);
      await onUploaded(result.url);
      setPreviewUrl('');
      URL.revokeObjectURL(objectUrl);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Profil rasmini yuklashda xatolik yuz berdi.'
      );
      setPreviewUrl('');
      URL.revokeObjectURL(objectUrl);
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div
          className={`relative ${sizeClass} overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0`}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-extrabold text-pink-300">
              {(name || 'D').charAt(0).toUpperCase()}
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-pink-500/20 border border-white/15 hover:border-pink-500/40 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer disabled:opacity-60"
          >
            <Camera className="w-3.5 h-3.5 text-pink-400" />
            <span>{uploading ? 'Yuklanmoqda...' : label}</span>
          </button>
          <span className="text-[11px] text-slate-400">
            PNG, JPG, WebP • Avtomatik optimallashtiriladi
          </span>
        </div>
      </div>

      {done && (
        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Profil rasmi bazaga saqlandi!</span>
        </p>
      )}
      {error && (
        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
