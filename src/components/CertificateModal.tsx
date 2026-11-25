'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Award,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  courseName: string;
  scorePercent: number;
  subjectSlug?: string;
}

function deterministicFallbackCode(studentName: string, courseName: string) {
  const input = `${studentName.trim().toLowerCase()}|${courseName.trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const code = (hash >>> 0).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `DS-2026-${code}`;
}

export default function CertificateModal({
  isOpen,
  onClose,
  studentName,
  courseName,
  scorePercent,
  subjectSlug,
}: CertificateModalProps) {
  const fallbackCode = deterministicFallbackCode(studentName, courseName);
  const [certCode, setCertCode] = useState(fallbackCode);
  const [issuedAt, setIssuedAt] = useState('2026');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const issueAndRenderQr = async () => {
      let resolvedCode = deterministicFallbackCode(studentName, courseName);
      let resolvedDate = new Intl.DateTimeFormat('uz-UZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());

      try {
        const res = await fetch('/api/certificates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_name: studentName,
            course_name: courseName,
            subject_slug: subjectSlug,
            score_percent: scorePercent,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            certificate?: { cert_code: string; issued_at: string };
          };
          if (data.certificate?.cert_code) {
            resolvedCode = data.certificate.cert_code;
            resolvedDate = data.certificate.issued_at || resolvedDate;
          }
        }
      } catch {
        // Fallback deterministik ID saqlanadi
      }

      if (cancelled) return;
      setCertCode(resolvedCode);
      setIssuedAt(resolvedDate);

      try {
        const verifyUrl = `https://devsisters.uz/verify/${resolvedCode}`;
        const url = await QRCode.toDataURL(verifyUrl, {
          width: 180,
          margin: 1,
          color: { dark: '#1c103b', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        // QR render xatoligi
      }
    };

    issueAndRenderQr();
    return () => {
      cancelled = true;
    };
  }, [isOpen, studentName, courseName, scorePercent, subjectSlug]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-3xl my-6 sm:my-8 relative">
        {/* Actions bar above certificate */}
        <div className="flex flex-wrap items-center justify-between mb-3 px-1 gap-2">
          <div className="flex items-center gap-2 text-pink-300 font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sertifikatingiz QR-kod bilan tasdiqlandi!</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/verify/${certCode}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tekshirish</span>
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Yuklab olish / Chop etish</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-rose-500/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Container */}
        <div
          id="printable-certificate"
          className="relative bg-gradient-to-br from-[#1c103b] via-[#110824] to-[#1a0c34] p-6 sm:p-10 rounded-3xl border-[3px] border-amber-400/70 shadow-2xl overflow-hidden text-center"
        >
          {/* Decorative Corner Accents */}
          <div className="absolute top-3 left-3 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-l-4 border-amber-400/80 rounded-tl-xl" />
          <div className="absolute top-3 right-3 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-r-4 border-amber-400/80 rounded-tr-xl" />
          <div className="absolute bottom-3 left-3 w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-l-4 border-amber-400/80 rounded-bl-xl" />
          <div className="absolute bottom-3 right-3 w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-r-4 border-amber-400/80 rounded-br-xl" />

          {/* Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Award className="w-96 h-96 text-amber-400" />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Logo & Platform title */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 p-0.5 shadow-xl shadow-amber-500/20 mb-3">
                <div className="w-full h-full bg-[#160b2e] rounded-[14px] flex items-center justify-center">
                  <Award className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <span className="text-xl font-black tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent">
                DEVSISTERS.UZ
              </span>
              <span className="text-[11px] font-bold text-slate-400 tracking-[0.25em] uppercase mt-1">
                Qizlar Ta‘limi va IT Rivojlanish Akademiyasi
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase">
                Sertifikat
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-pink-500 via-amber-400 to-purple-500 mx-auto mt-2 rounded-full" />
            </div>

            {/* Recipient wording */}
            <div className="space-y-3 max-w-xl mx-auto">
              <p className="text-sm sm:text-base text-slate-300">
                Ushbu faxriy sertifikat faol va bilimga chanqoq o‘quvchimiz
              </p>

              <div className="py-2 px-4 sm:px-6 rounded-2xl bg-white/5 border border-amber-400/30 inline-block">
                <span className="text-xl sm:text-3xl font-black bg-gradient-to-r from-pink-300 via-white to-amber-300 bg-clip-text text-transparent">
                  {studentName || 'O‘quvchi Qiz'}
                </span>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed pt-1">
                ga <strong className="text-white">{courseName}</strong>{' '}
                yo‘nalishi bo‘yicha ta‘lim modulini va interaktiv test
                sinovlarini{' '}
                <strong className="text-emerald-400">{scorePercent}%</strong>{' '}
                muvaffaqiyatli yakunlagani uchun taqdim etildi.
              </p>
            </div>

            {/* Bottom verification row with real QR code */}
            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              <div className="text-center sm:text-left">
                <div className="text-xs text-slate-400">
                  Tasdiqlangan Sana:
                </div>
                <div className="text-sm font-bold text-white">{issuedAt}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ID: {certCode}</span>
                </div>
              </div>

              {/* Seal / QR code */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-white border border-amber-400/50 shadow-lg">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`QR ${certCode}`}
                      className="w-16 h-16 rounded-md"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-md animate-pulse" />
                  )}
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-base font-serif italic text-amber-300 font-bold">
                    Nurbek Jabborov
                  </div>
                  <div className="w-28 h-[1px] bg-slate-600 my-1 mx-auto sm:ml-auto sm:mr-0" />
                  <div className="text-[11px] text-slate-400">
                    devsisters.uz Muallifi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
