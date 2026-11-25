'use client';

import React, { useRef, useState } from 'react';
import { Lesson, Teacher } from '../lib/types';
import {
  X,
  Clock,
  CheckCircle2,
  Share2,
  Sparkles,
  BookOpen,
  Video,
} from 'lucide-react';
import { INITIAL_TEACHERS } from '@/lib/data';

interface VideoModalProps {
  lesson: Lesson | null;
  onClose: () => void;
  teachers?: Teacher[];
  isCompleted?: boolean;
  onToggleComplete?: (lessonId: string) => void;
}

export default function VideoModal({
  lesson,
  onClose,
  teachers = INITIAL_TEACHERS,
  isCompleted = false,
  onToggleComplete,
}: VideoModalProps) {
  const [copied, setCopied] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);
  const autoMarkedRef = useRef<string | null>(null);

  if (!lesson) return null;

  const teacher = teachers.find((t) => t.slug === lesson.subject_slug);
  const effectiveCompleted = onToggleComplete ? isCompleted : localCompleted;
  const hasVideo = Boolean(
    lesson.video_url &&
      lesson.video_url.trim() &&
      !lesson.video_url.includes('youtube.com') &&
      !lesson.video_url.includes('youtu.be')
  );

  const handleMarkComplete = () => {
    if (onToggleComplete) {
      onToggleComplete(lesson.id);
    } else {
      setLocalCompleted((prev) => !prev);
    }
  };

  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!onToggleComplete || effectiveCompleted) return;
    const vid = e.currentTarget;
    if (
      vid.duration > 0 &&
      vid.currentTime / vid.duration >= 0.85 &&
      autoMarkedRef.current !== lesson.id
    ) {
      autoMarkedRef.current = lesson.id;
      onToggleComplete(lesson.id);
    }
  };

  const handleVideoEnded = () => {
    if (onToggleComplete && !effectiveCompleted) {
      autoMarkedRef.current = lesson.id;
      onToggleComplete(lesson.id);
    } else if (!onToggleComplete) {
      setLocalCompleted(true);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#160c2e] border border-purple-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/40 flex flex-col max-h-[92vh]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#1c103b] border-b border-purple-800/40 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-pink-400 font-bold uppercase tracking-wider">
                <span>{teacher?.subject || lesson.subject_slug}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3 h-3" /> {lesson.duration}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                {lesson.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Yopish"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* HTML5 Video Player */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {hasVideo ? (
            <video
              key={lesson.id}
              src={lesson.video_url}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={handleVideoProgress}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-300">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-pink-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-white mb-1">
                Video dars tez kunda yuklanadi
              </p>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                {teacher?.name || 'Mentor'} ushbu dars videosini telefon yoki
                kompyuterdan yuklagandan so‘ng bu yerda avtomatik ochiladi.
              </p>
            </div>
          )}
        </div>

        {/* Footer Info & Controls */}
        <div className="p-4 sm:p-6 bg-[#140b2a] border-t border-purple-800/30 overflow-y-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <h4 className="text-lg font-bold text-white">{lesson.title}</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {lesson.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleMarkComplete}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  effectiveCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {effectiveCompleted
                    ? 'Tugatildi ✓'
                    : 'Tugatildi deb belgilash'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{copied ? 'Nusxalandi!' : 'Ulashish'}</span>
              </button>
            </div>
          </div>

          {teacher && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={teacher.avatar_url}
                  alt={teacher.name}
                  className="w-10 h-10 rounded-full object-cover border border-pink-500/50"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">
                      {teacher.name}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {teacher.subject} o‘qituvchisi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="#testlar"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Testni ishlash</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
