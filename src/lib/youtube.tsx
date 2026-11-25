import React from 'react';

/**
 * Extract 11-character YouTube video ID from standard watch, youtu.be,
 * embed, shorts, or live URLs.
 */
export function getYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function isYouTubeUrl(url?: string): boolean {
  return Boolean(url && getYouTubeId(url));
}

export function getYouTubeEmbedUrl(
  url: string,
  autoplay: boolean = true
): string {
  const videoId = getYouTubeId(url);
  if (!videoId) return '';
  const autoParam = autoplay ? 'autoplay=1&' : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?${autoParam}rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
}

export function getYouTubeThumbnail(
  url: string,
  quality: 'hq' | 'maxres' = 'hq'
): string {
  const videoId = getYouTubeId(url);
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${
    quality === 'maxres' ? 'maxresdefault' : 'hqdefault'
  }.jpg`;
}

export function YouTubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
