'use client';

import React from 'react';
import { Lock, CheckCircle2, Play, Trophy } from 'lucide-react';

interface LockedCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalLessons: number;
  completedCount: number;
  quizPassed: boolean;
  onGoToLessons: () => void;
  onGoToQuiz: () => void;
}

export default function LockedCertificateModal({
  isOpen,
  onClose,
  totalLessons,
  completedCount,
  quizPassed,
  onGoToLessons,
  onGoToQuiz,
}: LockedCertificateModalProps) {
  if (!isOpen) return null;

  const allVideosDone =
    totalLessons === 0 || completedCount >= totalLessons;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#160c2e] border border-purple-700/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-amber-400" />
        </div>

        <h3 className="text-xl font-extrabold text-white">
          Sertifikat hali qulflangan
        </h3>

        <p className="text-sm text-slate-300 leading-relaxed">
          QR-kod bilan tasdiqlangan rasmiy sertifikatni olish uchun quyidagi
          shartlarni bajaring:
        </p>

        <div className="space-y-3 text-left">
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              allVideosDone
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              {allVideosDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Play className="w-4 h-4 text-pink-400 shrink-0" />
              )}
              <span>
                Barcha video darslar ({completedCount}/{totalLessons})
              </span>
            </div>
            {!allVideosDone && (
              <button
                type="button"
                onClick={onGoToLessons}
                className="text-xs font-bold text-pink-400 hover:underline cursor-pointer"
              >
                Ko‘rish →
              </button>
            )}
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              quizPassed
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              {quizPassed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>Testdan kamida 70% ball olish</span>
            </div>
            {!quizPassed && (
              <button
                type="button"
                onClick={onGoToQuiz}
                className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
              >
                Topshirish →
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm cursor-pointer"
        >
          Tushunarli
        </button>
      </div>
    </div>
  );
}
