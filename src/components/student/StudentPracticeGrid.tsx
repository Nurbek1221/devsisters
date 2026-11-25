'use client';

import React, { useState } from 'react';
import { PracticeItem } from '@/lib/types';
import { CheckCircle2, Dumbbell, Volume2, Sparkles } from 'lucide-react';

interface StudentPracticeGridProps {
  items: PracticeItem[];
  subjectLabel: string;
  currentUserId?: string;
}

export default function StudentPracticeGrid({
  items,
  subjectLabel,
  currentUserId,
}: StudentPracticeGridProps) {
  const [flippedVocab, setFlippedVocab] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-8 text-center text-slate-400">
        {subjectLabel} fani uchun amaliyot kartochkalari tez kunda qo‘shiladi.
      </div>
    );
  }

  // Show individual teacher-assigned items first
  const sortedItems = [...items].sort((a, b) => {
    const aPersonal = a.target_user_id === currentUserId ? 0 : 1;
    const bPersonal = b.target_user_id === currentUserId ? 0 : 1;
    return aPersonal - bPersonal;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedItems.map((item) => {
        const isPersonal = Boolean(
          currentUserId && item.target_user_id === currentUserId
        );

        if (item.category === 'workout' || item.category === 'exercise') {
          return (
            <div
              key={item.id}
              className={`rounded-3xl p-6 bg-[#160c2e] border flex flex-col justify-between shadow-xl space-y-4 ${
                isPersonal
                  ? 'border-amber-400/60'
                  : 'border-emerald-500/30'
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Mashq Kompleksi</span>
                  </span>
                  {isPersonal && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Ustozdan sizga</span>
                    </span>
                  )}
                </div>

                {item.data.reps && (
                  <div className="text-[11px] font-bold text-amber-300 mb-1">
                    {item.data.reps}
                  </div>
                )}

                <h4 className="text-lg font-extrabold text-white mb-3">
                  {item.title}
                </h4>

                {item.data.steps && item.data.steps.length > 0 && (
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
                    {item.data.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {item.data.tip && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                  💡 {item.data.tip}
                </div>
              )}
            </div>
          );
        }

        const isFlipped = !!flippedVocab[item.id];
        return (
          <div
            key={item.id}
            onClick={() =>
              setFlippedVocab((prev) => ({
                ...prev,
                [item.id]: !prev[item.id],
              }))
            }
            className={`cursor-pointer group relative min-h-[16rem] rounded-3xl p-6 bg-[#160c2e] border transition-all duration-300 flex flex-col justify-between shadow-xl ${
              isPersonal
                ? 'border-amber-400/60 hover:border-amber-300'
                : 'border-purple-800/40 hover:border-pink-500/50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-300 border border-pink-500/20">
                {item.title}
              </span>
              {isPersonal ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Ustozdan sizga</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">
                  {isFlipped ? 'Oldi tomoni' : 'Aylantirish 🔄'}
                </span>
              )}
            </div>

            {!isFlipped ? (
              <div className="my-auto py-4 text-center">
                <p className="text-2xl sm:text-3xl font-black text-white mb-1 group-hover:text-pink-300 transition-colors">
                  {item.data.word}
                </p>
                {item.data.pronunciation && (
                  <p className="text-xs text-pink-400 font-mono flex items-center justify-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{item.data.pronunciation}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="my-auto py-4 space-y-2 text-center">
                <p className="text-lg font-bold text-emerald-400">
                  {item.data.translation}
                </p>
                {item.data.example && (
                  <p className="text-xs text-slate-300 italic">
                    “{item.data.example}”
                  </p>
                )}
                {item.data.tip && (
                  <p className="text-[11px] text-amber-300">
                    💡 {item.data.tip}
                  </p>
                )}
              </div>
            )}

            <div className="text-center text-[11px] text-slate-500">
              {isFlipped
                ? 'Yopish uchun bosing'
                : 'Tarjima va izohni ko‘rish uchun bosing'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
