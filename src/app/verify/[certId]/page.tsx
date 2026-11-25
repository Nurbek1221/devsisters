import React, { Suspense } from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Calendar,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { readPlatformState } from '@/lib/server/db';

async function CertificateVerificationContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ certId: string }>;
}) {
  await connection();
  const { certId } = await paramsPromise;
  const cleanCode = decodeURIComponent(certId || '').trim().toUpperCase();
  const state = await readPlatformState();

  const cert = state.certificates.find(
    (c) =>
      c.cert_code.toUpperCase() === cleanCode || c.id.toUpperCase() === cleanCode
  );

  if (!cert) {
    return (
      <div className="w-full max-w-xl bg-[#160c2e] border border-rose-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
          <XCircle className="w-9 h-9 text-rose-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          Sertifikat topilmadi
        </h1>
        <p className="text-sm text-slate-300">
          Kiritilgan <span className="font-mono text-rose-300">{cleanCode}</span>{' '}
          raqamli sertifikat devsisters.uz bazasida mavjud emas yoki noto‘g‘ri
          kiritilgan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Bosh sahifaga qaytish</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-[#1c103b] via-[#130929] to-[#1d0e3c] border-2 border-emerald-500/50 rounded-3xl p-7 sm:p-10 shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Haqiqiy Sertifikat
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {cert.cert_code}
            </h1>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Tasdiqlangan</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs text-slate-400 mb-1">Sertifikat egasi</div>
          <div className="text-lg font-extrabold text-white">
            {cert.student_name}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs text-slate-400 mb-1">Yo‘nalish</div>
          <div className="text-lg font-extrabold text-pink-300 flex items-center gap-2">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{cert.course_name}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs text-slate-400 mb-1">Test natijasi</div>
          <div className="text-lg font-extrabold text-emerald-400 flex items-center gap-2">
            <Award className="w-4 h-4 shrink-0" />
            <span>{cert.score_percent}%</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs text-slate-400 mb-1">Berilgan sana</div>
          <div className="text-lg font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-300 shrink-0" />
            <span>{cert.issued_at}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <span>devsisters.uz • Nurbek Jabborov (2026)</span>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-pink-400 font-bold hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Platformaga o‘tish</span>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  return (
    <main className="min-h-screen bg-[#0d071d] bg-gradient-hero flex items-center justify-center p-4 sm:p-8">
      <Suspense
        fallback={
          <div className="w-full max-w-xl h-72 rounded-3xl bg-[#160c2e] border border-purple-800/40 animate-pulse flex items-center justify-center text-slate-400 text-sm">
            Sertifikat ma’lumotlari tekshirilmoqda...
          </div>
        }
      >
        <CertificateVerificationContent paramsPromise={params} />
      </Suspense>
    </main>
  );
}
