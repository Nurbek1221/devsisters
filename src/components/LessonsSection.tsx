'use client';

import React, { useState } from 'react';
import { Lesson, Teacher } from '../lib/types';
import {
  Play,
  Clock,
  Sparkles,
  Video,
  User,
  Search,
  X,
} from 'lucide-react';
import LessonVideoThumbnail from './LessonVideoThumbnail';

interface LessonsSectionProps {
  lessons: Lesson[];
  teachers: Teacher[];
  selectedSubject: string | null;
  onSelectSubject: (slug: string) => void;
  onOpenVideo: (lesson: Lesson) => void;
}

export default function LessonsSection({
  lessons,
  teachers,
  selectedSubject,
  onSelectSubject,
  onOpenVideo,
}: LessonsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const currentSubject = selectedSubject || 'all';
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSubject =
      currentSubject === 'all' || lesson.subject_slug === currentSubject;
    if (!matchesSubject) return false;
    if (!normalizedQuery) return true;

    const teacher = teachers.find((t) => t.slug === lesson.subject_slug);
    const haystack = [
      lesson.title,
      lesson.description,
      lesson.subject_slug,
      teacher?.subject || '',
      teacher?.name || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return (
    <section
      id="darslar"
      className="py-20 bg-[#110a22]/80 border-t border-purple-900/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + Global Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-3 uppercase tracking-wider">
              <Video className="w-3.5 h-3.5" />
              <span>Video Darslar</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bepul O‘quv Videodarslar
            </h2>
            <p className="text-slate-400 mt-2 text-base">
              Yo‘nalishni tanlang yoki kalit so‘z orqali kerakli darsni darhol
              toping.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dars yoki fan qidirish..."
              aria-label="Darslarni qidirish"
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/5 border border-purple-700/40 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pink-500/70 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Qidiruvni tozalash"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectSubject('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              currentSubject === 'all'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            Barchasi ({lessons.length})
          </button>

          {teachers.map((t) => {
            const count = lessons.filter(
              (l) => l.subject_slug === t.slug
            ).length;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => onSelectSubject(t.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentSubject === t.slug
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                }`}
              >
                {t.subject} ({count})
              </button>
            );
          })}
        </div>

        {/* Lessons Grid */}
        {filteredLessons.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1033]/50 border border-purple-800/30 rounded-3xl">
            <Sparkles className="w-10 h-10 text-pink-400/50 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">
              {lessons.length === 0
                ? 'Hozircha video darslar joylanmagan'
                : 'Mos darslar topilmadi'}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {lessons.length === 0
                ? 'Tez orada ustozlar va admin tomonidan yangi video darslar yuklanadi.'
                : 'Boshqa fan yo‘nalishini tanlang yoki qidiruv so‘zini o‘zgartiring.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => {
              const teacher = teachers.find(
                (t) => t.slug === lesson.subject_slug
              );
              const hasReadyVideo = Boolean(
                lesson.video_url && lesson.video_url.trim()
              );

              return (
                <div
                  key={lesson.id}
                  onClick={() => onOpenVideo(lesson)}
                  className="group cursor-pointer rounded-3xl bg-[#1a1033]/90 border border-purple-800/40 hover:border-pink-500/60 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 shadow-xl shadow-black/20 flex flex-col"
                >
                  {/* Video Poster (YouTube or Uploaded HTML5 Preview) */}
                  <div className="relative h-48 w-full bg-gradient-to-br from-[#231347] via-[#1b0e36] to-[#120826] overflow-hidden flex items-center justify-center">
                    <LessonVideoThumbnail
                      videoUrl={lesson.video_url}
                      title={lesson.title}
                      emptyLabel={`${teacher?.subject || lesson.subject_slug} • ${lesson.order_num}-dars`}
                    />

                    <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors" />

                    {/* Play Overlay Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 flex items-center justify-center text-white shadow-xl shadow-pink-600/40 group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Top Left Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#140b2a]/95 text-pink-300 border border-pink-500/30">
                        {teacher?.subject || lesson.subject_slug}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          hasReadyVideo
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {hasReadyVideo ? 'Video tayyor' : 'Tez kunda'}
                      </span>
                    </div>

                    {/* Duration pill */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/85 text-[11px] font-bold text-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-pink-400" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-xs font-bold text-purple-400 mb-1">
                        {lesson.order_num}-dars
                      </div>
                      <h3 className="text-lg font-bold text-white leading-snug group-hover:text-pink-300 transition-colors line-clamp-2">
                        {lesson.title}
                      </h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mt-2">
                        {lesson.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-purple-900/40 flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-pink-400" />
                        <span className="font-medium truncate max-w-[140px]">
                          {teacher?.name || 'Ustoz'}
                        </span>
                      </div>
                      <span className="text-pink-400 font-bold group-hover:underline">
                        Tomosha qilish →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
