'use client';

import React from 'react';
import { Video } from 'lucide-react';
import { getYouTubeThumbnail, YouTubeIcon } from '@/lib/youtube';

interface LessonVideoThumbnailProps {
  videoUrl: string;
  title: string;
  emptyLabel?: string;
}

export default function LessonVideoThumbnail({
  videoUrl,
  title,
  emptyLabel = 'Video dars tez kunda yuklanadi',
}: LessonVideoThumbnailProps) {
  const ytThumb = getYouTubeThumbnail(videoUrl);
  const hasDirectVideo = Boolean(videoUrl && videoUrl.trim() && !ytThumb);

  if (ytThumb) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ytThumb}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/90 text-white border border-white/20 inline-flex items-center gap-1 shadow">
          <YouTubeIcon className="w-3 h-3" />
          <span>YouTube</span>
        </span>
      </>
    );
  }

  if (hasDirectVideo) {
    return (
      <video
        src={videoUrl}
        preload="metadata"
        muted
        playsInline
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 text-center text-slate-300">
      <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
        <Video className="w-6 h-6 text-pink-300" />
      </div>
      <span className="text-xs font-semibold">{emptyLabel}</span>
    </div>
  );
}
