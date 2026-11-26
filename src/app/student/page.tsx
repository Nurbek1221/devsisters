'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  LogOut,
  Play,
  BookOpen,
  Trophy,
  Dumbbell,
  Award,
  CheckCircle2,
  Clock,
  Lock,
  ArrowLeft,
  Settings,
  Users,
  Video,
  Star,
} from 'lucide-react';
import {
  logoutUser,
  refreshCurrentUser,
  setStoredUser,
  subscribeAuthChanges,
  updateUserProfile,
} from '@/lib/auth';
import {
  INITIAL_TEACHERS,
  INITIAL_LESSONS,
  INITIAL_QUIZZES,
  INITIAL_PRACTICE,
} from '@/lib/data';
import {
  Teacher,
  Lesson,
  Quiz,
  PracticeItem,
  PublicUser,
  UserProgress,
  LeaderboardEntry,
} from '@/lib/types';
import VideoModal from '@/components/VideoModal';
import CertificateModal from '@/components/CertificateModal';
import AiTutorModal from '@/components/AiTutorModal';
import CommunityChat from '@/components/CommunityChat';
import AvatarUploader from '@/components/AvatarUploader';
import LessonVideoThumbnail from '@/components/LessonVideoThumbnail';
import StudentQuizRunner from '@/components/student/StudentQuizRunner';
import StudentPracticeGrid from '@/components/student/StudentPracticeGrid';
import StudentLeaderboard from '@/components/student/StudentLeaderboard';
import LockedCertificateModal from '@/components/student/LockedCertificateModal';

