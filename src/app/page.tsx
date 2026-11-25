'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import TeachersSection from '@/components/TeachersSection';
import FeaturesSection from '@/components/FeaturesSection';
import LessonsSection from '@/components/LessonsSection';
import WebinarsSection from '@/components/WebinarsSection';
import QuizSection from '@/components/QuizSection';
import PracticeSection from '@/components/PracticeSection';
import RoadmapSection from '@/components/RoadmapSection';
import Footer from '@/components/Footer';
import VideoModal from '@/components/VideoModal';
import CertificateModal from '@/components/CertificateModal';
import AiTutorModal from '@/components/AiTutorModal';
import OnboardingModal from '@/components/OnboardingModal';
import StudentLeaderboard from '@/components/student/StudentLeaderboard';

import {
  Teacher,
  Lesson,
  Quiz,
  PracticeItem,
  LeaderboardEntry,
} from '@/lib/types';
import {
  INITIAL_TEACHERS,
  INITIAL_LESSONS,
  INITIAL_QUIZZES,
  INITIAL_PRACTICE,
} from '@/lib/data';
import { getStoredUser } from '@/lib/auth';

export default function Home() {
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [practiceItems, setPracticeItems] =
    useState<PracticeItem[]>(INITIAL_PRACTICE);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeVideoLesson, setActiveVideoLesson] = useState<Lesson | null>(
    null
  );
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [certData, setCertData] = useState<{
    isOpen: boolean;
    courseName: string;
    scorePercent: number;
    studentName: string;
    subjectSlug?: string;
  }>({
    isOpen: false,
    courseName: 'Umumiy Ta‘lim Kursi',
    scorePercent: 100,
    studentName: 'O‘quvchi Qiz',
  });

  useEffect(() => {
    let active = true;
    async function loadPlatform() {
      try {
        const res = await fetch('/api/platform', { cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          teachers?: Teacher[];
          lessons?: Lesson[];
          quizzes?: Quiz[];
          practice_items?: PracticeItem[];
          leaderboard?: LeaderboardEntry[];
        };
        if (!active) return;
        if (data.teachers?.length) setTeachers(data.teachers);
        if (data.lessons?.length) setLessons(data.lessons);
        if (data.quizzes?.length) setQuizzes(data.quizzes);
        if (data.practice_items?.length) setPracticeItems(data.practice_items);
        if (data.leaderboard?.length) setLeaderboard(data.leaderboard);
      } catch {
        // Keep initial data fallback cleanly
      }
    }
    loadPlatform();
    return () => {
      active = false;
    };
  }, []);

  const handleOpenCertificate = (courseName: string, scorePercent: number) => {
    const user = getStoredUser();
    const matchedTeacher = teachers.find(
      (t) =>
        courseName.toLowerCase().includes(t.subject.toLowerCase()) ||
        courseName.toLowerCase().includes(t.slug.toLowerCase())
    );

    setCertData({
      isOpen: true,
      courseName: courseName || 'devsisters.uz Ta‘lim Dasturi',
      scorePercent: scorePercent || 100,
      studentName: user?.name || 'Madina Rahimova',
      subjectSlug: matchedTeacher?.slug,
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <Hero onStartLearning={() => setShowOnboarding(true)} />

        <TeachersSection
          teachers={teachers}
          selectedSubject={selectedSubject}
          onSelectSubject={(slug) => setSelectedSubject(slug)}
        />

        <FeaturesSection />

        <LessonsSection
          lessons={lessons}
          teachers={teachers}
          selectedSubject={selectedSubject}
          onSelectSubject={(slug) => setSelectedSubject(slug)}
          onOpenVideo={(lesson) => setActiveVideoLesson(lesson)}
        />

        <WebinarsSection />

        <QuizSection
          quizzes={quizzes}
          onViewCertificate={(course, score) =>
            handleOpenCertificate(course, score)
          }
        />

        <PracticeSection items={practiceItems} />

        {leaderboard.length > 0 && (
          <section className="py-16 bg-[#0d071d] border-t border-purple-900/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <StudentLeaderboard entries={leaderboard} teachers={teachers} />
            </div>
          </section>
        )}

        <RoadmapSection />
      </main>

      <Footer />

      <VideoModal
        lesson={activeVideoLesson}
        teachers={teachers}
        onClose={() => setActiveVideoLesson(null)}
      />

      <CertificateModal
        isOpen={certData.isOpen}
        onClose={() => setCertData((prev) => ({ ...prev, isOpen: false }))}
        studentName={certData.studentName}
        courseName={certData.courseName}
        scorePercent={certData.scorePercent}
        subjectSlug={certData.subjectSlug}
      />

      <AiTutorModal />

      <OnboardingModal
        isOpen={showOnboarding}
        teachers={teachers}
        onClose={() => {
          setShowOnboarding(false);
          sessionStorage.setItem('devsisters_onboarding_seen', 'true');
        }}
      />
    </div>
  );
}
