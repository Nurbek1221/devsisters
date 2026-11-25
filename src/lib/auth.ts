import { PublicUser, User } from './types';

const USER_STORAGE_KEY = 'devsisters_active_user';

export function getStoredUser(): PublicUser | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_STORAGE_KEY);
  if (!userJson) return null;
  try {
    const parsed = JSON.parse(userJson) as User;
    const { password: _ignored, ...safeUser } = parsed;
    void _ignored;
    return safeUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: PublicUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem('devsisters_admin_auth');
  } else {
    const { password: _ignored, ...safeUser } = user as User;
    void _ignored;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    if (safeUser.role === 'admin') {
      sessionStorage.setItem('devsisters_admin_auth', 'true');
    } else {
      sessionStorage.removeItem('devsisters_admin_auth');
    }
  }
}

export async function loginUser(
  email: string,
  pass: string
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = (await res.json()) as { user?: PublicUser; error?: string };
    if (!res.ok || !data.user) {
      return { error: data.error || 'Email yoki parol noto‘g‘ri!' };
    }
    setStoredUser(data.user);
    return { user: data.user };
  } catch {
    return { error: 'Server bilan bog‘lanishda xatolik yuz berdi.' };
  }
}

export async function registerStudent(
  name: string,
  email: string,
  pass: string,
  phone?: string,
  subjectSlug?: string,
  avatarUrl?: string
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password: pass,
        phone,
        subject_slug: subjectSlug,
        avatar_url: avatarUrl,
      }),
    });
    const data = (await res.json()) as { user?: PublicUser; error?: string };
    if (!res.ok || !data.user) {
      return { error: data.error || 'Ro‘yxatdan o‘tishda xatolik!' };
    }
    setStoredUser(data.user);
    return { user: data.user };
  } catch {
    return { error: 'Server bilan bog‘lanishda xatolik yuz berdi.' };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore network failure on logout
  }
  setStoredUser(null);
}

export async function refreshCurrentUser(): Promise<PublicUser | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 401) {
        setStoredUser(null);
      }
      return null;
    }
    const data = (await res.json()) as { user?: PublicUser | null };
    if (data.user) {
      setStoredUser(data.user);
      return data.user;
    }
    return null;
  } catch {
    return getStoredUser();
  }
}

export async function updateUserProfile(updates: {
  name?: string;
  phone?: string;
  subject_slug?: string;
  avatar_url?: string;
}): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = (await res.json()) as { user?: PublicUser; error?: string };
    if (!res.ok || !data.user) {
      return { error: data.error || 'Profilni yangilashda xatolik.' };
    }
    setStoredUser(data.user);
    return { user: data.user };
  } catch {
    return { error: 'Server bilan bog‘lanishda xatolik.' };
  }
}

export async function updateUserSubject(
  userId: string,
  subjectSlug: string
): Promise<PublicUser | null> {
  void userId;
  const res = await updateUserProfile({ subject_slug: subjectSlug });
  return res.user || null;
}
