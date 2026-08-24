'use client';

import React from 'react';
import Link from 'next/link';

type EmptyStateType = 'no-claims' | 'no-prizes' | 'no-restaurants' | 'no-clients' | 'no-results';

// Legacy props (type-based)
interface EmptyStateLegacyProps {
  type: EmptyStateType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  // icon must be absent to disambiguate
  icon?: never;
}

// New icon-based props
type EmptyStateIcon = 'gift' | 'users' | 'clipboard' | 'chart' | 'search' | 'star';

interface EmptyStateIconProps {
  icon: EmptyStateIcon;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
  // type must be absent to disambiguate
  type?: never;
}

type EmptyStateProps = EmptyStateLegacyProps | EmptyStateIconProps;

function NoClaimsIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Clipboard body */}
      <rect x="22" y="18" width="76" height="62" rx="6" fill="#F5F0EA" stroke="#E8E3DC" strokeWidth="1.5" />
      {/* Clipboard clip */}
      <rect x="42" y="12" width="36" height="14" rx="5" fill="#E8E3DC" />
      <rect x="48" y="14" width="24" height="10" rx="3" fill="#D6CFC6" />
      {/* Lines on clipboard */}
      <rect x="34" y="36" width="52" height="4" rx="2" fill="#E8E3DC" />
      <rect x="34" y="46" width="40" height="4" rx="2" fill="#E8E3DC" />
      <rect x="34" y="56" width="44" height="4" rx="2" fill="#E8E3DC" />
      {/* Orange X mark */}
      <circle cx="84" cy="68" r="14" fill="#FFF2ED" stroke="#F97316" strokeWidth="1.5" />
      <path d="M78 62 L90 74 M90 62 L78 74" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function NoPrizesIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Gift box bottom */}
      <rect x="20" y="48" width="80" height="38" rx="5" fill="#FFF2ED" stroke="#F97316" strokeWidth="1.5" />
      {/* Gift box lid */}
      <rect x="16" y="36" width="88" height="16" rx="5" fill="#FFF2ED" stroke="#F97316" strokeWidth="1.5" />
      {/* Ribbon vertical */}
      <rect x="54" y="36" width="12" height="50" rx="3" fill="#F97316" opacity="0.25" />
      {/* Ribbon horizontal */}
      <rect x="16" y="40" width="88" height="10" rx="3" fill="#F97316" opacity="0.25" />
      {/* Bow left loop */}
      <path d="M60 36 C52 28 38 28 40 36" stroke="#F97316" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Bow right loop */}
      <path d="M60 36 C68 28 82 28 80 36" stroke="#F97316" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Question mark */}
      <text x="60" y="73" textAnchor="middle" fontSize="20" fill="#F97316" fontWeight="800" fontFamily="sans-serif" opacity="0.7">?</text>
    </svg>
  );
}

function NoRestaurantsIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Ground */}
      <rect x="10" y="82" width="100" height="6" rx="3" fill="#F0EDE8" />
      {/* Building body */}
      <rect x="24" y="34" width="72" height="50" rx="4" fill="#F5F0EA" stroke="#E8E3DC" strokeWidth="1.5" />
      {/* Roof triangle */}
      <path d="M16 38 L60 10 L104 38" stroke="#D6CFC6" strokeWidth="2" fill="#F0EDE8" strokeLinejoin="round" />
      {/* Door */}
      <rect x="48" y="60" width="24" height="24" rx="3" fill="#E8E3DC" />
      <circle cx="69" cy="73" r="2" fill="#A8A29E" />
      {/* Left window */}
      <rect x="30" y="44" width="18" height="14" rx="2" fill="#fff" stroke="#E8E3DC" strokeWidth="1" />
      <line x1="39" y1="44" x2="39" y2="58" stroke="#E8E3DC" strokeWidth="1" />
      <line x1="30" y1="51" x2="48" y2="51" stroke="#E8E3DC" strokeWidth="1" />
      {/* Right window */}
      <rect x="72" y="44" width="18" height="14" rx="2" fill="#fff" stroke="#E8E3DC" strokeWidth="1" />
      <line x1="81" y1="44" x2="81" y2="58" stroke="#E8E3DC" strokeWidth="1" />
      <line x1="72" y1="51" x2="90" y2="51" stroke="#E8E3DC" strokeWidth="1" />
      {/* Awning */}
      <path d="M42 60 L78 60 L80 54 L40 54 Z" fill="#F97316" opacity="0.2" />
      <line x1="40" y1="54" x2="80" y2="54" stroke="#F97316" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

function NoClientsIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Person head */}
      <circle cx="50" cy="28" r="16" fill="#F0EDE8" stroke="#D6CFC6" strokeWidth="1.5" />
      {/* Person body */}
      <path d="M22 78 C22 60 78 60 78 78" fill="#F0EDE8" stroke="#D6CFC6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Face features */}
      <circle cx="44" cy="26" r="2" fill="#A8A29E" />
      <circle cx="56" cy="26" r="2" fill="#A8A29E" />
      <path d="M44 34 Q50 38 56 34" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Speech bubble */}
      <rect x="64" y="10" width="46" height="34" rx="8" fill="#fff" stroke="#E8E3DC" strokeWidth="1.5" />
      <path d="M72 44 L66 52 L80 44" fill="#fff" stroke="#E8E3DC" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Empty bubble dots */}
      <circle cx="78" cy="27" r="3" fill="#E8E3DC" />
      <circle cx="87" cy="27" r="3" fill="#E8E3DC" />
      <circle cx="96" cy="27" r="3" fill="#E8E3DC" />
    </svg>
  );
}

function NoResultsIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Magnifying glass circle */}
      <circle cx="50" cy="44" r="30" fill="#F5F0EA" stroke="#D6CFC6" strokeWidth="2" />
      <circle cx="50" cy="44" r="22" fill="#fff" stroke="#E8E3DC" strokeWidth="1.5" />
      {/* Handle */}
      <line x1="72" y1="66" x2="94" y2="86" stroke="#D6CFC6" strokeWidth="5" strokeLinecap="round" />
      <line x1="72" y1="66" x2="94" y2="86" stroke="#E8E3DC" strokeWidth="3" strokeLinecap="round" />
      {/* Nothing inside — faint X */}
      <path d="M42 36 L58 52 M58 36 L42 52" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

const illustrations: Record<EmptyStateType, React.FC> = {
  'no-claims': NoClaimsIllustration,
  'no-prizes': NoPrizesIllustration,
  'no-restaurants': NoRestaurantsIllustration,
  'no-clients': NoClientsIllustration,
  'no-results': NoResultsIllustration,
};

// --- Icon SVGs for new API ---