type TabId = 'lessons' | 'quiz' | 'practice' | 'leaderboard' | 'community';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [practiceItems, setPracticeItems] =
    useState<PracticeItem[]>(INITIAL_PRACTICE);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('lessons');
  const [lessonsViewScope, setLessonsViewScope] = useState<'subject' | 'all'>(
    'subject'
  );
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [quizPassed, setQuizPassed] = useState(false);
  const [bestQuizScore, setBestQuizScore] = useState<number | undefined>(
    undefined
  );

  const [activeVideoLesson, setActiveVideoLesson] = useState<Lesson | null>(
    null
  );
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [certScore, setCertScore] = useState(100);

  const studentSubject = user?.subject_slug || 'it-dasturlash';
  const currentTeacher = teachers.find((t) => t.slug === studentSubject);
  const subjectLessons = lessons.filter(
    (l) => l.subject_slug === studentSubject
  );
  const displayedLessons =
    lessonsViewScope === 'all' ? lessons : subjectLessons;
  const subjectQuiz = quizzes.find((q) => q.subject_slug === studentSubject);
  const subjectPractice = practiceItems.filter(
    (p) =>
      p.target_user_id === user?.id ||
      (!p.target_user_id && p.subject_slug === studentSubject)
  );

  const loadDashboard = useCallback(async () => {
    const resolvedUser = await refreshCurrentUser();

    if (!resolvedUser) {
      router.push('/login?next=/student');
      return;
    }

    setUser(resolvedUser);
    setIsCheckingAuth(false);

    try {
      const [platRes, progRes, pracRes] = await Promise.all([
        fetch('/api/platform', { cache: 'no-store' }),
        fetch('/api/progress', { cache: 'no-store' }),
        fetch('/api/practice', { cache: 'no-store' }),
      ]);

      if (platRes.ok) {
        const plat = (await platRes.json()) as {
          teachers?: Teacher[];
          lessons?: Lesson[];
          quizzes?: Quiz[];
          practice_items?: PracticeItem[];
          leaderboard?: LeaderboardEntry[];
        };
        if (plat.teachers?.length) setTeachers(plat.teachers);
        if (plat.lessons?.length) setLessons(plat.lessons);
        if (plat.quizzes?.length) setQuizzes(plat.quizzes);
        if (plat.practice_items?.length) setPracticeItems(plat.practice_items);
        if (plat.leaderboard?.length) setLeaderboard(plat.leaderboard);
      }

      if (pracRes.ok) {
        const prac = (await pracRes.json()) as {
          practice_items?: PracticeItem[];
        };
        if (prac.practice_items) {
          setPracticeItems(prac.practice_items);
        }
      }

      if (progRes.ok) {
        const progData = (await progRes.json()) as {
          progress?: UserProgress[];
          points?: number;
        };
        const rows = progData.progress || [];
        const completedIds = rows
          .filter((r) => r.lesson_id && r.completed)
          .map((r) => r.lesson_id as string);
        setCompletedLessons(completedIds);

        const subjectSlug = resolvedUser.subject_slug || 'it-dasturlash';
        const quizProg = rows.find(
          (r) =>
            r.quiz_id === `q-${subjectSlug}` ||
            (r.quiz_id && r.completed)
        );
        if (quizProg) {
          setQuizPassed(Boolean(quizProg.completed));
          setBestQuizScore(quizProg.quiz_score);
        }

        if (typeof progData.points === 'number') {
          setUser((prev) =>
            prev ? { ...prev, points: progData.points } : prev
          );
        }
      }
    } catch {
      // Retain default data when offline
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    return subscribeAuthChanges(() => {
      void loadDashboard();
    });
  }, [loadDashboard]);

  const handleToggleLessonComplete = async (lessonId: string) => {
    const currentlyDone = completedLessons.includes(lessonId);
    const nextCompleted = !currentlyDone;

    setCompletedLessons((prev) =>
      nextCompleted
        ? prev.includes(lessonId)
          ? prev
          : [...prev, lessonId]
        : prev.filter((id) => id !== lessonId)
    );

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, completed: nextCompleted }),
      });
      if (res.ok) {
        const data = (await res.json()) as { points?: number };
        if (typeof data.points === 'number') {
          setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, points: data.points };
            setStoredUser(next);
            return next;
          });
        }
      }
    } catch {
      // Optimistic update kept
    }
  };

  const handlePassQuiz = async (scorePercent: number, quizId: string) => {
    setBestQuizScore((prev) =>
      typeof prev === 'number' ? Math.max(prev, scorePercent) : scorePercent
    );
    if (scorePercent >= 70) {
      setQuizPassed(true);
    }

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, quiz_score: scorePercent }),
      });
      if (res.ok) {
        const data = (await res.json()) as { points?: number };
        if (typeof data.points === 'number') {
          setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, points: data.points };
            setStoredUser(next);
            return next;
          });
        }
      }
    } catch {
      // Optimistic score retained
    }
  };

  const handleSelectNewSubject = async (slug: string) => {
    const res = await updateUserProfile({ subject_slug: slug });
    if (res.user) {
      setUser(res.user);
    }
    setShowSubjectModal(false);
  };

  const handleAvatarUploaded = async (url: string) => {
    const res = await updateUserProfile({ avatar_url: url });
    if (res.error || !res.user) {
      throw new Error(res.error || 'Profil rasmini bazaga saqlab bo‘lmadi.');
    }
    setUser(res.user);
    setLeaderboard((prev) =>
      prev.map((entry) =>
        entry.id === res.user!.id ? { ...entry, avatar_url: url } : entry
      )
    );
  };

  const handleTryCertificate = () => {
    const watchedSubjectCount = subjectLessons.filter((l) =>
      completedLessons.includes(l.id)
    ).length;
    const allWatched =
      subjectLessons.length === 0 ||
      watchedSubjectCount >= subjectLessons.length;

    if (allWatched && quizPassed) {
      setCertScore(bestQuizScore || 100);
      setShowCertModal(true);
    } else {
      setShowLockedModal(true);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  if (isCheckingAuth || !user) {
    return (
      <div className="min-h-screen bg-[#0d071d] flex items-center justify-center">
        <div className="text-pink-400 font-bold text-lg animate-pulse flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span>Yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  const watchedInSubject = subjectLessons.filter((l) =>
    completedLessons.includes(l.id)
  ).length;
  const totalInSubject = subjectLessons.length || 1;
  const progressPercent = Math.min(
    100,
    Math.round((watchedInSubject / totalInSubject) * 100)
  );
  const certificateUnlocked =
    (subjectLessons.length === 0 ||
      watchedInSubject >= subjectLessons.length) &&
    quizPassed;

  return (
    <div className="min-h-screen bg-[#0d071d] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#140b2a]/95 border-b border-purple-900/40 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
              title="Bosh sahifa"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            {user.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-10 h-10 rounded-xl object-cover border border-pink-500/40 shrink-0"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  O‘quvchi Kabineti
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {currentTeacher?.subject || studentSubject}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Salom, <strong className="text-white">{user.name}</strong>!
                Bugun yangi bilimlar sari qadam tashlang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{user.points || 0} ball</span>
            </div>

            {(user.role === 'teacher' || user.role === 'admin') && (
              <Link
                href={user.role === 'admin' ? '/admin' : '/teacher'}
                className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-xs font-bold"
              >
                {user.role === 'admin' ? 'Admin Panel' : 'Ustoz Paneli'}
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Profile & Progress Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-[#231247] via-[#170c30] to-[#200e38] border border-purple-700/40 p-6 sm:p-8 shadow-2xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Student Avatar + Subject Mentor */}
          <div className="lg:col-span-2 flex flex-col sm:flex-row sm:items-center gap-5">
            <AvatarUploader
              currentUrl={user.avatar_url}
              name={user.name}
              folder="students"
              size="lg"
              label="Rasmni o‘zgartirish"
              onUploaded={handleAvatarUploaded}
            />

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Faol yo‘nalish
                </span>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(true)}
                  className="flex items-center gap-1 text-xs font-bold text-pink-400 hover:text-pink-300 underline cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Fanni o‘zgartirish</span>
                </button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white truncate">
                {currentTeacher?.subject || studentSubject}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Ustoz: <strong>{currentTeacher?.name || 'Mentor'}</strong> •{' '}
                {currentTeacher?.experience}
              </p>
            </div>
          </div>

          {/* Progress & Certificate Box */}
          <div className="bg-black/45 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-300">Kurs Progressi</span>
              <span className="text-pink-400">
                {watchedInSubject} / {subjectLessons.length} dars (
                {progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleTryCertificate}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                certificateUnlocked
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/30 hover:scale-[1.01]'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              {certificateUnlocked ? (
                <>
                  <Award className="w-4 h-4" />
                  <span>QR Sertifikatni Yuklab Olish ✓</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sertifikat (Video + Test ≥70%)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            {
              id: 'lessons' as TabId,
              label: `Video Darslar (${subjectLessons.length})`,
              icon: BookOpen,
            },
            {
              id: 'quiz' as TabId,
              label: 'Test Sinovlari',
              icon: Trophy,
            },
            {
              id: 'practice' as TabId,
              label: 'Lug‘at & Mashqlar',
              icon: Dumbbell,
            },
            {
              id: 'leaderboard' as TabId,
              label: 'Reyting',
              icon: Star,
            },
            {
              id: 'community' as TabId,
              label: 'Hamjamiyat',
              icon: Users,
            },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Lessons */}
        {activeTab === 'lessons' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLessonsViewScope('subject')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    lessonsViewScope === 'subject'
                      ? 'bg-pink-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Mening fanim ({subjectLessons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLessonsViewScope('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    lessonsViewScope === 'all'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Barcha fanlar videolari ({lessons.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedLessons.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-[#160c2e] border border-purple-800/40 rounded-3xl">
                  <Video className="w-10 h-10 text-pink-400/50 mx-auto mb-3" />
                  <p className="text-slate-300 font-bold">
                    Hozircha video darslar qo‘shilmagan.
                  </p>
                </div>
              ) : (
                displayedLessons.map((lesson) => {
                  const isDone = completedLessons.includes(lesson.id);
                  const lessonTeacher = teachers.find(
                    (t) => t.slug === lesson.subject_slug
                  );

                  return (
                    <div
                      key={lesson.id}
                      className={`rounded-3xl bg-[#160c2e] border overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl ${
                        isDone
                          ? 'border-emerald-500/40'
                          : 'border-purple-800/40 hover:border-pink-500/50'
                      }`}
                    >
                      <div
                        onClick={() => setActiveVideoLesson(lesson)}
                        className="relative h-44 w-full bg-gradient-to-br from-[#231247] to-[#120826] cursor-pointer group overflow-hidden flex items-center justify-center"
                      >
                        <LessonVideoThumbnail
                          videoUrl={lesson.video_url}
                          title={lesson.title}
                        />
                        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors" />

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>

                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#140b2a]/90 text-pink-300 border border-pink-500/30">
                            {lessonTeacher?.subject || lesson.subject_slug} •{' '}
                            {lesson.order_num}-dars
                          </span>
                        </div>

                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/80 text-[11px] font-bold text-slate-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-pink-400" />
                          <span>{lesson.duration}</span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="text-base font-bold text-white leading-snug mb-2">
                            {lesson.title}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {lesson.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                          <button
                            type="button"
                            onClick={() => setActiveVideoLesson(lesson)}
                            className="text-xs font-bold text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Darsni ko‘rish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleLessonComplete(lesson.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isDone ? 'Tugatildi ✓' : 'Tugatish'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Quiz */}
        {activeTab === 'quiz' && (
          <StudentQuizRunner
            subjectQuiz={subjectQuiz}
            subjectLabel={currentTeacher?.subject || studentSubject}
            quizPassed={quizPassed}
            savedScore={bestQuizScore}
            onPassQuiz={handlePassQuiz}
            onOpenCertificate={(score) => {
              setCertScore(score);
              handleTryCertificate();
            }}
          />
        )}

        {/* Tab 3: Practice */}
        {activeTab === 'practice' && (
          <StudentPracticeGrid
            items={subjectPractice}
            subjectLabel={currentTeacher?.subject || studentSubject}
            currentUserId={user.id}
          />
        )}

        {/* Tab 4: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <StudentLeaderboard
            entries={leaderboard}
            teachers={teachers}
            currentUserId={user.id}
          />
        )}

        {/* Tab 5: Community */}
        {activeTab === 'community' && (
          <CommunityChat
            currentUser={user}
            className="!py-4 !bg-transparent !border-none"
          />
        )}
      </main>

      {/* Modals */}
      <VideoModal
        lesson={activeVideoLesson}
        teachers={teachers}
        isCompleted={
          activeVideoLesson
            ? completedLessons.includes(activeVideoLesson.id)
            : false
        }
        onToggleComplete={handleToggleLessonComplete}
        onClose={() => setActiveVideoLesson(null)}
      />

      <CertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        studentName={user.name}
        courseName={currentTeacher?.subject || studentSubject}
        subjectSlug={studentSubject}
        scorePercent={certScore}
      />

      <LockedCertificateModal
        isOpen={showLockedModal}
        onClose={() => setShowLockedModal(false)}
        totalLessons={subjectLessons.length}
        completedCount={watchedInSubject}
        quizPassed={quizPassed}
        onGoToLessons={() => {
          setShowLockedModal(false);
          setActiveTab('lessons');
        }}
        onGoToQuiz={() => {
          setShowLockedModal(false);
          setActiveTab('quiz');
        }}
      />

      {/* Change Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-[#160c2e] border border-purple-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <h3 className="text-xl font-extrabold text-white">
              Asosiy Fan Yo‘nalishini Tanlang
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {teachers.map((t) => {
                const active = t.slug === studentSubject;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => handleSelectNewSubject(t.slug)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      active
                        ? 'bg-pink-600/25 border-pink-500 text-white'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.avatar_url}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover border border-pink-500/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {t.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold text-white cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      <AiTutorModal />
    </div>
  );
}
