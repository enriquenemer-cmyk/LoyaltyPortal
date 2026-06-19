'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import NotificationBell from './NotificationBell';

// ── Types ────────────────────────────────────────────────────────────────────
type SearchResult = {
  id: string;
  type: 'claim' | 'prize' | 'restaurant' | 'user';
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
  automatizacion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
  corporativo: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a9 9 0 0118 0M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6M3 6h18M9 10h.01M15 10h.01M9 14h6" />
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

// ── Nav sections definition ──────────────────────────────────────────────────
const ALL_SECTIONS: SectionDef[] = [
  {
    key: 'PRINCIPAL',
    label: 'PRINCIPAL',
    roles: ['admin', 'manager', 'cajero'],
    links: [
      { href: '/admin', label: 'Dashboard', exact: true, icon: Icons.dashboard },
      { href: '/admin/generate', label: 'Generar Premio', icon: Icons.generate },
    ],
  },
  {
    key: 'PREMIOS',
    label: 'PREMIOS',
    roles: ['admin', 'manager'],
    links: [
      { href: '/admin/premios', label: 'Mis Premios', icon: Icons.premios },
      { href: '/admin/registros', label: 'Registros de Cobro', icon: Icons.registros },
      { href: '/admin/reglas', label: 'Premios Automaticos', icon: Icons.reglas },
      { href: '/admin/campanas', label: 'Campanas', icon: Icons.campanas },
    ],
  },
  {
    key: 'CLIENTES',
    label: 'CLIENTES',
    roles: ['admin', 'manager'],
    links: [
      { href: '/admin/clientes', label: 'Base de Clientes', icon: Icons.clientes },
      { href: '/admin/cumpleanos', label: 'Puntos y Sellos', icon: Icons.puntos },
      { href: '/admin/automatizacion', label: 'Automatizacion', icon: Icons.automatizacion },
      { href: '/admin/misiones', label: 'Misiones Semanales', icon: Icons.misiones },
      { href: '/admin/feedback', label: 'Feedback / NPS', icon: Icons.feedback },
    ],
  },
  {
    key: 'JUEGOS Y TICKETS',
    label: 'JUEGOS Y TICKETS',
    roles: ['admin', 'manager'],
    links: [
      { href: '/admin/game-bundles', label: 'Juegos con Premios', icon: Icons.juegos },
      { href: '/admin/ticket-tiers', label: 'Premio por Consumo', icon: Icons.ticket },
      { href: '/cajero/escanear', label: 'Verificar Codigo', icon: Icons.scan },
    ],
  },
  {
    key: 'RESTAURANTES',
    label: 'RESTAURANTES',
    roles: ['admin', 'manager'],
    links: [
      { href: '/admin/restaurantes', label: 'Mis Restaurantes', icon: Icons.restaurantes },
      { href: '/admin/rendimiento', label: 'Rendimiento del Equipo', icon: Icons.rendimiento },
      { href: '/admin/eventos', label: 'Eventos Especiales', icon: Icons.eventos },
      { href: '/admin/flash', label: 'Campana Flash', icon: Icons.flash },
    ],
  },
  {
    key: 'REPORTES',
    label: 'REPORTES',
    roles: ['admin'],
    links: [
      { href: '/admin/corporativo', label: 'Vista Corporativa', icon: Icons.corporativo },
      { href: '/admin/analitica', label: 'Analitica Avanzada', icon: Icons.analitica },
      { href: '/admin/reporte', label: 'Reportes', icon: Icons.reportes },
      { href: '/admin/seguridad', label: 'Seguridad y Accesos', icon: Icons.seguridad },
      { href: '/admin/suscripciones', label: 'Suscripcion VIP', icon: Icons.suscripcion },
      { href: '/admin/gift-cards', label: 'Gift Cards', icon: Icons.giftcards },
    ],
  },
  {
    key: 'CONFIGURACION',
    label: 'CONFIGURACION',
    roles: ['admin'],
    links: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: Icons.usuarios },
      { href: '/admin/webhooks', label: 'Webhooks', icon: Icons.webhooks },
      { href: '/admin/api-docs', label: 'API Docs', icon: Icons.apidocs },
      { href: '/admin/sistema', label: 'Sistema', icon: Icons.sistema },
    ],
  },
];

