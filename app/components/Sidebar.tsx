'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import NotificationBell from './NotificationBell';

// ── Types ────────────────────────────────────────────────────────────────────
type SearchResult = {
  id: string;
  type: 'claim' | 'prize' | 'restaurant' | 'user' | 'premio' | 'cliente' | 'cobro';
  title: string;
  subtitle?: string;
  href: string;
};

type Role = 'admin' | 'manager' | 'cajero';

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};

type SectionDef = {
  key: string;
  label: string;
  links: NavItem[];
  roles: Role[];
  groupIcon?: React.ReactNode;
  accent?: string;
};

// ── localStorage helpers ─────────────────────────────────────────────────────
const RECENT_KEY = 'premia_recent_searches';
const SEARCH_CACHE = new Map<string, SearchResult[]>();
const MAX_RECENT = 3;

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(query: string) {
  const prev = loadRecent().filter((q) => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)));
}

// ── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  contabilidad: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  proveedores: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  fichas: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  ventas: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  inventario: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2.5L20 6.5V14.5L12 18.5L4 14.5V6.5L12 2.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6.5L12 10.5L20 6.5M12 10.5V18.5" />
    </svg>
  ),
  fichajes: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
    </svg>
  ),
  capacitacion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 10L12 5 2 10l10 5 10-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5M22 10v6" />
    </svg>
  ),
  dashboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  generate: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  premios: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  registros: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  reglas: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  campanas: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  clientes: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  puntos: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  temporada: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4zM7 4H4a3 3 0 003 3M17 4h3a3 3 0 01-3 3" />
    </svg>
  ),
  automatizacion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  segmentacion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9 9 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  juegos: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  ticket: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M3 10h18" />
    </svg>
  ),
  scan: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4c-1.333-1.333-4-1-5 1S5.5 9 7 10s3 1 4 0 2.5-3 1.5-5S13.333 2.667 12 4zm0 0v16M8 8H4m16 0h-4M8 16H4m16 0h-4" />
    </svg>
  ),
  restaurantes: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  rendimiento: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  eventos: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  flash: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  reportes: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  asistente: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  corporativo: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a9 9 0 0118 0M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6M3 6h18M9 10h.01M15 10h.01M9 14h6" />
    </svg>
  ),
  competencia: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l.5 2H19l-2.5 5L19 15h-9.5l-.5-2H5v4H3z" />
    </svg>
  ),
  analitica: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2zM5 13l3-3 3 3 5-5" />
    </svg>
  ),
  seguridad: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  usuarios: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  permisos: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 0v8m-4-4h8M5 11V8a7 7 0 1114 0v3" />
    </svg>
  ),
  webhooks: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  apidocs: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  sistema: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ),
  auditoria: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  fraude: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-8.99 4.5h.008v.008h-.008v-.008z" />
    </svg>
  ),
  misiones: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  feedback: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  giftcards: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  suscripcion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
};

// ── Group header icons (one per section, slightly larger/bolder) ───────────
const GroupIcons = {
  principal: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  premios: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  clientes: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  operaciones: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  ),
  juegos: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  restaurantes: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  reportes: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  configuracion: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  ),
  contabilidad: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

