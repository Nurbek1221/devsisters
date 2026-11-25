'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, CommunityPost, PublicUser } from '../lib/types';
import { INITIAL_POSTS } from '../lib/data';
import {
  Users,
  Heart,
  MessageSquare,
  Send,
  Sparkles,
  PlusCircle,
  Radio,
  Trash2,
  CheckCircle2,
  Award,
  ShieldCheck,
  X,
} from 'lucide-react';

interface CommunityChatProps {
  currentUser?: PublicUser | null;
  className?: string;
}

export default function CommunityChat({
  currentUser,
  className = '',
}: CommunityChatProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'forum'>('chat');

  // Forum & Chat state synced with `/api/community`
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [statusError, setStatusError] = useState('');
  const [onlineMembers] = useState<number>(28);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadCommunity = async () => {
      try {
        const res = await fetch('/api/community', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          chat_messages?: ChatMessage[];
          community_posts?: CommunityPost[];
        };
        if (!active) return;
        if (Array.isArray(data.chat_messages)) {
          setChatMessages(data.chat_messages);
        }
        if (Array.isArray(data.community_posts)) {
          setPosts(data.community_posts);
        }
      } catch {
        // Keep initial state when offline
      }
    };

    loadCommunity();
    const timer = setInterval(loadCommunity, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (chatScrollRef.current && activeTab === 'chat') {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    setStatusError('');

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'chat',
          subject_slug: currentUser?.subject_slug || 'umumiy',
          content,
        }),
      });
      const data = (await res.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok || !data.message) {
        setStatusError(data.error || 'Xabar yuborish uchun tizimga kiring.');
        return;
      }
      setChatMessages((prev) => [...prev, data.message!]);
      setChatInput('');
    } catch {
      setStatusError('Server bilan aloqada xatolik yuz berdi.');
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              reactions: {
                ...m.reactions,
                [emoji]: (m.reactions?.[emoji] || 0) + 1,
              },
            }
          : m
      )
    );

    try {
      await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'reaction', messageId: msgId, emoji }),
      });
    } catch {
      // Optimistic reaction retained
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await fetch(`/api/community?kind=chat&id=${encodeURIComponent(msgId)}`, {
        method: 'DELETE',
      });
    } catch {
      // ignore
    }
  };

  const handleLikePost = async (id: string) => {
    if (likedPosts[id]) return;
    setLikedPosts((prev) => ({ ...prev, [id]: true }));
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p))
    );

    try {
      await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'like_post', postId: id }),
      });
    } catch {
      // ignore
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    setStatusError('');

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'post',
          title: postTitle.trim(),
          content: postContent.trim(),
          subject_slug: currentUser?.subject_slug || 'it-dasturlash',
        }),
      });
      const data = (await res.json()) as {
        post?: CommunityPost;
        error?: string;
      };
      if (!res.ok || !data.post) {
        setStatusError(data.error || 'Mavzu ochish uchun tizimga kiring.');
        return;
      }

      setPosts((prev) => [data.post!, ...prev]);
      setPostTitle('');
      setPostContent('');
      setShowModal(false);
    } catch {
      setStatusError('Server bilan aloqada xatolik.');
    }
  };

  return (
    <section
      id="hamjamiyat"
      className={`py-16 bg-[#0d071d] relative border-t border-purple-900/30 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-3 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Umumiy Qizlar Hamjamiyati</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Jonli Muloqot & Forum
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-xl">
              O‘zbekistondagi barcha o‘quvchi qizlar va ustozlar bilan bevosita
              jonli chatda yozishing va fikr almashing.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Jonli Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('forum')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                activeTab === 'forum'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Savol-Javob ({posts.length})</span>
            </button>
          </div>
        </div>

        {statusError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            ⚠️ {statusError}
          </div>
        )}

        {/* TAB 1: JONLI CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-[#160c2e] border border-purple-800/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[540px]">
            {/* Chat Bar */}
            <div className="px-6 py-4 bg-[#1c103b]/90 border-b border-purple-800/40 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Radio className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#160c2e]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Umumiy O‘quvchilar Chati</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      Jonli • {onlineMembers} onlayn
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Barcha ustozlar va o‘quvchilar real vaqtda muloqot qilmoqda
                  </p>
                </div>
              </div>

              {currentUser && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <span className="text-slate-400">Siz:</span>
                  <span className="font-bold text-pink-300">
                    {currentUser.name}
                  </span>
                </div>
              )}
            </div>

            {/* Chat Messages Stream */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#120826]/40 scrollbar-none"
            >
              {chatMessages.map((msg) => {
                const isOwn = currentUser?.name === msg.sender_name;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isOwn ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    {msg.sender_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.sender_avatar}
                        alt={msg.sender_name}
                        className="w-9 h-9 rounded-full object-cover border border-pink-500/40 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${msg.avatar_color} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg border border-white/10`}
                      >
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] space-y-1.5 ${
                        isOwn ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          isOwn ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span className="font-bold text-white">
                          {msg.sender_name}
                        </span>
                        {msg.sender_role === 'teacher' && (
                          <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-bold border border-pink-500/30 flex items-center gap-1">
                            <Award className="w-3 h-3" /> Ustoz
                          </span>
                        )}
                        {msg.sender_role === 'admin' && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px]">
                          {msg.time}
                        </span>

                        {(currentUser?.role === 'admin' ||
                          currentUser?.role === 'teacher') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Xabarni o‘chirish (Moderatsiya)"
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                          isOwn
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-tr-none'
                            : 'bg-[#1f133b] border border-purple-800/40 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Quick reactions */}
                      <div
                        className={`flex items-center gap-1.5 flex-wrap ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {Object.entries(msg.reactions || {}).map(
                          ([emoji, count]) => (
                            <button
                              type="button"
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-pink-500/20 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-pink-300 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <span>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => handleReaction(msg.id, '❤️')}
                          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-slate-500 hover:text-pink-400 flex items-center justify-center text-[11px] transition-all cursor-pointer"
                          title="Reaksiya bildirish"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Box */}
            <form
              onSubmit={handleSendChatMessage}
              className="p-4 bg-[#1c103b]/90 border-t border-purple-800/40 flex items-center gap-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Fikringizni yoki savolingizni yozing..."
                className="flex-1 bg-white/5 border border-purple-700/40 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-pink-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="hidden sm:inline">Yuborish</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: SAVOL-JAVOB FORUMI */}
        {activeTab === 'forum' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-pink-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Yangi Mavzu Ochish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const likes = post.likes || 0;
                const isLiked = !!likedPosts[post.id];

                return (
                  <div
                    key={post.id}
                    className="rounded-3xl p-6 bg-[#180e30]/90 border border-purple-800/40 hover:border-pink-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow">
                            {post.author_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-1">
                              <span>{post.author_name}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {post.created_at}
                            </div>
                          </div>
                        </div>

                        {post.subject_slug && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/5 text-pink-300 border border-pink-500/20">
                            {post.subject_slug}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-purple-900/40 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isLiked
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 border border-white/5'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400' : ''}`}
                        />
                        <span>{likes}</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                        <span>Faol muhokama</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#160c2e] border border-purple-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Yopish"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <span>Yangi Mavzu / Savol Qoldirish</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Platformamizdagi barcha o‘quvchilar va ustozlar bilan foydali
              maslahat yoki savolingizni ulashing.
            </p>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Mavzu sarlavhasi
                </label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Masalan: HTML/CSS loyihani deploy qilish bo‘yicha maslahat"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Savol yoki fikr matni
                </label>
                <textarea
                  required
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Batafsil yozing..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-purple-700/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Chop etish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
