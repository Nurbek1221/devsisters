import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { readPlatformState } from '@/lib/server/db';

function buildLocalGroundedReply(
  question: string,
  state: Awaited<ReturnType<typeof readPlatformState>>
): string {
  const q = question.toLowerCase();

  // Check if user asks about teachers or a specific subject
  const matchedTeacher = state.teachers.find(
    (t) =>
      q.includes(t.subject.toLowerCase()) ||
      q.includes(t.slug.replace('-', ' ')) ||
      q.includes(t.name.toLowerCase())
  );

  if (matchedTeacher) {
    const subjectLessons = state.lessons.filter(
      (l) => l.subject_slug === matchedTeacher.slug
    );
    const lessonTitles =
      subjectLessons.map((l) => `• ${l.title} (${l.duration})`).join('\n') ||
      'Yangi video darslar tez kunda joylanadi.';
    return `${matchedTeacher.subject} yo‘nalishi bo‘yicha mentorimiz — ${matchedTeacher.name} (${matchedTeacher.experience}).\n\nMavjud darslar:\n${lessonTitles}\n\nDarslarni ko‘rib bo‘lgach, test topshirib QR-kodli sertifikat va reyting ballari olishingiz mumkin!`;
  }

  if (q.includes('html') || q.includes('css') || q.includes('javascript') || q.includes('dastur') || q.includes('it')) {
    return `IT va Dasturlash bo‘yicha ajoyib savol! 💻\n\n1) HTML — sahifa tuzilmasi (<h1>, <p>, <button>, <video> teglari).\n2) CSS — ko‘rinish va moslashuvchan dizayn (Flexbox, Grid, Tailwind CSS).\n3) JavaScript — interaktiv mantiq.\n\nMaslahat: "IT va Dasturlash" bo‘limidagi Karimova Aziza ustozning 1-darsini ko‘rib, so‘ng interaktiv testni topshiring (+50 ball)!`;
  }

  if (q.includes('ingliz') || q.includes('ielts') || q.includes('english') || q.includes('speaking') || q.includes('grammar')) {
    return `Ingliz tili (IELTS) sirlari:\n• Har kuni kamida 5 ta yangi iborani gap ichida qo‘llab yodlang ("Amaliyot" bo‘limidagi kartochkalarni aylantirib mashq qiling).\n• Speakingda "How are you?" ga "I am doing great, thank you!" kabi tabiiy javoblardan foydalaning.\n• Hazratova Sevinch ustozimizning video darslari va testini yakunlab 70%+ natija olsangiz sertifikat ochiladi.`;
  }

  if (q.includes('arab') || q.includes('harf') || q.includes('tajvid')) {
    return `Arab tili o‘ngdan chapga yoziladi va alifboda 28 ta harf mavjud:\n• Fatha (َ) — qisqa "A" unlisi\n• Kasra (ِ) — qisqa "I" unlisi\n• Damma (ُ) — qisqa "U" unlisi\nLutfulloyeva Mahliyo ustozning 1-darsidan maxrajlarni batafsil o‘rganishingiz mumkin!`;
  }

  if (q.includes('sertifikat') || q.includes('qr') || q.includes('ball')) {
    return `Sertifikat va Reyting tizimi qanday ishlaydi?\n1) Shaxsiy kabinetda video darslarni yakunlang (+20 ball).\n2) Fan testidan kamida 70% ball to‘plang (+50 ball).\n3) Shundan so‘ng "Sertifikatni yuklab olish" tugmasi ochiladi — unda devsisters.uz/verify/... manzilli haqiqiy QR-kod tekshiruv raqami bo‘ladi!`;
  }

  if (q.includes('sport') || q.includes('gimnastika') || q.includes('qomat')) {
    return `Kunlik 10 daqiqalik gimnastika kompyuterda o‘qiyotgan qizlar uchun juda muhim! Mattiyeva Ilmira ustoz tavsiyasi:\n1. Chuqur nafas olib qo‘llarni cho‘zish (15 sek)\n2. Bo‘yin va yelkani aylantirish (30 sek)\n3. 15 marta yengil squat va xotirjam nafas chiqarish.`;
  }

  if (q.includes('kimyo') || q.includes('atom') || q.includes('molekula')) {
    return `Kimyo asoslari 🧪:\n• Atom — proton (+), neytron (0) va elektron (−) lardan iborat.\n• Molekula — moddaning kimyoviy xossalarini saqlovchi eng kichik zarrasi (masalan, H₂O).\nAbdurashidova Farida ustozning Kimyo darsi va testini sinab ko‘ring!`;
  }

  const subjects = state.teachers.map((t) => t.subject).join(', ');
  return `Salom! Men SisterAI — devsisters.uz aqlli ta‘lim yordamchisiman ✨\n\nPlatformamizda ${state.teachers.length} ta yo‘nalish mavjud: ${subjects}.\nSiz menga IT (HTML/CSS/JS), Ingliz tili, Arab tili, Kimyo, Ona tili, Geografiya, Rus tili, Sport mashqlari yoki sertifikat olish bo‘yicha aniq savol berishingiz mumkin!`;
}

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const body = (await request.json()) as {
      message?: string;
    };
    const question = (body.message || '').trim();
    if (!question) {
      metric('ai_tutor.reply', 1, { outcome: 'error' });
      return NextResponse.json(
        { error: 'Savol matnini yozing.' },
        { status: 400 }
      );
    }

    const state = await readPlatformState();

    // Optional external OpenAI call if key is configured
    const openAiKey = process.env.OPENAI_API_KEY?.trim();
    if (openAiKey) {
      try {
        const teachersContext = state.teachers
          .map((t) => `${t.subject} (${t.name}, ${t.experience})`)
          .join('; ');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Sen SisterAI — O'zbekistondagi qizlar uchun devsisters.uz ta'lim platformasining mehribon va aniq o'zbek tilidagi AI repetitorisan. Yo'nalishlar: ${teachersContext}. Qisqa, aniq va foydali javob ber.`,
              },
              { role: 'user', content: question },
            ],
            max_tokens: 450,
            temperature: 0.5,
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const reply = json.choices?.[0]?.message?.content?.trim();
          if (reply) {
            metric('ai_tutor.reply', 1, { outcome: 'success', mode: 'llm' });
            metric('ai_tutor.duration_ms', Date.now() - start, { outcome: 'success' });
            return NextResponse.json({ reply });
          }
        }
      } catch {
        // Fallback transparently to grounded knowledge engine
      }
    }

    const reply = buildLocalGroundedReply(question, state);
    metric('ai_tutor.reply', 1, { outcome: 'success', mode: 'grounded' });
    metric('ai_tutor.duration_ms', Date.now() - start, { outcome: 'success' });
    return NextResponse.json({ reply });
  } catch (error) {
    metric('ai_tutor.reply', 1, { outcome: 'error' });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'AI javobida xatolik.',
      },
      { status: 500 }
    );
  }
}