// Cajero links
const CAJERO_LINKS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true, icon: Icons.dashboard },
  { href: '/admin/registros', label: 'Registros de Cobro', icon: Icons.registros },
];

// Manager hidden links in CONFIGURACION
const MANAGER_HIDDEN_LINKS = ['/admin/usuarios', '/admin/webhooks'];

// Sections collapsed by default
function getDefaultCollapsed(): Record<string, boolean> {
  return {
    PRINCIPAL: false,
    PREMIOS: false,
    CLIENTES: false,
    'JUEGOS Y TICKETS': false,
    RESTAURANTES: false,
    REPORTES: false,
    CONFIGURACION: true,
  };
}

// ── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=13`);
      const combined: SearchResult[] = [];
      if (res.ok) {
        const d = await res.json();
        for (const c of (d.clients ?? []))
          combined.push({ id: c.id, type: 'claim', title: c.full_name ?? c.id, subtitle: c.prize_name, href: `/admin/cliente/${encodeURIComponent(c.phone)}` });
        for (const p of (d.prizes ?? []))
          combined.push({ id: p.id, type: 'prize', title: p.name ?? p.id, subtitle: p.restaurant_name, href: '/admin/premios' });
        for (const r of (d.restaurants ?? []))
          combined.push({ id: r.id, type: 'restaurant', title: r.name ?? r.id, href: `/admin/restaurantes/${r.id}` });
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

  const typeLabel: Record<SearchResult['type'], string> = {
    claim: 'Cobro', prize: 'Premio', restaurant: 'Restaurante', user: 'Usuario',
  };
  const typeColor: Record<SearchResult['type'], string> = {
    claim: 'bg-blue-50 text-blue-600', prize: 'bg-blue-50 text-blue-600',
    restaurant: 'bg-emerald-50 text-emerald-600', user: 'bg-purple-50 text-purple-600',
  };

  const showDropdown = focused && (results.length > 0 || (query === '' && recent.length > 0) || loading);

  return (
    <div className="px-3 py-2 border-b border-[#E8E3DC]">
      <div className="relative">
        <div className="relative flex items-center">
          {loading ? (
            <svg className="absolute left-2.5 w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="absolute left-2.5 w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E3DC] rounded-lg text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
          />
        </div>
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E8E3DC] rounded-xl shadow-lg z-50 overflow-hidden"
            style={{ boxShadow: '0 4px 24px rgba(28,25,23,0.12)' }}>
            {query === '' && recent.length > 0 && (
              <div>
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold tracking-widest text-stone-400 uppercase">Busquedas recientes</p>
                {recent.map((q) => (
                  <button key={q} onMouseDown={() => selectRecent(q)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-600 hover:bg-[#FAFAF9] transition-colors text-left">
                    <svg className="w-3 h-3 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {results.length > 0 && (
              <div>
                {query !== '' && recent.length > 0 && <div className="border-t border-[#E8E3DC]" />}
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold tracking-widest text-stone-400 uppercase">Resultados</p>
                {results.map((item, idx) => (
                  <button key={item.id + item.type} onMouseDown={() => selectResult(item)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${idx === activeIdx ? 'bg-blue-50' : 'hover:bg-[#FAFAF9]'}`}>
                    <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${typeColor[item.type]}`}>
                      {typeLabel[item.type]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1C1917] truncate">{item.title}</p>
                      {item.subtitle && <p className="text-[10px] text-stone-400 truncate">{item.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!loading && query !== '' && results.length === 0 && (
              <p className="px-3 py-3 text-xs text-stone-400 text-center">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single nav link ──────────────────────────────────────────────────────────
function NavLink({ href, label, icon, exact }: NavItem) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border-l-2 ${
        isActive
          ? 'text-[#2563EB] font-semibold border-[#2563EB] pl-[10px] bg-blue-50/50'
          : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3F0] border-transparent pl-[10px]'
      }`}
    >
      <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
      <span className="truncate text-xs">{label}</span>
    </Link>
  );
}

// ── Nav section with always-visible header ───────────────────────────────────
function NavSection({ section }: { section: SectionDef }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-3 py-2">
        {section.label}
      </p>
      <div className="space-y-0.5">
        {section.links.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </div>
    </div>
  );
}

// ── Logo ─────────────────────────────────────────────────────────────────────
const LOGO = (
  <div className="shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="52" height="47">
      <line x1="30" y1="28" x2="170" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.25"/>
      <text x="100" y="120" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="400" fontSize="100" fill="currentColor" letterSpacing="14">ST</text>
      <line x1="30" y1="132" x2="170" y2="132" stroke="currentColor" strokeWidth="1.5" opacity="0.25"/>
    </svg>
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
function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('admin');
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { dark, toggle: toggleDark } = useDarkMode();

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
        label: 'PRINCIPAL',
        roles: ['cajero'],
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

  // Sections with default collapsed state (only CONFIGURACION starts collapsed)
  const defaultCollapsed = getDefaultCollapsed();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(defaultCollapsed);

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col h-full" onClick={onLinkClick ? undefined : undefined}>
      {/* Logo header */}
      <div className="px-3 py-3 border-b border-[#E8E3DC] flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2" onClick={onLinkClick}>
          {LOGO}
          <span className="text-xs font-extrabold text-[#1C1917] tracking-tight leading-none">Super Tierra</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link
            href="/admin/registros?status=pending"
            onClick={onLinkClick}
            aria-label="Cobros pendientes"
            className="relative p-1.5 rounded-lg text-stone-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
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
        </div>
      </div>

      {/* Global data search */}
      <GlobalSearch />

      {/* Nav sections */}
      <nav
        className="flex-1 px-3 py-2 overflow-y-auto space-y-1"
        onClick={onLinkClick ? (e) => { if ((e.target as HTMLElement).closest('a')) onLinkClick(); } : undefined}
      >
        {visibleSections.map((section) => {
          // CONFIGURACION is collapsible; all others are always expanded
          if (section.key === 'CONFIGURACION') {
            const isCollapsed = collapsed['CONFIGURACION'] ?? true;
            return (
              <div key={section.key}>
                <button
                  onClick={() => toggleSection('CONFIGURACION')}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <span>{section.label}</span>
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {section.links.map((link) => (
                      <NavLink key={link.href} {...link} />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return <NavSection key={section.key} section={section} />;
        })}
      </nav>

      {/* User footer */}
      {username && (
        <div className="px-3 py-2 border-t border-[#E8E3DC]">
          <div className="flex items-center gap-2 px-2 py-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-stone-500 truncate">{username}</span>
            <span className="ml-auto text-[9px] font-bold tracking-wide text-stone-300 uppercase">{role}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {loggingOut ? 'Saliendo...' : 'Cerrar sesion'}
            </button>
            <button
              onClick={toggleDark}
              title={dark ? 'Modo claro' : 'Modo oscuro'}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 border border-transparent transition-all"
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
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Desktop sidebar — max-w-[240px] */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[240px] bg-white border-r border-[#E8E3DC] flex-col z-40">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-[#E8E3DC] flex items-center justify-between px-4 z-40">
        <Link href="/admin" className="flex items-center gap-2.5">
          {LOGO}
          <span className="text-sm font-extrabold text-[#1C1917] tracking-tight leading-none">Super Tierra</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg text-stone-500 hover:bg-stone-50 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed left-0 top-0 h-full w-[240px] bg-white border-r border-[#E8E3DC] z-50 flex flex-col shadow-xl">
            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
