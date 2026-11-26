import { PublicUser, User } from './types';

const USER_STORAGE_KEY = 'devsisters_active_user';
const AUTH_CHANNEL_NAME = 'devsisters_auth';

function broadcastAuthChange(user: PublicUser | null): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return;
  }
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.postMessage({
      userId: user?.id ?? null,
      role: user?.role ?? null,
    });
    channel.close();
  } catch {
    // Ignore channel errors on unsupported browsers
  }
}

export function subscribeAuthChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === USER_STORAGE_KEY) {
      onChange();
    }
  };
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      onChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', handleVisibility);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = () => onChange();
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore
      }
    }
  };
}

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
    broadcastAuthChange(null);
  } else {
    const { password: _ignored, ...safeUser } = user as User;
    void _ignored;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    if (safeUser.role === 'admin') {
      sessionStorage.setItem('devsisters_admin_auth', 'true');
    } else {
      sessionStorage.removeItem('devsisters_admin_auth');
    }
    broadcastAuthChange(safeUser);
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