// ── Nav sections definition ──────────────────────────────────────────────────
const ALL_SECTIONS: SectionDef[] = [
  {
    key: 'PRINCIPAL',
    label: 'Principal',
    roles: ['admin', 'manager', 'cajero'],
    groupIcon: GroupIcons.principal,
    accent: '#F97316',
    links: [
      { href: '/admin', label: 'Dashboard', exact: true, icon: Icons.dashboard },
      { href: '/admin/radar', label: 'Radar en Vivo', icon: Icons.analitica },
      { href: '/admin/generate', label: 'Generar Premio', icon: Icons.generate },
    ],
  },
  {
    key: 'PREMIOS',
    label: 'Premios',
    roles: ['admin', 'manager'],
    groupIcon: GroupIcons.premios,
    accent: '#F97316',
    links: [
      { href: '/admin/premios', label: 'Mis Premios', icon: Icons.premios },
      { href: '/admin/registros', label: 'Registros de Cobro', icon: Icons.registros },
      { href: '/admin/reglas', label: 'Premios Automaticos', icon: Icons.reglas },
      { href: '/admin/campanas', label: 'Campanas', icon: Icons.campanas },
    ],
  },
  {
    key: 'CLIENTES',
    label: 'Clientes',
    roles: ['admin', 'manager'],
    groupIcon: GroupIcons.clientes,
    accent: '#1a6b3c',
    links: [
      { href: '/admin/clientes', label: 'Base de Clientes', icon: Icons.clientes },
      { href: '/admin/segmentacion', label: 'Segmentación', icon: Icons.segmentacion },
      { href: '/admin/cumpleanos', label: 'Puntos y Sellos', icon: Icons.puntos },
      { href: '/admin/temporada', label: 'Temporada', icon: Icons.temporada },
      { href: '/admin/automatizacion', label: 'Automatizacion', icon: Icons.automatizacion },
      { href: '/admin/misiones', label: 'Misiones Semanales', icon: Icons.misiones },
      { href: '/admin/feedback', label: 'Feedback / NPS', icon: Icons.feedback },
    ],
  },
  {
    key: 'OPERACIONES',
    label: 'Operaciones',
    roles: ['admin', 'manager'],
    groupIcon: GroupIcons.operaciones,
    accent: '#1a6b3c',
    links: [
      { href: '/admin/ventas', label: 'Ventas Diarias', icon: Icons.ventas },
      { href: '/venta', label: 'Punto de Venta (POS)', icon: Icons.ventas },
      { href: '/admin/inventario', label: 'Inventario', icon: Icons.inventario },
      { href: '/admin/fichajes', label: 'Fichajes', icon: Icons.fichajes },
      { href: '/admin/capacitacion', label: 'Capacitación', icon: Icons.capacitacion },
    ],
  },
  {
    key: 'CONTABILIDAD',
    label: 'Contabilidad',
    roles: ['admin', 'manager'],
    groupIcon: GroupIcons.contabilidad,
    accent: '#1a6b3c',
    links: [
      { href: '/admin/contabilidad', label: 'Resumen Contable', icon: Icons.contabilidad },
      { href: '/admin/proveedores', label: 'Proveedores y Compras', icon: Icons.proveedores },
      { href: '/admin/ordenes-compra', label: 'Órdenes de Compra', icon: Icons.inventario },
      { href: '/admin/fichas', label: 'Fichas de Costo', icon: Icons.fichas },
    ],
  },
  {
    key: 'JUEGOS Y TICKETS',
    label: 'Juegos y Tickets',
    roles: ['admin', 'manager'],
    groupIcon: GroupIcons.juegos,
    accent: '#F97316',
    links: [
      { href: '/admin/game-bundles', label: 'Juegos con Premios', icon: Icons.juegos },
      { href: '/admin/ticket-tiers', label: 'Premio por Consumo', icon: Icons.ticket },
      { href: '/cajero/escanear', label: 'Verificar Codigo', icon: Icons.scan },
    ],
  },
  {
    key: 'LICENCIAS',
    label: 'Licencias SaaS',
    roles: ['admin'],
    groupIcon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
    accent: '#7c3aed',
    links: [
      { href: '/admin/licencias', label: 'Panel de Licencias', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>) },
    ],
  },
  {
    key: 'RESTAURANTES',
    label: 'Restaurantes',
    roles: ['admin', 'manager'],
    groupIcon: GroupIcons.restaurantes,
    accent: '#F97316',
    links: [
      { href: '/admin/restaurantes', label: 'Mis Restaurantes', icon: Icons.restaurantes },
      { href: '/admin/rendimiento', label: 'Rendimiento del Equipo', icon: Icons.rendimiento },
      { href: '/admin/competencia', label: 'Competencia', icon: Icons.competencia },
      { href: '/admin/eventos', label: 'Eventos Especiales', icon: Icons.eventos },
      { href: '/admin/flash', label: 'Campana Flash', icon: Icons.flash },
    ],
  },
  {
    key: 'REPORTES',
    label: 'Reportes',
    roles: ['admin'],
    groupIcon: GroupIcons.reportes,
    accent: '#1a6b3c',
    links: [
      { href: '/admin/asistente', label: 'Asistente IA', icon: Icons.asistente },
      { href: '/admin/corporativo', label: 'Vista Corporativa', icon: Icons.corporativo },
      { href: '/admin/analitica', label: 'Analitica Avanzada', icon: Icons.analitica },
      { href: '/admin/reporte', label: 'Reportes', icon: Icons.reportes },
      { href: '/admin/seguridad', label: 'Seguridad y Accesos', icon: Icons.seguridad },
      { href: '/admin/suscripciones', label: 'Suscripcion VIP', icon: Icons.suscripcion },
      { href: '/admin/gift-cards', label: 'Gift Cards', icon: Icons.giftcards },
      { href: '/admin/merch', label: 'Merch Canjeable', icon: Icons.premios },
      { href: '/admin/billing', label: 'Billing SaaS', icon: Icons.reportes },
      { href: '/admin/webhooks-salientes', label: 'Webhooks Zapier', icon: Icons.webhooks },
    ],
  },
  {
    key: 'CONFIGURACION',
    label: 'Configuración',
    roles: ['admin'],
    groupIcon: GroupIcons.configuracion,
    accent: '#111111',
    links: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: Icons.usuarios },
      { href: '/admin/permisos', label: 'Permisos', icon: Icons.permisos },
      { href: '/admin/webhooks', label: 'Webhooks', icon: Icons.webhooks },
      { href: '/admin/api-docs', label: 'API Docs', icon: Icons.apidocs },
      { href: '/admin/sistema', label: 'Sistema', icon: Icons.sistema },
      { href: '/admin/configuracion', label: 'Integraciones', icon: Icons.permisos },
      { href: '/admin/auditoria', label: 'Auditoría', icon: Icons.auditoria },
      { href: '/admin/fraude', label: 'Detector de Fraude', icon: Icons.fraude },
    ],
  },
];

