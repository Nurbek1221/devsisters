'use client';

import React, { useState } from 'react';
import { PracticeItem, Teacher } from '@/lib/types';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  UserCheck,
  Users,
  Languages,
  Dumbbell,
} from 'lucide-react';

export interface PracticeStudentOption {
  id: string;
  name: string;
  email: string;
  subject_slug?: string;
  avatar_url?: string;
}

interface PracticeManagerProps {
  items: PracticeItem[];
  students: PracticeStudentOption[];
  teachers?: Teacher[];
  defaultSubjectSlug: string;
  isAdmin?: boolean;
  onItemsChange: (next: PracticeItem[]) => void;
}

export default function PracticeManager({
  items,
  students,
  teachers = [],
  defaultSubjectSlug,
  isAdmin = false,
  onItemsChange,
}: PracticeManagerProps) {
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [editing, setEditing] = useState<{
    id?: string;
    subject_slug: string;
    category: 'vocabulary' | 'exercise' | 'workout';
    title: string;
    target_user_id: string;
    word: string;
    translation: string;
    pronunciation: string;
    example: string;
    stepsText: string;
    reps: string;
    tip: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Put students enrolled in this teacher's subject first
  const sortedStudents = [...students].sort((a, b) => {
    const aMatch = a.subject_slug === defaultSubjectSlug ? 0 : 1;
    const bMatch = b.subject_slug === defaultSubjectSlug ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });

  const filteredItems = items.filter((item) => {
    if (filterStudentId === 'all') return true;
    if (filterStudentId === 'shared') return !item.target_user_id;
    return item.target_user_id === filterStudentId;
  });

  const handleOpenAdd = () => {
    setError('');
    const preselectedStudent =
      filterStudentId !== 'all' && filterStudentId !== 'shared'
        ? filterStudentId
        : sortedStudents[0]?.id || '';

    setEditing({
      subject_slug: defaultSubjectSlug,
      category: 'vocabulary',
      title: '',
      target_user_id: preselectedStudent,
      word: '',
      translation: '',
      pronunciation: '',
      example: '',
      stepsText: '',
      reps: '',
      tip: '',
    });
  };

  const handleOpenEdit = (item: PracticeItem) => {
    setError('');
    setEditing({
      id: item.id,
      subject_slug: item.subject_slug,
      category: item.category,
      title: item.title,
      target_user_id: item.target_user_id || '',
      word: item.data.word || '',
      translation: item.data.translation || '',
      pronunciation: item.data.pronunciation || '',
      example: item.data.example || '',
      stepsText: (item.data.steps || []).join('\n'),
      reps: item.data.reps || '',
      tip: item.data.tip || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setSaving(true);

    const steps = editing.stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Partial<PracticeItem> = {
      id: editing.id,
      subject_slug: editing.subject_slug,
      category: editing.category,
      title: editing.title.trim(),
      target_user_id: editing.target_user_id || '',
      data:
        editing.category === 'vocabulary'
          ? {
              word: editing.word.trim(),
              translation: editing.translation.trim(),
              pronunciation: editing.pronunciation.trim() || undefined,
              example: editing.example.trim() || undefined,
              tip: editing.tip.trim() || undefined,
            }
          : {
              steps,
              reps: editing.reps.trim() || undefined,
              tip: editing.tip.trim() || undefined,
            },
    };

    try {
      const isEdit = Boolean(editing.id);
      const res = await fetch('/api/practice', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        item?: PracticeItem;
        error?: string;
      };
      if (!res.ok || !data.item) {
        setError(data.error || 'Saqlashda xatolik yuz berdi.');
        setSaving(false);
        return;
      }

      if (isEdit) {
        onItemsChange(
          items.map((it) => (it.id === data.item!.id ? data.item! : it))
        );
      } else {
        onItemsChange([data.item, ...items]);
      }
      setEditing(null);
    } catch {
      setError('Server bilan aloqa uzildi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ushbu lug‘at yoki mashqni o‘chirmoqchimisiz?')) return;
    const res = await fetch(`/api/practice?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      onItemsChange(items.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white">
            Har Bir O‘quvchiga Alohida Lug‘at & Mashqlar ({filteredItems.length})
          </h3>
          <p className="text-xs text-slate-400">
            O‘quvchini tanlab unga shaxsiy yangi so‘zlar (lug‘at) yoki amaliy
            mashq topshirig‘ini biriktiring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#1f133b] border border-purple-700/40 text-xs text-white"
          >
            <option value="all">Barchasi ({items.length})</option>
            <option value="shared">Umumiy fan topshiriqlari</option>
            {sortedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                O‘quvchi: {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-lg shadow-pink-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Lug‘at / Mashq Biriktirish</span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const isVocab = item.category === 'vocabulary';
          return (
            <div
              key={item.id}
              className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border ${
                      isVocab
                        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {isVocab ? (
                      <Languages className="w-3 h-3" />
                    ) : (
                      <Dumbbell className="w-3 h-3" />
                    )}
                    <span>{isVocab ? 'Til Lug‘ati' : 'Amaliy Mashq'}</span>
                  </span>

                  {item.target_user_id ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>
                        {item.target_student_name || 'Shaxsiy o‘quvchi'}
                      </span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10 inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Umumiy ({item.subject_slug})</span>
                    </span>
                  )}
                </div>

                <h4 className="text-base font-extrabold text-white">
                  {item.title}
                </h4>

                {isVocab ? (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-800/30 space-y-1">
                    <div className="text-sm font-black text-pink-300">
                      {item.data.word}
                    </div>
                    <div className="text-xs text-emerald-300 font-semibold">
                      {item.data.translation}
                    </div>
                    {item.data.example && (
                      <div className="text-[11px] text-slate-400 italic">
                        “{item.data.example}”
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-emerald-500/20 space-y-1 text-xs text-slate-300">
                    {item.data.reps && (
                      <div className="font-bold text-amber-300">
                        {item.data.reps}
                      </div>
                    )}
                    {item.data.steps?.map((st, idx) => (
                      <div key={idx} className="truncate">
                        • {st}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-500/20 text-xs font-bold text-purple-300 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Tahrirlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>O‘chirish</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-[#160c2e] border border-purple-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Yopish"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-lg font-extrabold text-white mb-4">
              {editing.id
                ? 'Lug‘at / Mashqni Tahrirlash'
                : 'O‘quvchiga Lug‘at yoki Mashq Berish'}
            </h4>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Target Student Selector */}
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1">
                  Qaysi O‘quvchiga Berilsin?
                </label>
                <select
                  value={editing.target_user_id}
                  onChange={(e) =>
                    setEditing({ ...editing, target_user_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1f133b] border border-amber-500/40 text-sm text-white"
                >
                  <option value="">
                    Barcha fan o‘quvchilariga (Umumiy topshiriq)
                  </option>
                  {sortedStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email}) — {s.subject_slug || 'umumiy'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Topshiriq Turi
                  </label>
                  <select
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        category: e.target.value as
                          | 'vocabulary'
                          | 'exercise'
                          | 'workout',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1f133b] border border-purple-700/40 text-sm text-white"
                  >
                    <option value="vocabulary">Til Lug‘ati / Atama</option>
                    <option value="workout">Amaliy Mashq / Topshiriq</option>
                  </select>
                </div>

                {isAdmin && teachers.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Fan Yo‘nalishi
                    </label>
                    <select
                      value={editing.subject_slug}
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
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Sarlavha
                </label>
                <input
                  type="text"
                  required
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  placeholder="Masalan: IELTS Kundalik So‘zlar (1-to‘plam)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
              </div>

              {editing.category === 'vocabulary' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        So‘z / Atama
                      </label>
                      <input
                        type="text"
                        required
                        value={editing.word}
                        onChange={(e) =>
                          setEditing({ ...editing, word: e.target.value })
                        }
                        placeholder="Resilience"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Talaffuz (ixtiyoriy)
                      </label>
                      <input
                        type="text"
                        value={editing.pronunciation}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pronunciation: e.target.value,
                          })
                        }
                        placeholder="[rɪˈzɪl.jəns]"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Tarjima / Izoh
                    </label>
                    <input
                      type="text"
                      required
                      value={editing.translation}
                      onChange={(e) =>
                        setEditing({ ...editing, translation: e.target.value })
                      }
                      placeholder="Qiyinchiliklarga bardoshlilik, matonat"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Misol gap (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={editing.example}
                      onChange={(e) =>
                        setEditing({ ...editing, example: e.target.value })
                      }
                      placeholder="She showed great resilience."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Mashq Qadamlari (har bir qator — bitta vazifa)
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={editing.stepsText}
                      onChange={(e) =>
                        setEditing({ ...editing, stepsText: e.target.value })
                      }
                      placeholder={
                        "1. HTML sahifada asosiy sarlavha yozing\n2. CSS bilan rang bering\n3. Tugma qo‘shing"
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Muddat / Takrorlash (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={editing.reps}
                      onChange={(e) =>
                        setEditing({ ...editing, reps: e.target.value })
                      }
                      placeholder="Bugun 20 daqiqa / 3 ta mashq"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Ustoz maslahati / Izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={editing.tip}
                  onChange={(e) =>
                    setEditing({ ...editing, tip: e.target.value })
                  }
                  placeholder="Har kuni ertalab takrorlab chiqing!"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
              </div>

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
                  <span>{saving ? 'Saqlanmoqda...' : 'Biriktirish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
