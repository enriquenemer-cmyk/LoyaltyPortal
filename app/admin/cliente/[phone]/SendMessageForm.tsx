'use client';

import { useState } from 'react';

export function SendMessageForm({ phone, name }: { phone: string; name: string }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, message: message.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Error al enviar el mensaje');
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Escribe un mensaje interno sobre ${name}...`}
        rows={3}
        className="w-full px-3 py-2.5 text-sm bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#2563EB] hover:bg-[#0891B2] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : sent ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          {sent ? 'Enviado' : sending ? 'Enviando...' : 'Enviar mensaje'}
        </button>
        <p className="text-xs text-stone-400">Para: {phone}</p>
      </div>
    </div>
  );
}