// Cajero links
const CAJERO_LINKS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true, icon: Icons.dashboard },
  { href: '/admin/registros', label: 'Registros de Cobro', icon: Icons.registros },
  { href: '/cajero/kiosco', label: 'Kiosco Self-Service', icon: Icons.scan },
  { href: '/cajero/ruleta', label: 'Ruleta de Premios', icon: Icons.juegos },
];

// Manager hidden links in CONFIGURACION
const MANAGER_HIDDEN_LINKS = ['/admin/usuarios', '/admin/webhooks'];

// Flat href -> NavItem lookup, built once, used to render the favorites strip
// and to resolve a link's icon/label when only its href is known.
const ALL_LINKS_FLAT: Map<string, NavItem> = new Map();
for (const section of ALL_SECTIONS) {
  for (const link of section.links) ALL_LINKS_FLAT.set(link.href, link);
}
for (const link of CAJERO_LINKS) ALL_LINKS_FLAT.set(link.href, link);

// ── Accordion open-section persistence ──────────────────────────────────────
const OPEN_SECTION_KEY = 'premia_sidebar_open_section';

function sectionForPathname(sections: SectionDef[], pathname: string): string | null {
  for (const section of sections) {
    for (const link of section.links) {
      const isMatch = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + '/');
      if (isMatch) return section.key;
    }
  }
  return null;
}

function loadStoredOpenSection(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(OPEN_SECTION_KEY); } catch { return null; }
}

function saveStoredOpenSection(key: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (key) localStorage.setItem(OPEN_SECTION_KEY, key);
    else localStorage.removeItem(OPEN_SECTION_KEY);
  } catch { /* ignore */ }
}

// ── Favorites (pinned quick-access links) ───────────────────────────────────
const FAVORITES_KEY = 'premia_sidebar_favorites';

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]'); } catch { return []; }
}
function saveFavorites(hrefs: string[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(hrefs)); } catch { /* ignore */ }
}

// ── Compact mode (icon-only desktop sidebar) ────────────────────────────────
const COMPACT_KEY = 'premia_sidebar_compact';

