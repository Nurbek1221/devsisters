'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  LogIn,
  UserPlus,
  BookOpen,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { DEMO_USERS, loginUser, registerStudent } from '@/lib/auth';
import { INITIAL_TEACHERS } from '@/lib/data';
import AvatarUploader from '@/components/AvatarUploader';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [subjectSlug, setSubjectSlug] = useState('it-dasturlash');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const routeByRole = (role: string) => {
    if (nextPath && nextPath.startsWith('/')) {
      if (role === 'admin' && nextPath.startsWith('/admin')) {
        router.push(nextPath);
        return;
      }
      if (
        (role === 'teacher' || role === 'admin') &&
        nextPath.startsWith('/teacher')
      ) {
        router.push(nextPath);
        return;
      }
      if (nextPath.startsWith('/student')) {
        router.push(nextPath);
        return;
      }
    }

    if (role === 'admin') router.push('/admin');
    else if (role === 'teacher') router.push('/teacher');
    else router.push('/student');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser(email, password);
        if (res.error || !res.user) {
          setError(res.error || 'Kirishda xatolik yuz berdi.');
          setLoading(false);
          return;
        }
        routeByRole(res.user.role);
      } else {
        const res = await registerStudent(
          name,
          email,
          password,
          phone,
          subjectSlug,
          avatarUrl || undefined
        );
        if (res.error || !res.user) {
          setError(res.error || 'Ro‘yxatdan o‘tishda xatolik.');
          setLoading(false);
          return;
        }
        router.push('/student');
      }
    } catch {
      setError('Server bilan bog‘lanishda xatolik yuz berdi.');
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setMode('login');
    setError('');
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#0d071d] bg-gradient-hero flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-6xl w-full mx-auto pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-pink-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Bosh sahifaga qaytish</span>
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto my-8 bg-[#160c2e]/95 border border-purple-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-900/40 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            devsisters.uz Kirish
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Shaxsiy kabinetingizga kiring yoki yangi hisob yarating
          </p>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Kirish</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Ro‘yxatdan o‘tish</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-800/40">
                <AvatarUploader
                  currentUrl={avatarUrl}
                  name={name || 'O‘quvchi'}
                  folder="students"
                  size="sm"
                  label="Profil rasmini yuklash"
                  onBusyChange={setAvatarUploading}
                  onUploaded={(url) => setAvatarUrl(url)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Ism va Familiya
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Madina Rahimova"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Asosiy Fan Yo‘nalishi
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={subjectSlug}
                    onChange={(e) => setSubjectSlug(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1f133b] border border-purple-700/40 text-sm text-white focus:outline-none focus:border-pink-500"
                  >
                    {INITIAL_TEACHERS.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.subject} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Telefon raqam (ixtiyoriy)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Elektron pochta (Email)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@devsisters.uz"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Parol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || avatarUploading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-60 text-white font-bold text-sm shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>
              {avatarUploading
                ? 'Rasm yuklanmoqda...'
                : loading
                  ? 'Tekshirilmoqda...'
                  : mode === 'login'
                    ? 'Kabinetga Kirish'
                    : 'Ro‘yxatdan O‘tish'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Login Section */}
        <div className="mt-6 pt-5 border-t border-purple-800/40 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hakamlar va Sinov Uchun Tezkor Kirish</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => fillDemo(u.email, u.demoPass)}
                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-left transition-all cursor-pointer"
              >
                <div className="text-[11px] font-bold text-white truncate">
                  {u.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {u.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 pb-4">
        © 2026 devsisters.uz o‘quv platformasi — Nurbek Jabborov
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d071d] flex items-center justify-center text-slate-400 text-sm">
          Yuklanmoqda...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
