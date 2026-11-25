'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  LogOut,
  Users,
  BookOpen,
  Video,
  MessageSquare,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import {
  getStoredUser,
  logoutUser,
  refreshCurrentUser,
  updateUserProfile,
} from '@/lib/auth';
import { INITIAL_TEACHERS, INITIAL_LESSONS } from '@/lib/data';
import { Lesson, PublicUser, Teacher } from '@/lib/types';
import VideoModal from '@/components/VideoModal';
import CommunityChat from '@/components/CommunityChat';
import AvatarUploader from '@/components/AvatarUploader';
import AdminStats from '@/components/admin/AdminStats';
import TeachersManager from '@/components/admin/TeachersManager';
import LessonsManager from '@/components/admin/LessonsManager';
import UsersManager from '@/components/admin/UsersManager';

type AdminTab = 'overview' | 'teachers' | 'lessons' | 'users' | 'community';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const loadAdminData = useCallback(async () => {
    const cached = getStoredUser();
    const fresh = await refreshCurrentUser();
    const current = fresh || cached;

    if (!current || current.role !== 'admin') {
      router.push('/login?next=/admin');
      return;
    }

    setUser(current);
    setIsCheckingAuth(false);

    try {
      const [platRes, usersRes] = await Promise.all([
        fetch('/api/platform', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);

      if (platRes.ok) {
        const plat = (await platRes.json()) as {
          teachers?: Teacher[];
          lessons?: Lesson[];
        };
        if (plat.teachers?.length) setTeachers(plat.teachers);
        if (plat.lessons?.length) setLessons(plat.lessons);
      }

      if (usersRes.ok) {
        const uData = (await usersRes.json()) as { users?: PublicUser[] };
        if (uData.users) setUsers(uData.users);
      }
    } catch {
      // Fallback kept
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAdminData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAdminData]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  if (isCheckingAuth || !user) {
    return (
      <div className="min-h-screen bg-[#0d071d] flex items-center justify-center text-pink-400 font-bold">
        Admin panel yuklanmoqda...
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
                <ShieldCheck className="w-5 h-5 text-pink-400" />
                <span className="font-extrabold text-lg sm:text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  devsisters.uz Admin Boshqaruvi
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Administrator: <strong className="text-white">{user.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200"
            >
              Ustoz Paneli
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Admin Profile Card */}
        <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <AvatarUploader
            currentUrl={user.avatar_url}
            name={user.name}
            folder="admins"
            size="md"
            label="Admin rasmini yuklash"
            onUploaded={async (url) => {
              const res = await updateUserProfile({ avatar_url: url });
              if (res.error || !res.user) {
                throw new Error(res.error || 'Admin rasmini saqlab bo‘lmadi.');
              }
              setUser(res.user);
            }}
          />

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'overview' as AdminTab, label: 'Statistika', icon: BarChart3 },
              { id: 'teachers' as AdminTab, label: 'Mentorlar', icon: BookOpen },
              { id: 'lessons' as AdminTab, label: 'Video Darslar', icon: Video },
              { id: 'users' as AdminTab, label: 'Foydalanuvchilar', icon: Users },
              { id: 'community' as AdminTab, label: 'Hamjamiyat', icon: MessageSquare },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
        </div>

        {activeTab === 'overview' && (
          <AdminStats teachers={teachers} lessons={lessons} users={users} />
        )}

        {activeTab === 'teachers' && (
          <TeachersManager
            teachers={teachers}
            onTeachersChange={setTeachers}
          />
        )}

        {activeTab === 'lessons' && (
          <LessonsManager
            lessons={lessons}
            teachers={teachers}
            onLessonsChange={setLessons}
            onPreviewLesson={setPreviewLesson}
          />
        )}

        {activeTab === 'users' && (
          <UsersManager
            users={users}
            teachers={teachers}
            currentAdminId={user.id}
            onUsersChange={setUsers}
          />
        )}

        {activeTab === 'community' && (
          <CommunityChat
            currentUser={user}
            className="!py-4 !bg-transparent !border-none"
          />
        )}
      </main>

      <VideoModal
        lesson={previewLesson}
        teachers={teachers}
        onClose={() => setPreviewLesson(null)}
      />
    </div>
  );
}