function loadCompact(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(COMPACT_KEY) === '1'; } catch { return false; }
}
function saveCompact(value: boolean) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(COMPACT_KEY, value ? '1' : '0'); } catch { /* ignore */ }
  document.documentElement.classList.toggle('sidebar-compact', value);
}

// ── Search-result type → which section to auto-open + highlight ────────────
const TYPE_TO_SECTION: Record<string, string> = {
  premio: 'PREMIOS', prize: 'PREMIOS', cobro: 'PREMIOS', claim: 'PREMIOS',
  cliente: 'CLIENTES', user: 'CONFIGURACION', restaurant: 'RESTAURANTES',
};

// ── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch({ onSelect }: { onSelect?: (item: SearchResult) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => { if (focused) setRecent(loadRecent()); }, [focused]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    if (SEARCH_CACHE.has(q)) { setResults(SEARCH_CACHE.get(q)!); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const combined: SearchResult[] = [];
      if (res.ok) {
        const d = await res.json();
        for (const r of (d.results ?? [])) {
          let href = '/admin';
          if (r.type === 'premio') href = '/admin/premios';
          else if (r.type === 'cliente') href = `/admin/cliente/${encodeURIComponent(r.id)}`;
          else if (r.type === 'cobro') href = '/admin/registros';
          combined.push({ id: r.id + r.type, type: r.type, title: r.title, subtitle: r.subtitle, href });
        }
      }
      SEARCH_CACHE.set(q, combined);
      if (SEARCH_CACHE.size > 10) {
        const firstKey = SEARCH_CACHE.keys().next().value;
        if (firstKey !== undefined) SEARCH_CACHE.delete(firstKey);
      }
      setResults(combined);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(val.trim()), 350);
  }

  function selectResult(item: SearchResult) {
    saveRecent(query.trim());
    setRecent(loadRecent());
    setQuery(''); setResults([]); setFocused(false);
    router.push(item.href);
    onSelect?.(item);
  }

  function selectRecent(q: string) {
    setQuery(q);
    runSearch(q);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectResult(results[activeIdx]); }
    else if (e.key === 'Escape') { setFocused(false); inputRef.current?.blur(); }
  }

  const typeIcon: Record<SearchResult['type'], string> = {
    premio: '', cliente: '', cobro: '',
    claim: '', prize: '', restaurant: '', user: '',
  };
  const typeLabel: Record<SearchResult['type'], string> = {
    claim: 'Cobro', prize: 'Premio', restaurant: 'Restaurante', user: 'Usuario',
    premio: 'Premio', cliente: 'Cliente', cobro: 'Cobro',
  };
  const typeColor: Record<SearchResult['type'], string> = {
    claim: 'bg-orange-50 text-orange-600', prize: 'bg-orange-50 text-orange-600',
    restaurant: 'bg-emerald-50 text-emerald-600', user: 'bg-purple-50 text-[#1a6b3c]',
    premio: 'bg-yellow-900/40 text-yellow-300', cliente: 'bg-orange-900/40 text-orange-300',
    cobro: 'bg-stone-200/60 text-stone-800',
  };

  const showDropdown = focused && (results.length > 0 || (query === '' && recent.length > 0) || loading);

  return (
    <div className="px-3 py-2" style={{ borderBottom: '2px solid #000' }}>
      <div className="relative">
        <div className="relative flex items-center">
          {loading ? (
            <svg className="absolute left-2.5 w-3.5 h-3.5 text-[#1a6b3c] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="absolute left-2.5 w-3.5 h-3.5 text-stone-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar datos..."
            className="sidebar-search-input w-full pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none transition-all"
            style={{ background: '#f5f5f5', border: '2px solid #111', color: '#111', boxShadow: '2px 2px 0 #111', fontWeight: 600 }}
          />
        </div>
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-xl z-50 overflow-hidden"
            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {query === '' && recent.length > 0 && (
              <div>
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold tracking-widest text-black uppercase">Búsquedas recientes</p>
                {recent.map((q) => (
                  <button key={q} onMouseDown={() => selectRecent(q)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-800 hover:bg-black/6 transition-colors text-left">
                    <svg className="w-3 h-3 text-stone-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {results.length > 0 && (
              <div>
                {query !== '' && recent.length > 0 && <div style={{ borderTop: '1px solid #e5e7eb' }} />}
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold tracking-widest text-black uppercase">Resultados</p>
                {results.map((item, idx) => (
                  <button key={item.id + item.type} onMouseDown={() => selectResult(item)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${idx === activeIdx ? 'bg-orange-500/20' : 'hover:bg-black/8'}`}>
                    <span className="mt-0.5 text-sm shrink-0">{typeIcon[item.type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-black truncate">{item.title}</p>
                      {item.subtitle && <p className="text-[10px] text-stone-700 truncate">{item.subtitle}</p>}
                    </div>
                    <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${typeColor[item.type]}`}>
                      {typeLabel[item.type]}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!loading && query !== '' && results.length === 0 && (
              <p className="px-3 py-3 text-xs text-stone-700 text-center">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single nav link ──────────────────────────────────────────────────────────
function NavLink({
  href, label, icon, exact, highlighted, favorited, onToggleFavorite, showFavoriteToggle, linkBadge,
}: NavItem & {
  highlighted?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  showFavoriteToggle?: boolean;
  linkBadge?: number;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`group/navlink flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border-l-2 ${
        isActive
          ? 'font-semibold border-orange-400 pl-[10px]'
          : 'border-transparent pl-[10px]'
      } ${highlighted ? 'sidebar-link-pulse' : ''}`}
      style={isActive
        ? { background: 'rgba(249,115,22,0.15)', color: '#F97316', fontWeight: 600 }
        : { color: '#333333' }
      }
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(249,115,22,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = '#111111'; } }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = ''; (e.currentTarget as HTMLAnchorElement).style.color = '#333333'; } }}
    >
      <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
      <span className="truncate text-xs flex-1">{label}</span>
      {!!linkBadge && linkBadge > 0 && (
        <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-black text-[9px] font-bold flex items-center justify-center leading-none">
          {linkBadge > 99 ? '99+' : linkBadge}
        </span>
      )}
      {showFavoriteToggle && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(); }}
          aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className={`shrink-0 p-0.5 rounded transition-opacity ${favorited ? 'opacity-100' : 'opacity-0 group-hover/navlink:opacity-60 hover:opacity-100'}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill={favorited ? '#fbbf24' : 'none'} stroke={favorited ? '#fbbf24' : 'currentColor'} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}
    </Link>
  );
}

// ── Accordion section: group header (icon + label + count + chevron) ───────
// Collapses with a smooth grid-template-rows animation (0fr → 1fr), no JS
// height measuring needed. Only one section is open at a time (true accordion).
function AccordionSection({
  section,
  isOpen,
  hasActiveLink,
  onToggle,
  badge,
  favorites,
  onToggleFavorite,
  highlightedHref,
  linkBadges,
}: {
  section: SectionDef;
  isOpen: boolean;
  hasActiveLink: boolean;
  onToggle: () => void;
  badge?: number;
  favorites: Set<string>;
  onToggleFavorite: (href: string) => void;
  highlightedHref: string | null;
  linkBadges?: Record<string, number>;
}) {
  const accent = section.accent ?? '#F97316';

  return (
    <div className="rounded-xl overflow-hidden" style={{ marginBottom: 2 }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
        style={{
          background: isOpen || hasActiveLink ? `${accent}10` : 'transparent',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}12`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isOpen || hasActiveLink ? `${accent}10` : 'transparent'; }}
      >
        <span
          className="relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: `${accent}15`,
            color: accent,
          }}
        >
          {section.groupIcon}
          {!!badge && badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-black text-[8px] font-bold flex items-center justify-center leading-none ring-2" style={{ boxShadow: '0 0 0 2px #0f1117' }}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
        <span
          className="flex-1 text-left text-[12.5px] font-bold truncate"
          style={{ color: '#111111' }}
        >
          {section.label}
        </span>
        {hasActiveLink && !isOpen && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        )}
        <svg
          className="w-3.5 h-3.5 shrink-0 transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#555555' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Smooth expand/collapse: grid-template-rows 0fr<->1fr avoids height measuring */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-1 pb-1.5 pl-2 space-y-0.5" style={{ borderLeft: `2px solid ${accent}40`, marginLeft: 17 }}>
            {section.links.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                showFavoriteToggle
                favorited={favorites.has(link.href)}
                onToggleFavorite={() => onToggleFavorite(link.href)}
                highlighted={highlightedHref === link.href}
                linkBadge={linkBadges?.[link.href]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Favorites strip: pinned quick-access links, shown above all groups ─────
function FavoritesStrip({
  hrefs,
  highlightedHref,
  onToggleFavorite,
}: {
  hrefs: string[];
  highlightedHref: string | null;
  onToggleFavorite: (href: string) => void;
}) {
  if (hrefs.length === 0) return null;
  return (
    <div className="mb-2 rounded-xl px-1 py-1.5" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
      <p className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#fbbf24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Favoritos
      </p>
      <div className="space-y-0.5">
        {hrefs.map((href) => {
          const link = ALL_LINKS_FLAT.get(href);
          if (!link) return null;
          return (
            <NavLink
              key={href}
              {...link}
              showFavoriteToggle
              favorited
              onToggleFavorite={() => onToggleFavorite(href)}
              highlighted={highlightedHref === href}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Compact mode: icon-only rail with a hover flyout per group ─────────────
function CompactGroupIcon({
  section,
  hasActiveLink,
  badge,
}: {
  section: SectionDef;
  hasActiveLink: boolean;
  badge?: number;
}) {
  const accent = section.accent ?? '#F97316';
  return (
    <div className="group/compact relative">
      <div
        className="relative w-9 h-9 mx-auto mb-1 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
        style={{
          background: `${accent}15`,
          color: accent,
        }}
      >
        {section.groupIcon}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-black text-[8px] font-bold flex items-center justify-center leading-none" style={{ boxShadow: '0 0 0 2px #0f1117' }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      {/* Flyout panel: appears to the right on hover, pure CSS (group-hover) */}
      <div
        className="invisible opacity-0 group-hover/compact:visible group-hover/compact:opacity-100 transition-opacity duration-150 absolute left-full top-0 ml-2 w-52 rounded-xl z-50 pointer-events-none group-hover/compact:pointer-events-auto"
        style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      >
        <p className="px-3 pt-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          {section.label}
        </p>
        <div className="px-1.5 pb-1.5 space-y-0.5">
          {section.links.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Logo ─────────────────────────────────────────────────────────────────────
const LOGO = (
  <div className="shrink-0 flex items-center justify-center">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/logo-3e-oficial.webp" alt="3E" width={64} height={64} style={{ objectFit: 'contain' }} />
  </div>
);

// ── Dark mode hook ────────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('st-theme');
    const enabled = stored === 'dark';
    setDark(enabled);
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('st-theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };
  return { dark, toggle };
}

// ── SidebarContent ───────────────────────────────────────────────────────────
function SidebarContent({
  onLinkClick,
  compact = false,
  onToggleCompact,
}: {
  onLinkClick?: () => void;
  compact?: boolean;
  onToggleCompact?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('admin');
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [highFraudCount, setHighFraudCount] = useState(0);
  const { dark, toggle: toggleDark } = useDarkMode();

  // Favorites (pinned quick-access links)
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => { setFavorites(loadFavorites()); }, []);
  const favoritesSet = new Set(favorites);
  function toggleFavorite(href: string) {
    setFavorites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      saveFavorites(next);
      return next;
    });
  }

  // Highlight a link briefly (2s) after it's reached via global search
  const [highlightedHref, setHighlightedHref] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); }, []);

  // Fetch current user + role
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUsername(d.user.username);
          setRole((d.user.role as Role) ?? 'admin');
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Pending claims badge
  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/claims?status=pending');
        if (!res.ok) return;
        const data = await res.json();
        setPendingCount((data.claims ?? []).length);
      } catch { /* ignore */ }
    }
    fetchPending();
    const interval = setInterval(fetchPending, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Unresolved high-severity fraud alerts badge (admin only)
  useEffect(() => {
    if (role !== 'admin') { setHighFraudCount(0); return; }
    async function fetchFraud() {
      try {
        const res = await fetch('/api/admin/fraud-alerts?resolved=false');
        if (!res.ok) return;
        const data = await res.json();
        const highCount = (data.alerts ?? []).filter((a: { severity: string }) => a.severity === 'high').length;
        setHighFraudCount(highCount);
      } catch { /* ignore */ }
    }
    fetchFraud();
    const interval = setInterval(fetchFraud, 60_000);
    return () => clearInterval(interval);
  }, [role]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  // Compute visible sections based on role
  let visibleSections: SectionDef[];

  if (role === 'cajero') {
    visibleSections = [
      {
        key: 'PRINCIPAL',
        label: 'Principal',
        roles: ['cajero'],
        groupIcon: GroupIcons.principal,
        accent: '#F97316',
        links: CAJERO_LINKS,
      },
    ];
  } else {
    visibleSections = ALL_SECTIONS
      .filter((s) => s.roles.includes(role))
      .map((s) => {
        if (role === 'manager' && s.key === 'CONFIGURACION') {
          return { ...s, links: s.links.filter((l) => !MANAGER_HIDDEN_LINKS.includes(l.href)) };
        }
        return s;
      });
  }

  // Accordion: only one section open at a time. Defaults to whichever section
  // contains the current route, falling back to the last section the user had
  // open (persisted), falling back to the first visible section.
  const [openSection, setOpenSection] = useState<string | null>(() => {
    return sectionForPathname(visibleSections, pathname) ?? loadStoredOpenSection() ?? visibleSections[0]?.key ?? null;
  });

  // Re-sync the open section whenever navigation lands on a route belonging
  // to a different section (e.g. user clicked a link, or used global search).
  useEffect(() => {
    const match = sectionForPathname(visibleSections, pathname);
    if (match) setOpenSection(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleSection(key: string) {
    setOpenSection((prev) => {
      const next = prev === key ? null : key;
      saveStoredOpenSection(next);
      return next;
    });
  }

  // Called when a global-search result is picked: jump straight to the
  // section that owns it and briefly highlight the matching link.
  function handleSearchSelect(item: SearchResult) {
    const sectionKey = TYPE_TO_SECTION[item.type];
    if (sectionKey) {
      setOpenSection(sectionKey);
      saveStoredOpenSection(sectionKey);
    }
    setHighlightedHref(item.href);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedHref(null), 2000);
  }

  // Badges shown on collapsed group headers (real counts only — no invented data)
  const sectionBadges: Record<string, number> = { PREMIOS: pendingCount };
  // Per-link badge: unresolved HIGH severity fraud alerts on the Fraude page link
  const linkBadges: Record<string, number> = { '/admin/fraude': highFraudCount };

  return (
    <div className="flex flex-col h-full" onClick={onLinkClick ? undefined : undefined}>
      {/* Logo header */}
      <div className={`border-b-2 border-black flex items-center ${compact ? 'flex-col gap-2 px-2 py-2 justify-center' : 'px-4 py-3 justify-between'}`}>
        <Link href="/admin" className="flex items-center gap-2 min-w-0" onClick={onLinkClick}>
          <div className="shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-3e-oficial.webp" alt="3E" width={compact ? 36 : 44} height={compact ? 36 : 44} style={{ objectFit: 'contain', display: 'block' }} />
          </div>
        </Link>
        <div className={`flex items-center gap-1 ${compact ? 'flex-col' : ''}`}>
          {!compact && <NotificationBell />}
          <Link
            href="/admin/registros?status=pending"
            onClick={onLinkClick}
            aria-label="Cobros pendientes"
            className="relative p-1.5 rounded-lg text-stone-700 hover:text-[#1a6b3c] hover:bg-black/6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </Link>
          {onToggleCompact && (
            <button
              onClick={onToggleCompact}
              title={compact ? 'Expandir menú' : 'Modo compacto'}
              className="hidden md:flex p-1.5 rounded-lg text-stone-700 hover:text-[#1a6b3c] hover:bg-black/6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: compact ? 'rotate(180deg)' : 'none' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {compact ? (
        /* ── Compact rail: icons only, hover for a flyout with full labels ── */
        <nav className="flex-1 px-1.5 py-2 overflow-y-auto overflow-x-visible">
          {visibleSections.map((section) => (
            <CompactGroupIcon
              key={section.key}
              section={section}
              hasActiveLink={sectionForPathname([section], pathname) === section.key}
              badge={sectionBadges[section.key]}
            />
          ))}
        </nav>
      ) : (
        <>
          {/* Global data search */}
          <GlobalSearch onSelect={handleSearchSelect} />

          {/* Nav sections — favorites strip + accordion (one group open at a time) */}
          <nav
            className="flex-1 px-2.5 py-2 overflow-y-auto"
            onClick={onLinkClick ? (e) => { if ((e.target as HTMLElement).closest('a')) onLinkClick(); } : undefined}
          >
            <FavoritesStrip hrefs={favorites} highlightedHref={highlightedHref} onToggleFavorite={toggleFavorite} />
            {visibleSections.map((section, index) => (
              <div key={section.key} className="sidebar-group-enter" style={{ animationDelay: `${index * 40}ms` }}>
                <AccordionSection
                  section={section}
                  isOpen={openSection === section.key}
                  hasActiveLink={sectionForPathname([section], pathname) === section.key}
                  onToggle={() => toggleSection(section.key)}
                  badge={sectionBadges[section.key]}
                  favorites={favoritesSet}
                  onToggleFavorite={toggleFavorite}
                  highlightedHref={highlightedHref}
                  linkBadges={linkBadges}
                />
              </div>
            ))}
          </nav>
        </>
      )}

      {/* User footer */}
      {username && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid #e5e7eb' }}>
          {!compact && (
            <div className="flex items-center gap-2 px-2 py-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
              <span className="text-xs font-semibold truncate" style={{ color: '#111111' }}>{username}</span>
              <span className="ml-auto text-[9px] font-bold tracking-wide uppercase" style={{ color: 'rgba(100,116,139,0.6)' }}>{role}</span>
            </div>
          )}
          <div className={`flex gap-1.5 ${compact ? 'flex-col items-center' : ''}`}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Cerrar sesion"
              className={`flex items-center gap-2 rounded-lg text-xs font-medium transition-all ${compact ? 'p-1.5' : 'flex-1 px-3 py-1.5'}`}
              style={{ color: '#111111', border: '1px solid #e5e7eb' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#111111'; (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.06)'; }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!compact && (loggingOut ? 'Saliendo...' : 'Cerrar sesion')}
            </button>
            <button
              onClick={toggleDark}
              title={dark ? 'Modo claro' : 'Modo oscuro'}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#64748b', border: '1px solid #e5e7eb' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#111111'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; (e.currentTarget as HTMLButtonElement).style.background = ''; }}
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default export ────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Restore compact preference on mount and reflect it on <html> so
  // app/globals.css can shift .admin-content's margin-left to match.
  useEffect(() => {
    const stored = loadCompact();
    setCompact(stored);
    document.documentElement.classList.toggle('sidebar-compact', stored);
  }, []);

  function handleToggleCompact() {
    setCompact((prev) => {
      const next = !prev;
      saveCompact(next);
      return next;
    });
  }

  return (
    <>
      {/* Desktop sidebar — 240px expanded, 64px compact (icon rail) */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-full flex-col z-40 transition-[width] duration-200 ${compact ? 'w-16' : 'w-[240px]'}`}
        style={{ background: '#ffffff', borderRight: '2px solid #000000' }}>
        <SidebarContent compact={compact} onToggleCompact={handleToggleCompact} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 bg-white overflow-hidden" style={{ borderBottom: '2px solid #000000', width: '100vw' }}>
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-3e-oficial.webp" alt="3E" width={40} height={40} style={{ objectFit: 'contain', display: 'block' }} />
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg text-black hover:bg-stone-100 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed left-0 top-0 h-full w-[240px] z-50 flex flex-col shadow-xl"
            style={{ background: '#ffffff', borderRight: '2px solid #000000' }}>
            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
