'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Heart,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import { registerStudent } from '@/lib/auth';
import { INITIAL_TEACHERS } from '@/lib/data';
import { Teacher } from '@/lib/types';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers?: Teacher[];
}

export default function OnboardingModal({
  isOpen,
  onClose,
  teachers: propTeachers,
}: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [liveTeachers, setLiveTeachers] = useState<Teacher[] | null>(null);

  const teachers: Teacher[] =
    liveTeachers && liveTeachers.length > 0
      ? liveTeachers
      : propTeachers && propTeachers.length > 0
        ? propTeachers
        : INITIAL_TEACHERS;

  // Form fields (avatar upload intentionally omitted for fast student signup)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSubject, setSelectedSubject] =
    useState<string>('it-dasturlash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/teachers', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { teachers?: Teacher[] } | null) => {
        if (active && data?.teachers?.length) {
          setLiveTeachers(data.teachers);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Iltimos, ism, email va parolni kiriting!');
      return;
    }
    if (password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo‘lishi kerak!');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await registerStudent(
        name.trim(),
        email.trim().toLowerCase(),
        password.trim(),
        '',
        selectedSubject
      );

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      if (res.user) {
        try {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ec4899', '#a855f7', '#38bdf8', '#fbbf24'],
          });
        } catch {
          // ignore
        }

        setTimeout(() => {
          onClose();
          router.push('/student');
        }, 600);
      }
    } catch {
      setError('Xatolik yuz berdi. Qayta urining.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#160c2e] border border-purple-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/50 my-8">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/5 flex">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {/* Header */}
        <div className="px-6 py-5 bg-[#1c103b]/80 border-b border-purple-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-pink-400 uppercase tracking-widest">
                {step === 1 ? '1-qadam / 2-qadam' : '2-qadam / 2-qadam'}
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {step === 1
                  ? 'Shaxsiy Ma’lumotlaringiz'
                  : 'Qaysi Fanni O‘rganishni Xohlaysiz?'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                devsisters.uz platformasiga xush kelibsiz! Shaxsiy kabinetingizni
                oching — keyin istalgan vaqt kabinetingiz ichidan rasmingizni
                o‘zgartirishingiz mumkin.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Ismingiz va Familiyangiz
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Madina Rahimova"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Elektron pochta (Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="madina@mail.uz"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Yangi parol (kamida 6 ta belgi)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <a
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:underline"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Oldin ro‘yxatdan o‘tganmisiz? Kirish</span>
                </a>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Keyingi qadam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-start gap-3">
                <Heart className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-pink-200 leading-relaxed">
                  <strong>Muhim:</strong> Siz <strong>1 ta asosiy fanni</strong>{' '}
                  tanlaysiz va kabinetingizda barcha video darslar, testlar va
                  lug‘atlar hamda AI yordamchi sizga moslashadi. Keyinchalik
                  kabinetdan boshqa fanga o‘tishingiz ham mumkin.
                </p>
              </div>

              {/* Subjects Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {teachers.map((t) => {
                  const isSelected = selectedSubject === t.slug;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedSubject(t.slug)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-br from-pink-600/30 to-purple-600/30 border-pink-500 shadow-lg shadow-pink-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.avatar_url}
                            alt={t.name}
                            className="w-11 h-11 rounded-full object-cover border border-pink-500/40 shrink-0"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {t.subject}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {t.name}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-pink-500 text-white'
                            : 'bg-white/10 text-transparent border border-white/20'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Orqaga</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleComplete}
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    {loading
                      ? 'Saqlanmoqda...'
                      : 'Tayyor! Darslarni Boshlash'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer badge */}
        <div className="px-6 py-3 bg-[#100822] border-t border-purple-900/40 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-pink-400" />
            <span>{teachers.length} ta yo‘nalishda bepul darslar</span>
          </div>
          <span>100% Xavfsiz & Shaxsiy kabinet</span>
        </div>
      </div>
    </div>
  );
}
