export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'teacher' | 'student';
  subject_slug?: string;
  avatar_url?: string;
  phone?: string;
  points?: number;
  is_verified?: boolean;
  created_at?: string;
}

export type PublicUser = Omit<User, 'password'>;

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  slug: string;
  bio: string;
  experience: string;
  avatar_url: string;
  telegram?: string;
  display_order?: number;
}

export interface Lesson {
  id: string;
  teacher_id?: string;
  subject_slug: string;
  title: string;
  description: string;
  video_url: string;
  video_storage_path?: string;
  duration: string;
  order_num: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  subject_slug: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface PracticeItem {
  id: string;
  subject_slug: string;
  category: 'vocabulary' | 'exercise' | 'workout';
  title: string;
  data: {
    word?: string;
    translation?: string;
    pronunciation?: string;
    example?: string;
    steps?: string[];
    reps?: string;
    tip?: string;
  };
}

export interface CommunityPost {
  id: string;
  author_name: string;
  author_avatar?: string;
  subject_slug?: string;
  title: string;
  content: string;
  likes: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  subject_slug?: string;
  sender_name: string;
  sender_role: 'student' | 'teacher' | 'admin';
  sender_avatar?: string;
  avatar_color: string;
  content: string;
  time: string;
  reactions: Record<string, number>;
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id?: string;
  quiz_id?: string;
  quiz_score?: number;
  completed: boolean;
  created_at?: string;
}

export interface CertificateRecord {
  id: string;
  cert_code: string;
  user_id?: string;
  student_name: string;
  subject_slug?: string;
  course_name: string;
  score_percent: number;
  issued_at: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url?: string;
  subject_slug?: string;
  points: number;
  role: 'admin' | 'teacher' | 'student';
}
