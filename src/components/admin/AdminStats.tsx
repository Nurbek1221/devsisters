'use client';

import React from 'react';
import {
  Users,
  Video,
  Award,
  TrendingUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Lesson, PublicUser, Teacher } from '@/lib/types';

interface AdminStatsProps {
  teachers: Teacher[];
  lessons: Lesson[];
  users: PublicUser[];
}

export default function AdminStats({
  teachers,
  lessons,
  users,
}: AdminStatsProps) {
  const studentsCount = users.filter((u) => u.role === 'student').length;
  const videosReadyCount = lessons.filter(
    (l) => l.video_url && !l.video_url.includes('youtube.com')
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">
              Jami Foydalanuvchilar
            </div>
            <div className="text-2xl font-black text-white">{users.length}</div>
            <div className="text-[11px] text-emerald-400">
              {studentsCount} nafar o‘quvchi
            </div>
          </div>
        </div>

        <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">
              Mentorlar / Fanlar
            </div>
            <div className="text-2xl font-black text-white">
              {teachers.length}
            </div>
            <div className="text-[11px] text-purple-300">IT va asosiy fanlar</div>
          </div>
        </div>

        <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Video className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">Video Darslar</div>
            <div className="text-2xl font-black text-white">
              {lessons.length}
            </div>
            <div className="text-[11px] text-emerald-300">
              {videosReadyCount} ta yuklangan video
            </div>
          </div>
        </div>

        <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">Xavfsizlik</div>
            <div className="text-lg font-black text-white">HMAC + Scrypt</div>
            <div className="text-[11px] text-amber-300">
              YouTube olib tashlandi
            </div>
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Yo‘nalishlar Bo‘yicha Faollik ({teachers.length} ta fan)
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {teachers.map((t) => {
            const count = lessons.filter((l) => l.subject_slug === t.slug).length;
            return (
              <div
                key={t.id}
                className="p-3 rounded-2xl bg-white/[0.03] border border-purple-800/30 text-center space-y-1"
              >
                <div className="text-xs font-bold text-white truncate">
                  {t.subject}
                </div>
                <div className="text-lg font-black text-pink-400">{count}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>dars</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
