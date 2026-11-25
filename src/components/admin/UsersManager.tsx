'use client';

import React, { useState } from 'react';
import { PublicUser, Teacher } from '@/lib/types';
import {
  Search,
  Edit,
  Trash2,
  ShieldCheck,
  Save,
  X,
  Lock,
} from 'lucide-react';
import AvatarUploader from '@/components/AvatarUploader';

interface UsersManagerProps {
  users: PublicUser[];
  teachers: Teacher[];
  currentAdminId: string;
  onUsersChange: (next: PublicUser[]) => void;
}

export default function UsersManager({
  users,
  teachers,
  currentAdminId,
  onUsersChange,
}: UsersManagerProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [editing, setEditing] = useState<
    (Partial<PublicUser> & { new_password?: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.subject_slug || '').toLowerCase().includes(q)
    );
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.id) return;
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = (await res.json()) as {
        user?: PublicUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error || 'Yangilashda xatolik.');
        setSaving(false);
        return;
      }

      onUsersChange(users.map((u) => (u.id === data.user!.id ? data.user! : u)));
      setEditing(null);
    } catch {
      setError('Server bilan aloqada xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentAdminId) return;
    if (!confirm('Foydalanuvchini tizimdan o‘chirmoqchimisiz?')) return;

    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      onUsersChange(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white">
            Foydalanuvchilar Ro‘yxati ({filtered.length} ta)
          </h3>
          <p className="text-xs text-slate-400">
            Parollar shifrlangan holda saqlanadi (scrypt) va hech qachon ochiq
            ko‘rsatilmaydi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki email..."
              className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-purple-700/40 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(
                e.target.value as 'all' | 'student' | 'teacher' | 'admin'
              )
            }
            className="px-3 py-2 rounded-xl bg-[#1f133b] border border-purple-700/40 text-xs text-white"
          >
            <option value="all">Barcha rollar</option>
            <option value="student">O‘quvchilar</option>
            <option value="teacher">Ustozlar</option>
            <option value="admin">Adminlar</option>
          </select>
        </div>
      </div>

      <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-purple-800/40 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Foydalanuvchi</th>
                <th className="py-3.5 px-4">Rol & Yo‘nalish</th>
                <th className="py-3.5 px-4">Ballar</th>
                <th className="py-3.5 px-4">Xavfsizlik</th>
                <th className="py-3.5 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30 text-xs sm:text-sm">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatar_url}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover border border-pink-500/30 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-700/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : u.role === 'teacher'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.subject_slug && (
                        <span className="text-[11px] text-slate-400">
                          {u.subject_slug}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-amber-300">
                    {u.points || 0} ball
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Shifrlangan (scrypt)</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setEditing({ ...u, new_password: '' });
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-purple-500/20 text-purple-300 cursor-pointer"
                        title="Tahrirlash"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {u.id !== currentAdminId && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
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
              Foydalanuvchini Tahrirlash
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
                  name={editing.name || 'User'}
                  folder="users"
                  size="sm"
                  label="Profil rasmini yangilash"
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

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Kirish Logini (Email)
                </label>
                <input
                  type="email"
                  required
                  value={editing.email || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                  placeholder="email@devsisters.uz"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editing.role || 'student'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      role: e.target.value as 'admin' | 'teacher' | 'student',
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1f133b] border border-purple-700/40 text-sm text-white"
                >
                  <option value="student">O‘quvchi</option>
                  <option value="teacher">Ustoz</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  value={editing.subject_slug || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, subject_slug: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1f133b] border border-purple-700/40 text-sm text-white"
                >
                  <option value="">Yo‘nalish tanlanmagan</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editing.phone || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                  placeholder="Telefon"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={editing.points || 0}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      points: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="Ballar"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-pink-400" />
                  <span>Parolni yangilash (ixtiyoriy, min 6 belgi)</span>
                </label>
                <input
                  type="password"
                  value={editing.new_password || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, new_password: e.target.value })
                  }
                  placeholder="O‘zgartirmaslik uchun bo‘sh qoldiring"
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