function IconGift() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      {/* Soft background blob */}
      <circle cx="36" cy="36" r="32" fill="#F97316" opacity="0.07" />
      <circle cx="36" cy="36" r="22" fill="#1a6b3c" opacity="0.06" />
      {/* Main gift icon, duotone */}
      <g transform="translate(18,16)">
        <path d="M2 13h32v22H2z" fill="#F97316" opacity="0.12" />
        <polyline points="30 18 30 33 6 33 6 18" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2" y="11" width="32" height="7" rx="1.5" fill="#F97316" opacity="0.18" stroke="#F97316" strokeWidth="1.8" strokeLinejoin="round" />
        <line x1="18" y1="33" x2="18" y2="11" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18 11h-6.5a3.5 3.5 0 010-7C16 4 18 11 18 11z" fill="#1a6b3c" opacity="0.15" stroke="#1a6b3c" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M18 11h6.5a3.5 3.5 0 000-7C20 4 18 11 18 11z" fill="#1a6b3c" opacity="0.15" stroke="#1a6b3c" strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      {/* Decorative sparkles */}
      <circle cx="56" cy="20" r="2.5" fill="#F97316" opacity="0.5" />
      <circle cx="14" cy="50" r="2" fill="#1a6b3c" opacity="0.4" />
      <path d="M58 50l2 2-2 2-2-2z" fill="#F97316" opacity="0.35" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="#F97316" opacity="0.07" />
      <circle cx="36" cy="36" r="22" fill="#F97316" opacity="0.06" />
      <g transform="translate(16,18)">
        <circle cx="14" cy="9" r="7" fill="#F97316" opacity="0.15" stroke="#F97316" strokeWidth="1.8" />
        <path d="M27 35v-3a6 6 0 00-6-6H7a6 6 0 00-6 6v3" fill="#F97316" opacity="0.1" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 35v-3a6 6 0 00-4.5-5.8" stroke="#1a6b3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 2.2a7 7 0 010 13.6" stroke="#1a6b3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle cx="58" cy="18" r="2.5" fill="#1a6b3c" opacity="0.45" />
      <circle cx="13" cy="52" r="2" fill="#F97316" opacity="0.5" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="#F97316" opacity="0.07" />
      <circle cx="36" cy="36" r="22" fill="#F97316" opacity="0.06" />
      <g transform="translate(20,14)">
        <path d="M16 4h2a2 2 0 012 2v26a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
          fill="#F97316" opacity="0.1" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="8" y="2" width="8" height="4" rx="1" fill="#F97316" opacity="0.2" stroke="#F97316" strokeWidth="1.8" />
        <line x1="9" y1="14" x2="15" y2="14" stroke="#1a6b3c" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="9" y1="19" x2="13" y2="19" stroke="#1a6b3c" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <path d="M56 48l2 2-2 2-2-2z" fill="#F97316" opacity="0.4" />
      <circle cx="14" cy="50" r="2.2" fill="#F97316" opacity="0.45" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="#F97316" opacity="0.07" />
      <circle cx="36" cy="36" r="22" fill="#F97316" opacity="0.06" />
      <g transform="translate(18,18)">
        <rect x="2" y="22" width="6" height="14" rx="1.5" fill="#F97316" opacity="0.18" stroke="#F97316" strokeWidth="1.8" />
        <rect x="14" y="12" width="6" height="24" rx="1.5" fill="#F97316" opacity="0.18" stroke="#F97316" strokeWidth="1.8" />
        <rect x="26" y="2" width="6" height="34" rx="1.5" fill="#1a6b3c" opacity="0.18" stroke="#1a6b3c" strokeWidth="1.8" />
      </g>
      <circle cx="56" cy="20" r="2.3" fill="#1a6b3c" opacity="0.4" />
      <circle cx="14" cy="50" r="2" fill="#F97316" opacity="0.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="#F97316" opacity="0.07" />
      <circle cx="36" cy="36" r="22" fill="#F97316" opacity="0.06" />
      <g transform="translate(18,18)">
        <circle cx="15" cy="15" r="11" fill="#F97316" opacity="0.12" stroke="#F97316" strokeWidth="1.8" />
        <line x1="29" y1="29" x2="35" y2="35" stroke="#1a6b3c" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <circle cx="56" cy="50" r="2.2" fill="#1a6b3c" opacity="0.4" />
      <circle cx="14" cy="50" r="2" fill="#F97316" opacity="0.5" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="#1a6b3c" opacity="0.07" />
      <circle cx="36" cy="36" r="22" fill="#F97316" opacity="0.06" />
      <g transform="translate(16,16)">
        <polygon points="20 3 25.15 13.77 37 15.45 28.5 23.57 30.55 35.35 20 29.77 9.45 35.35 11.5 23.57 3 15.45 14.85 13.77"
          fill="#F97316" opacity="0.15" stroke="#F97316" strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      <circle cx="56" cy="20" r="2.3" fill="#F97316" opacity="0.45" />
      <path d="M14 52l2 2-2 2-2-2z" fill="#1a6b3c" opacity="0.4" />
    </svg>
  );
}

const iconComponents: Record<EmptyStateIcon, React.FC> = {
  gift: IconGift,
  users: IconUsers,
  clipboard: IconClipboard,
  chart: IconChart,
  search: IconSearch,
  star: IconStar,
};

export function EmptyState(props: EmptyStateProps) {
  // New icon-based API
  if ('icon' in props && props.icon) {
    const { icon, title, description, action } = props;
    const IconComp = iconComponents[icon];
    return (
      <div
        className="flex flex-col items-center justify-center py-16 px-6 text-center"
        style={{ animation: 'fadeInUp 0.4s ease both' }}
      >
        <div className="mb-5 inline-flex items-center justify-center">
          <IconComp />
        </div>
        <p className="text-slate-800 font-bold text-lg mb-2">{title}</p>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">{description}</p>
        {action && (
          <div className="mt-5">
            {action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', boxShadow: '0 4px 14px rgba(249,115,22,0.30)' }}
              >
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', boxShadow: '0 4px 14px rgba(249,115,22,0.30)' }}
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Legacy type-based API
  const { type, title, subtitle, action } = props as EmptyStateLegacyProps;
  const Illustration = illustrations[type];

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-12 flex flex-col items-center text-center">
      <div className="mb-6">
        <Illustration />
      </div>
      <p className="font-bold text-[#1C1917] text-base">{title}</p>
      {subtitle && (
        <p className="text-stone-400 text-sm mt-2 max-w-xs leading-relaxed">{subtitle}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
