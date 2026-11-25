import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { getSessionPayload } from '@/lib/server/auth-crypto';
import { mutatePlatformState, readPlatformState } from '@/lib/server/db';
import { CertificateRecord } from '@/lib/types';

function formatUzbekDate(date = new Date()): string {
  const months = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ];
  return `${date.getDate()}-${months[date.getMonth()]}, ${date.getFullYear()}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const certId = searchParams.get('certId')?.trim().toUpperCase();
  const state = await readPlatformState();

  if (certId) {
    const found = state.certificates.find(
      (c) => c.cert_code.toUpperCase() === certId || c.id.toUpperCase() === certId
    );
    if (!found) {
      return NextResponse.json(
        { error: 'Bunday ID raqamli sertifikat topilmadi.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { certificate: found },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ certificates: [] });
  }

  const user = state.users.find((u) => u.id === session.userId);
  const list = state.certificates.filter(
    (c) =>
      c.user_id === session.userId ||
      (user && c.student_name.toLowerCase() === user.name.toLowerCase())
  );
  return NextResponse.json({ certificates: list });
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  try {
    const body = (await request.json()) as {
      student_name?: string;
      course_name?: string;
      subject_slug?: string;
      score_percent?: number;
    };

    const studentName = (body.student_name || '').trim() || "O‘quvchi Qiz";
    const courseName = (body.course_name || '').trim() || 'IT va Ta‘lim';
    const scorePercent = Math.min(
      100,
      Math.max(0, Math.round(Number(body.score_percent) || 100))
    );

    const issued = await mutatePlatformState((draft) => {
      const existingIdx = draft.certificates.findIndex(
        (c) =>
          (session?.userId && c.user_id === session.userId && c.course_name === courseName) ||
          (c.student_name.toLowerCase() === studentName.toLowerCase() &&
            c.course_name.toLowerCase() === courseName.toLowerCase())
      );

      if (existingIdx !== -1) {
        const current = draft.certificates[existingIdx];
        if (scorePercent > current.score_percent) {
          draft.certificates[existingIdx] = {
            ...current,
            score_percent: scorePercent,
            issued_at: formatUzbekDate(),
          };
        }
        return { state: draft, result: draft.certificates[existingIdx] };
      }

      const hashCode = crypto
        .createHash('sha256')
        .update(`${studentName}|${courseName}|${Date.now()}`)
        .digest('hex')
        .slice(0, 6)
        .toUpperCase();

      const record: CertificateRecord = {
        id: `cert-${Date.now()}`,
        cert_code: `DS-2026-${hashCode}`,
        user_id: session?.userId,
        student_name: studentName,
        subject_slug: body.subject_slug,
        course_name: courseName,
        score_percent: scorePercent,
        issued_at: formatUzbekDate(),
      };

      draft.certificates.unshift(record);
      return { state: draft, result: record };
    });

    metric('certificates.issue', 1, { outcome: 'success' });
    return NextResponse.json({ certificate: issued }, { status: 201 });
  } catch (error) {
    metric('certificates.issue', 1, { outcome: 'error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xatolik yuz berdi.' },
      { status: 500 }
    );
  }
}
