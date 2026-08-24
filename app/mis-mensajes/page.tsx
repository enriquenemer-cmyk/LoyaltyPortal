'use client';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

import { useState } from 'react';
import Link from 'next/link';

type Message = {
  id: string;
  from_role: string;
  to_phone: string;
  to_email: string | null;
  subject: string;
  body: string;
  prize_id: string | null;
  claim_id: string | null;
  read_at: string | null;
  created_at: string;
  prize_name: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MisMensajesPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    setMessages(null);
    setSearched(false);
    try {
      const res = await fetch(`/api/messages?contact=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al buscar mensajes');
        return;
      }
      setMessages(data.messages);
      setSearched(true);
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/messages/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setMessages((prev) =>
          prev
            ? prev.map((m) =>
                m.id === id ? { ...m, read_at: new Date().toISOString() } : m
              )
            : prev
        );
      }
    } catch {
      // silently ignore
    } finally {
      setMarkingId(null);
    }
  }

  const unreadCount = messages ? messages.filter((m) => !m.read_at).length : 0;

  return (
    <div className="min-h-screen" style={{ background: '#F7F7F5' }}>
      {/* Header */}
      <div
        className="w-full"
        style={{
          background: 'linear-gradient(135deg, #F97316, #EA580C)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="max-w-lg mx-auto px-5 py-8 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Mis Mensajes</h1>
          <p className="text-white/70 text-sm">Mensajes de 3E para ti</p>
          {/* Tab navigation */}
          <div className="flex justify-center gap-2 mt-5">
            <Link
              href="/mis-premios"
              className="px-5 py-2 rounded-full text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
            >
              Premios
            </Link>
            <span
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#F97316' }}
            >
              Mensajes
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Search form */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Buscar por numero de telefono
          </p>
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                <span><DevicePhoneMobileIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span> Tu numero de celular
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 5512345678"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-orange-500 transition-all"
                style={{ '--tw-ring-color': 'rgba(249,115,22,0.2)' } as React.CSSProperties}
                required
                autoComplete="tel"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex gap-2 items-center">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full font-extrabold py-3.5 rounded-xl text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{
                background: loading ? '#FED7AA' : 'linear-gradient(135deg,#F97316,#EA580C)',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(249,115,22,0.30)',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Buscando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Ver mis mensajes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && messages !== null && (
          <>
            {messages.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#FFF7ED' }}
                >
                  <svg className="w-8 h-8" style={{ color: '#FED7AA' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 font-bold text-base mb-1">Sin mensajes</p>
                <p className="text-gray-400 text-sm">
                  No hay mensajes para ese numero de telefono.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
                  </p>
                  {unreadCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#FFF7ED', color: '#C2410C' }}
                    >
                      {unreadCount} sin leer
                    </span>
                  )}
                </div>

                {messages.map((msg) => {
                  const isUnread = !msg.read_at;
                  return (
                    <div
                      key={msg.id}
                      className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
                      style={{
                        boxShadow: isUnread
                          ? '0 2px 16px rgba(249,115,22,0.12)'
                          : '0 2px 16px rgba(0,0,0,0.06)',
                        border: isUnread ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
                      }}
                      onClick={() => isUnread && handleMarkRead(msg.id)}
                    >
                      <div
                        className="h-1 w-full"
                        style={{
                          background: isUnread
                            ? 'linear-gradient(90deg, #F97316, #EA580C)'
                            : '#e5e7eb',
                        }}
                      />
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {isUnread && (
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: '#F97316' }}
                                />
                              )}
                              <p
                                className="font-extrabold text-gray-900 text-sm leading-tight truncate"
                                style={{ color: isUnread ? '#1C1917' : '#6b7280' }}
                              >
                                {msg.subject}
                              </p>
                            </div>
                            <p className="text-gray-400 text-xs">
                              {formatDate(msg.created_at)}
                            </p>
                          </div>
                          {isUnread ? (
                            <span
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{ background: '#FFF7ED', color: '#C2410C' }}
                            >
                              Nuevo
                            </span>
                          ) : (
                            <span
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{ background: '#f3f4f6', color: '#9ca3af' }}
                            >
                              Leido
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                          {msg.body}
                        </p>

                        {msg.prize_name && (
                          <div
                            className="flex items-center gap-2 rounded-xl px-3 py-2 mt-1"
                            style={{ background: '#FFF7ED' }}
                          >
                            <svg
                              className="w-4 h-4 shrink-0"
                              style={{ color: '#F97316' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
                              />
                            </svg>
                            <p className="text-sm font-semibold" style={{ color: '#EA580C' }}>
                              Premio: {msg.prize_name}
                            </p>
                          </div>
                        )}

                        {isUnread && (
                          <button
                            disabled={markingId === msg.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(msg.id);
                            }}
                            className="w-full mt-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            style={{
                              background: '#f3f4f6',
                              color: '#6b7280',
                            }}
                          >
                            {markingId === msg.id ? 'Marcando...' : 'Marcar como leido'}
                          </button>
                        )}

                        {msg.read_at && (
                          <p className="text-gray-300 text-xs text-right">
                            Leido el {formatDate(msg.read_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs pb-6">
          3E · by ENM
        </p>
      </div>
    </div>
  );
}
