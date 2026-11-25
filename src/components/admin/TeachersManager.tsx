'use client';

import React, { useState } from 'react';
import { Teacher } from '@/lib/types';
import { Plus, Edit, Trash2, Save, X, Mail, Lock } from 'lucide-react';
import AvatarUploader from '@/components/AvatarUploader';

interface TeachersManagerProps {
  teachers: Teacher[];
  onTeachersChange: (next: Teacher[]) => void;
}

type EditableTeacher = Partial<Teacher> & {
  login_email?: string;
  login_password?: string;
};

export default function TeachersManager({
  teachers,
  onTeachersChange,
}: TeachersManagerProps) {
  const [editing, setEditing] = useState<EditableTeacher | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setError('');
    setEditing({
      name: '',
      subject: '',
      slug: '',
      bio: '',
      experience: '',
      avatar_url: '',
      telegram: '',
      login_email: '',
      login_password: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setSaving(true);

    try {
      const isEdit = Boolean(editing.id);
      const res = await fetch('/api/teachers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = (await res.json()) as {
        teacher?: Teacher;
        error?: string;
      };
      if (!res.ok || !data.teacher) {
        setError(data.error || 'Saqlashda xatolik.');
        setSaving(false);
        return;
      }

      if (isEdit) {
        onTeachersChange(
          teachers.map((t) => (t.id === data.teacher!.id ? data.teacher! : t))
        );
      } else {
        onTeachersChange([...teachers, data.teacher]);
      }
      setEditing(null);
    } catch {
      setError('Server bilan aloqa uzildi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan ham ushbu ustozni o‘chirmoqchimisiz?')) return;
    const res = await fetch(`/api/teachers?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      onTeachersChange(teachers.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white">
            Mentorlar va Fanlar ({teachers.length} ta)
          </h3>
          <p className="text-xs text-slate-400">
            Ustoz qo‘shing, login/parolini belgilang va barcha sahifalarda bir
            vaqtda yangilang.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs sm:text-sm font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Mentor Qo‘shish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={teacher.avatar_url}
                alt={teacher.name}
                className="w-14 h-14 rounded-2xl object-cover border border-pink-500/40 shrink-0"
              />
              <div className="min-w-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {teacher.subject}
                </span>
                <h4 className="text-base font-bold text-white mt-1 truncate">
                  {teacher.name}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {teacher.experience}
                </p>
              </div>
            </div>

            {teacher.login_email && (
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-purple-800/30 flex items-center gap-2 text-xs text-purple-200 truncate">
                <Mail className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="truncate">{teacher.login_email}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 line-clamp-2">{teacher.bio}</p>

            <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setEditing({
                    ...teacher,
                    login_email: teacher.login_email || '',
                    login_password: '',
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-500/20 text-xs font-bold text-purple-300 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Tahrirlash / Login</span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete(teacher.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>O‘chirish</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-[#160c2e] border border-purple-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Yopish"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-lg font-extrabold text-white mb-4">
              {editing.id ? 'Mentorni Tahrirlash' : 'Yangi Mentor Qo‘shish'}
            </h4>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-800/40">
                <AvatarUploader
                  currentUrl={editing.avatar_url}
                  name={editing.name || 'Mentor'}
                  folder="teachers"
                  size="sm"
                  label="Ustoz rasmini yuklash (Tel / PC)"
                  onUploaded={(url) =>
                    setEditing((prev) => ({ ...prev, avatar_url: url }))
                  }
                />
              </div>

              <input
                type="text"
                required
                value={editing.name || ''}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                placeholder="Ism Familiya"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={editing.subject || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, subject: e.target.value })
                  }
                  placeholder="Fan nomi (masalan: Fizika)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
                <input
                  type="text"
                  value={editing.slug || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, slug: e.target.value })
                  }
                  placeholder="Slug (ixtiyoriy: fizika)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
              </div>

              {/* Teacher Account Credentials Section */}
              <div className="p-3.5 rounded-2xl bg-purple-900/20 border border-purple-700/40 space-y-2.5">
                <div className="text-xs font-bold text-pink-300">
                  Ustoz Kabinetiga Kirish Login va Paroli
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={editing.login_email || ''}
                    onChange={(e) =>
                      setEditing({ ...editing, login_email: e.target.value })
                    }
                    placeholder="ustoz@devsisters.uz (bo‘sh qolsa avtomatik yaratiladi)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-xs sm:text-sm text-white"
                  />
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={editing.login_password || ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        login_password: e.target.value,
                      })
                    }
                    placeholder={
                      editing.id
                        ? 'Yangi parol (o‘zgartirmaslik uchun bo‘sh qoldiring)'
                        : 'Parol (min 6 belgi, bo‘sh qolsa avtomatik)'
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-xs sm:text-sm text-white"
                  />
                </div>
              </div>

              <input
                type="text"
                value={editing.experience || ''}
                onChange={(e) =>
                  setEditing({ ...editing, experience: e.target.value })
                }
                placeholder="Tajriba (masalan: IELTS 8.0 | 5 yil)"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
              />

              <textarea
                rows={3}
                value={editing.bio || ''}
                onChange={(e) =>
                  setEditing({ ...editing, bio: e.target.value })
                }
                placeholder="Qisqacha bio..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white resize-none"
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
