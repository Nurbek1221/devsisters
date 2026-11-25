'use client';

import React, { useState } from 'react';
import { Quiz } from '@/lib/types';
import { Award, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentQuizRunnerProps {
  subjectQuiz?: Quiz;
  subjectLabel: string;
  quizPassed: boolean;
  savedScore?: number;
  onPassQuiz: (scorePercent: number, quizId: string) => void;
  onOpenCertificate: (scorePercent: number) => void;
}

export default function StudentQuizRunner({
  subjectQuiz,
  subjectLabel,
  quizPassed,
  savedScore,
  onPassQuiz,
  onOpenCertificate,
}: StudentQuizRunnerProps) {
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnsSubmitted, setIsAnsSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  if (!subjectQuiz || subjectQuiz.questions.length === 0) {
    return (
      <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-8 text-center text-slate-400">
        Ushbu fan bo‘yicha test savollari tez kunda qo‘shiladi.
      </div>
    );
  }

  const questions = subjectQuiz.questions;
  const currentQ = questions[currentQIdx];
  const scorePct = Math.round((quizScore / questions.length) * 100);

  const handleRestart = () => {
    setCurrentQIdx(0);
    setSelectedOpt(null);
    setIsAnsSubmitted(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleNextQuestion = () => {
    if (currentQIdx + 1 < questions.length) {
      setCurrentQIdx((prev) => prev + 1);
      setSelectedOpt(null);
      setIsAnsSubmitted(false);
    } else {
      setQuizFinished(true);
      const pct = Math.round((quizScore / questions.length) * 100);
      onPassQuiz(pct, subjectQuiz.id);
      if (pct >= 70) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-purple-800/40 mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-white">
            {subjectQuiz.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {subjectQuiz.description}
          </p>
        </div>

        {(quizPassed || typeof savedScore === 'number') && (
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            Eng yaxshi natija: {savedScore ?? 100}%
          </span>
        )}
      </div>

      {!quizFinished && currentQ ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>
              Savol {currentQIdx + 1} / {questions.length}
            </span>
            <span className="text-pink-400 font-bold">
              To‘g‘ri: {quizScore} ta
            </span>
          </div>

          <h4 className="text-xl font-bold text-white leading-snug">
            {currentQ.question}
          </h4>

          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOpt === idx;
              const isCorrect = idx === currentQ.correct_index;

              let btnClass =
                'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10';
              if (isAnsSubmitted) {
                if (isCorrect)
                  btnClass =
                    'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold';
                else if (isSelected)
                  btnClass =
                    'bg-rose-500/20 border-rose-500/60 text-rose-300';
                else btnClass = 'bg-white/5 border-white/5 text-slate-500';
              } else if (isSelected) {
                btnClass =
                  'bg-pink-600/20 border-pink-500 text-white font-bold';
              }

              return (
                <button
                  type="button"
                  key={idx}
                  disabled={isAnsSubmitted}
                  onClick={() => setSelectedOpt(idx)}
                  className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                >
                  <span>{opt}</span>
                  {isAnsSubmitted && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnsSubmitted && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {isAnsSubmitted && currentQ.explanation && (
            <div className="p-3.5 rounded-2xl bg-purple-900/30 border border-purple-700/40 text-xs sm:text-sm text-purple-200">
              💡 {currentQ.explanation}
            </div>
          )}

          <div className="flex justify-end pt-2">
            {!isAnsSubmitted ? (
              <button
                type="button"
                disabled={selectedOpt === null}
                onClick={() => {
                  setIsAnsSubmitted(true);
                  if (selectedOpt === currentQ.correct_index) {
                    setQuizScore((s) => s + 1);
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-bold text-sm cursor-pointer"
              >
                Javobni Tekshirish
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer"
              >
                {currentQIdx + 1 < questions.length
                  ? 'Keyingi savol →'
                  : 'Natijani Ko‘rish'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
            <Award className="w-9 h-9 text-amber-400" />
          </div>
          <h4 className="text-2xl font-extrabold text-white">
            Siz {questions.length} tadan {quizScore} tasiga to‘g‘ri javob
            berdingiz! ({scorePct}%)
          </h4>
          {scorePct >= 70 ? (
            <div className="space-y-3">
              <p className="text-emerald-400 text-sm font-medium">
                Tabriklaymiz! {subjectLabel} bo‘yicha testdan muvaffaqiyatli
                o‘tdingiz (+50 ball).
              </p>
              <button
                type="button"
                onClick={() => onOpenCertificate(scorePct)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-xl cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Sertifikatni Ochish</span>
              </button>
            </div>
          ) : (
            <p className="text-amber-300 text-sm">
              Sertifikat uchun kamida 70% ball to‘plash kerak. Yana bir marta
              urining!
            </p>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Testni Qayta Ishlash</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
