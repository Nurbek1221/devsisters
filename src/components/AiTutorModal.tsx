'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, User } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export default function AiTutorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Assalomu alaykum! Men SisterAI — devsisters.uz platformasining Sun‘iy Intellekt repetitoriman. IT va Dasturlash, Ingliz tili, Arab tili, Kimyo, Ona tili, Geografiya, Rus tili va Sport yo‘nalishlaridan istalgan savolingizni bering! ✨',
      time: 'Hozir',
    },
  ]);

  const quickPrompts = [
    'Web dasturlash (HTML, CSS, JS) ni nimadan boshlash kerak?',
    'Ingliz tilida Speakingni qanday rivojlantirsa bo‘ladi?',
    'Kimyoda molekula va atom farqi nimada?',
    'QR-kodli sertifikat qanday olinadi?',
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || isTyping) return;

    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const userMsg: Message = {
      id: `u-${now.getTime()}`,
      sender: 'user',
      text,
      time: formattedTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      let replyText =
        'Savolingiz qabul qilindi! Iltimos, darslar va testlar bo‘limidan foydalanib ko‘ring.';
      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) replyText = data.reply;
      }

      const replyDate = new Date();
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${replyDate.getTime()}`,
          sender: 'ai',
          text: replyText,
          time: `${String(replyDate.getHours()).padStart(2, '0')}:${String(
            replyDate.getMinutes()
          ).padStart(2, '0')}`,
        },
      ]);
    } catch {
      const errDate = new Date();
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${errDate.getTime()}`,
          sender: 'ai',
          text: 'Aloqada vaqtinchalik uzilish yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.',
          time: `${String(errDate.getHours()).padStart(2, '0')}:${String(
            errDate.getMinutes()
          ).padStart(2, '0')}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold shadow-2xl shadow-pink-600/40 border border-white/20 transition-all hover:scale-105 cursor-pointer"
        aria-label="AI Repetitor yordamchini ochish"
      >
        <div className="relative">
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#160b2e]" />
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-extrabold flex items-center gap-1">
            <span>SisterAI</span>
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
          <div className="text-[10px] text-purple-100/90 font-medium">
            24/7 Repetitor
          </div>
        </div>
      </button>

      {/* Modal Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[92vw] max-w-md h-[80vh] max-h-[600px] bg-[#160c2e] border border-purple-700/60 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#231247] to-[#1a0c36] border-b border-purple-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white text-sm">
                    SisterAI — aqlli repetitor
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                    Onlayn
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  IT va 7 ta fan bo‘yicha shaxsiy yordamchi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Yopish"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#120826]/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${
                  m.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.sender === 'ai'
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                      : 'bg-purple-800 text-purple-200'
                  }`}
                >
                  {m.sender === 'ai' ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'ai'
                      ? 'bg-[#1f133b] border border-purple-800/40 text-slate-200 rounded-tl-none'
                      : 'bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-tr-none'
                  }`}
                >
                  {m.text}
                  <div
                    className={`text-[10px] mt-1.5 ${
                      m.sender === 'ai' ? 'text-slate-500' : 'text-pink-200/80'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1f133b] border border-purple-800/40 rounded-tl-none flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-4 py-2 border-t border-purple-900/40 bg-[#150b2b] flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((prompt, i) => (
              <button
                type="button"
                key={i}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1 rounded-full bg-white/5 hover:bg-pink-500/20 border border-white/10 text-[11px] text-slate-300 hover:text-pink-300 whitespace-nowrap transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[#1c103b] border-t border-purple-800/50 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Savol yozing..."
              className="flex-1 bg-white/5 border border-purple-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pink-500/60"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              aria-label="Yuborish"
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
