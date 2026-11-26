'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Clock,
  ArrowLeft,
  Save,
  X,
  Play,
  Users,
  BookOpen,
  Languages,
} from 'lucide-react';
import {
  logoutUser,
  refreshCurrentUser,
  subscribeAuthChanges,
  updateUserProfile,
} from '@/lib/auth';
import { INITIAL_LESSONS, INITIAL_TEACHERS } from '@/lib/data';
import { Lesson, PracticeItem, PublicUser, Teacher } from '@/lib/types';
import VideoModal from '@/components/VideoModal';
import CommunityChat from '@/components/CommunityChat';
import AvatarUploader from '@/components/AvatarUploader';
import VideoLessonUploader from '@/components/VideoLessonUploader';
import LessonVideoThumbnail from '@/components/LessonVideoThumbnail';
import PracticeManager, {
  PracticeStudentOption,
} from '@/components/teacher/PracticeManager';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [students, setStudents] = useState<PracticeStudentOption[]>([]);
  const [activeTab, setActiveTab] = useState<
    'lessons' | 'practice' | 'community'
  >('lessons');

  // Video Modal & Editing state
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(
    null
  );
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTeacherData = useCallback(async () => {
    const current = await refreshCurrentUser();

    if (!current || (current.role !== 'teacher' && current.role !== 'admin')) {
      router.push('/login?next=/teacher');
      return;
    }

    setUser(current);
    setIsCheckingAuth(false);

    try {
      const [platRes, pracRes] = await Promise.all([
        fetch('/api/platform', { cache: 'no-store' }),
        fetch('/api/practice?include_students=1', { cache: 'no-store' }),
      ]);

      if (platRes.ok) {
        const data = (await platRes.json()) as {
          teachers?: Teacher[];
          lessons?: Lesson[];
        };
        if (data.teachers?.length) setTeachers(data.teachers);
        if (data.lessons?.length) setLessons(data.lessons);
      }

      if (pracRes.ok) {
        const pData = (await pracRes.json()) as {
          practice_items?: PracticeItem[];
          students?: PracticeStudentOption[];
        };
        if (pData.practice_items) setPracticeItems(pData.practice_items);
        if (pData.students) setStudents(pData.students);
      }
    } catch {
      // Fallback kept
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTeacherData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTeacherData]);

  useEffect(() => {
    return subscribeAuthChanges(() => {
      void loadTeacherData();
    });
  }, [loadTeacherData]);

  const teacherSubjectSlug = user?.subject_slug || 'it-dasturlash';
  const currentTeacherInfo = teachers.find(
    (t) => t.slug === teacherSubjectSlug
  );
  const myLessons =
    user?.role === 'admin'
      ? lessons
      : lessons.filter((l) => l.subject_slug === teacherSubjectSlug);

  const handleOpenAdd = () => {
    setFormError('');
    setEditingLesson({
      title: '',
      description: '',
      subject_slug: teacherSubjectSlug,
      video_url: '',
      video_storage_path: '',
      duration: '12:00',
      order_num: myLessons.length + 1,
    });
    setShowEditModal(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setFormError('');
    setEditingLesson({ ...lesson });
    setShowEditModal(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || isUploadingVideo) return;

    setFormError('');
    setSaving(true);

    try {
      const isEdit = Boolean(editingLesson.id);
      const res = await fetch('/api/lessons', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLesson),
      });
      const data = (await res.json()) as { lesson?: Lesson; error?: string };

      if (!res.ok || !data.lesson) {
        setFormError(data.error || 'Darsni saqlashda xatolik yuz berdi.');
        setSaving(false);
        return;
      }

      if (isEdit) {
        setLessons((prev) =>
          prev.map((l) => (l.id === data.lesson!.id ? data.lesson! : l))
        );
      } else {
        setLessons((prev) => [...prev, data.lesson!]);
      }

      setShowEditModal(false);
      setEditingLesson(null);
    } catch {
      setFormError('Server bilan aloqada xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Haqiqatan ham ushbu video darsni o‘chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/lessons?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLessons((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleAvatarUploaded = async (url: string) => {
    const res = await updateUserProfile({ avatar_url: url });
    if (res.error || !res.user) {
      throw new Error(res.error || 'Profil rasmini saqlab bo‘lmadi.');
    }
    setUser(res.user);
    setTeachers((prev) =>
      prev.map((t) =>
        t.slug === teacherSubjectSlug ? { ...t, avatar_url: url } : t
      )
    );
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  if (isCheckingAuth || !user) {
    return (
      <div className="min-h-screen bg-[#0d071d] flex items-center justify-center text-pink-400 font-bold">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d071d] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#140b2a]/95 border-b border-purple-900/40 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300"
              title="Bosh sahifa"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Ustoz Kabineti
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {currentTeacherInfo?.subject || teacherSubjectSlug}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ustoz: <strong className="text-white">{user.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Video Dars</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card with Avatar Upload */}
        <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <AvatarUploader
              currentUrl={user.avatar_url || currentTeacherInfo?.avatar_url}
              name={user.name}
              folder="teachers"
              size="lg"
              label="Ustoz rasmini yuklash"
              onUploaded={handleAvatarUploaded}
            />
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mentorlik Profili</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {user.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {currentTeacherInfo?.experience || 'Tajribali mentor'} • Darslar:{' '}
                {myLessons.length} ta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto scrollbar-none self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'lessons'
                  ? 'bg-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Video Darslar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'practice'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Lug‘at & Mashqlar ({practiceItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'community'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>O‘quvchilar Chati</span>
            </button>
          </div>
        </div>

        {/* Lessons List */}
        {activeTab === 'lessons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLessons.map((lesson) => {
              return (
                <div
                  key={lesson.id}
                  className="bg-[#160c2e] border border-purple-800/40 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl"
                >
                  <div
                    onClick={() => setPreviewLesson(lesson)}
                    className="relative h-44 bg-gradient-to-br from-[#231247] to-[#120826] cursor-pointer group flex items-center justify-center overflow-hidden"
                  >
                    <LessonVideoThumbnail
                      videoUrl={lesson.video_url}
                      title={lesson.title}
                      emptyLabel="Video joylanmagan (tahrirlang)"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-[11px] font-bold text-pink-300 border border-pink-500/30">
                      {lesson.order_num}-dars • {lesson.subject_slug}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/80 text-[11px] font-bold text-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-pink-400" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-2">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                        {lesson.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lesson)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-500/20 text-xs font-bold text-purple-300 border border-white/10 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Tahrirlash / Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-rose-500/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>O‘chirish</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Per-student Vocabulary & Exercise Manager */}
        {activeTab === 'practice' && (
          <PracticeManager
            items={practiceItems}
            students={students}
            teachers={teachers}
            defaultSubjectSlug={teacherSubjectSlug}
            isAdmin={user.role === 'admin'}
            onItemsChange={setPracticeItems}
          />
        )}

        {activeTab === 'community' && (
          <CommunityChat
            currentUser={user}
            className="!py-4 !bg-transparent !border-none"
          />
        )}
      </main>

      {/* Video Player Preview */}
      <VideoModal
        lesson={previewLesson}
        teachers={teachers}
        onClose={() => setPreviewLesson(null)}
      />

      {/* Add/Edit Lesson Modal */}
      {showEditModal && editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#160c2e] border border-purple-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              aria-label="Yopish"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-white mb-5">
              {editingLesson.id
                ? 'Video Darsni Tahrirlash'
                : 'Yangi Video Dars Qo‘shish'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveLesson} className="space-y-4">
              {user.role === 'admin' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Fan Yo‘nalishi
                  </label>
                  <select
                    value={editingLesson.subject_slug || 'it-dasturlash'}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        subject_slug: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1f133b] border border-purple-700/40 text-sm text-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.subject} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Dars Sarlavhasi
                </label>
                <input
                  type="text"
                  required
                  value={editingLesson.title || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, title: e.target.value })
                  }
                  placeholder="Masalan: 2-dars: CSS Flexbox va Grid"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Qisqacha Tavsif
                </label>
                <textarea
                  rows={3}
                  value={editingLesson.description || ''}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      description: e.target.value,
                    })
                  }
                  placeholder="Ushbu darsda nimalarni o‘rganamiz..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingLesson.order_num || 1}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        order_num: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Davomiyligi (mm:ss)
                  </label>
                  <input
                    type="text"
                    value={editingLesson.duration || ''}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        duration: e.target.value,
                      })
                    }
                    placeholder="14:20"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Video Manbasi (YouTube havola yoki Tel / PC xotirasi)
                </label>
                <VideoLessonUploader
                  key={editingLesson.id || 'new-lesson'}
                  subjectSlug={editingLesson.subject_slug || teacherSubjectSlug}
                  currentVideoUrl={editingLesson.video_url}
                  onUploadingChange={setIsUploadingVideo}
                  onUploaded={({ videoUrl, storagePath, duration }) =>
                    setEditingLesson((prev) => ({
                      ...prev,
                      video_url: videoUrl,
                      video_storage_path: storagePath,
                      duration: duration || prev?.duration || '10:00',
                    }))
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving || isUploadingVideo}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isUploadingVideo
                      ? 'Video yuklanmoqda...'
                      : saving
                        ? 'Saqlanmoqda...'
                        : 'Darsni Saqlash'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
