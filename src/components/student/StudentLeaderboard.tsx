'use client';

import React from 'react';
import { Trophy, Medal, Sparkles } from 'lucide-react';
import { LeaderboardEntry, Teacher } from '@/lib/types';

interface StudentLeaderboardProps {
  entries: LeaderboardEntry[];
  teachers?: Teacher[];
  currentUserId?: string;
}

export default function StudentLeaderboard({
  entries,
  teachers = [],
  currentUserId,
}: StudentLeaderboardProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-1.5">
              <span>Faol O‘quvchilar Reytingi</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-400">
              Dars (+20) va testlar (+50) orqali ball to‘plang
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {entries.map((entry, idx) => {
          const subject = teachers.find((t) => t.slug === entry.subject_slug);
          const isMe = currentUserId && entry.id === currentUserId;
          const rankBadge =
            idx === 0
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
              : idx === 1
                ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                : idx === 2
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10';

          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                isMe
                  ? 'bg-pink-500/15 border-pink-500/50'
                  : 'bg-white/[0.03] border-purple-800/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black shrink-0 ${rankBadge}`}
                >
                  {idx < 3 ? <Medal className="w-3.5 h-3.5" /> : idx + 1}
                </div>

                {entry.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.avatar_url}
                    alt={entry.name}
                    className="w-9 h-9 rounded-full object-cover border border-purple-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {entry.name} {isMe && <span className="text-pink-400">(Siz)</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {subject?.subject || entry.subject_slug || 'Umumiy'}
                  </div>
                </div>
              </div>

              <div className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black shrink-0">
                {entry.points} ball
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
