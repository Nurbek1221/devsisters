'use client';

import React, { useState } from 'react';
import { Lesson, Teacher } from '@/lib/types';
import { Plus, Edit, Trash2, Play, Save, X, Clock } from 'lucide-react';
import VideoLessonUploader from '@/components/VideoLessonUploader';
import LessonVideoThumbnail from '@/components/LessonVideoThumbnail';

interface LessonsManagerProps {
  lessons: Lesson[];
  teachers: Teacher[];
  onLessonsChange: (next: Lesson[]) => void;
  onPreviewLesson: (lesson: Lesson) => void;
}

export default function LessonsManager({
  lessons,
  teachers,
  onLessonsChange,
  onPreviewLesson,
}: LessonsManagerProps) {
  const [filterSubject, setFilterSubject] = useState('all');
  const [editing, setEditing] = useState<Partial<Lesson> | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered =
    filterSubject === 'all'
      ? lessons
      : lessons.filter((l) => l.subject_slug === filterSubject);

  const handleOpenAdd = () => {
    setError('');
    setEditing({
      title: '',
      description: '',
      subject_slug:
        filterSubject === 'all'
          ? teachers[0]?.slug || 'it-dasturlash'
          : filterSubject,
      video_url: '',
      video_storage_path: '',
      duration: '12:00',
      order_num: lessons.length + 1,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || uploadingVideo) return;
    setError('');
    setSaving(true);

    try {
      const isEdit = Boolean(editing.id);
      const res = await fetch('/api/lessons', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = (await res.json()) as { lesson?: Lesson; error?: string };
      if (!res.ok || !data.lesson) {
        setError(data.error || 'Darsni saqlashda xatolik.');
        setSaving(false);
        return;
      }

      if (isEdit) {
        onLessonsChange(
          lessons.map((l) => (l.id === data.lesson!.id ? data.lesson! : l))
        );
      } else {
        onLessonsChange([...lessons, data.lesson]);
      }
      setEditing(null);
    } catch {
      setError('Server bilan aloqa xatosi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Darsni o‘chirishni tasdiqlaysizmi?')) return;
    const res = await fetch(`/api/lessons?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      onLessonsChange(lessons.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white">
            Video Darslar Boshqaruvi ({filtered.length} ta)
          </h3>
          <p className="text-xs text-slate-400">
            YouTube havolasini joylashtiring yoki telefon/kompyuterdan video
            yuklang.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs sm:text-sm font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Video Dars</span>
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterSubject('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
            filterSubject === 'all'
              ? 'bg-pink-600 text-white'
              : 'bg-white/5 text-slate-300'
          }`}
        >
          Barchasi ({lessons.length})
        </button>
        {teachers.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setFilterSubject(t.slug)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              filterSubject === t.slug
                ? 'bg-pink-600 text-white'
                : 'bg-white/5 text-slate-300'
            }`}
          >
            {t.subject}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((lesson) => {
          return (
            <div
              key={lesson.id}
              className="bg-[#160c2e] border border-purple-800/40 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl"
            >
              <div
                onClick={() => onPreviewLesson(lesson)}
                className="relative h-40 bg-gradient-to-br from-[#231247] to-[#120826] cursor-pointer group flex items-center justify-center overflow-hidden"
              >
                <LessonVideoThumbnail
                  videoUrl={lesson.video_url}
                  title={lesson.title}
                  emptyLabel="Video joylanmagan"
                />

                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-pink-600/90 text-white flex items-center justify-center">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 text-[11px] font-bold text-pink-300">
                  {lesson.subject_slug} • {lesson.order_num}-dars
                </div>
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/75 text-[11px] font-bold text-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-pink-400" />
                  <span>{lesson.duration}</span>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-2">
                    {lesson.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {lesson.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setEditing({ ...lesson });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-500/20 text-xs font-bold text-purple-300 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(lesson.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 cursor-pointer"
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#160c2e] border border-purple-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Yopish"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-lg font-extrabold text-white mb-4">
              {editing.id ? 'Darsni Tahrirlash' : 'Yangi Dars Qo‘shish'}
            </h4>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Fan Yo‘nalishi
                  </label>
                  <select
                    value={editing.subject_slug || 'it-dasturlash'}
                    onChange={(e) =>
                      setEditing({ ...editing, subject_slug: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1f133b] border border-purple-700/40 text-sm text-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Davomiyligi (mm:ss)
                  </label>
                  <input
                    type="text"
                    value={editing.duration || ''}
                    onChange={(e) =>
                      setEditing({ ...editing, duration: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Dars Nomi
                </label>
                <input
                  type="text"
                  required
                  value={editing.title || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  placeholder="Masalan: 2-dars..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tavsif
                </label>
                <textarea
                  rows={2}
                  value={editing.description || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white resize-none"
                />
              </div>

              <VideoLessonUploader
                subjectSlug={editing.subject_slug || 'it-dasturlash'}
                currentVideoUrl={editing.video_url}
                onUploadingChange={setUploadingVideo}
                onUploaded={({ videoUrl, storagePath, duration }) =>
                  setEditing((prev) => ({
                    ...prev,
                    video_url: videoUrl,
                    video_storage_path: storagePath,
                    duration: duration || prev?.duration || '10:00',
                  }))
                }
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingVideo}
                  className="px-5 py-2 rounded-xl bg-emerald-600 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {uploadingVideo
                      ? 'Yuklanmoqda...'
                      : saving
                        ? 'Saqlanmoqda...'
                        : 'Saqlash'}
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
