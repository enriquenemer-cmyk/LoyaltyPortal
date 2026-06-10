'use client';

import React from 'react';

type EmptyStateType = 'no-claims' | 'no-prizes' | 'no-restaurants' | 'no-clients' | 'no-results';

interface EmptyStateProps {
  type: EmptyStateType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

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
      <circle cx="84" cy="68" r="14" fill="#FFF2ED" stroke="#2563EB" strokeWidth="1.5" />
      <path d="M78 62 L90 74 M90 62 L78 74" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function NoPrizesIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Gift box bottom */}
      <rect x="20" y="48" width="80" height="38" rx="5" fill="#FFF2ED" stroke="#2563EB" strokeWidth="1.5" />
      {/* Gift box lid */}
      <rect x="16" y="36" width="88" height="16" rx="5" fill="#FFF2ED" stroke="#2563EB" strokeWidth="1.5" />
      {/* Ribbon vertical */}
      <rect x="54" y="36" width="12" height="50" rx="3" fill="#2563EB" opacity="0.25" />
      {/* Ribbon horizontal */}
      <rect x="16" y="40" width="88" height="10" rx="3" fill="#2563EB" opacity="0.25" />
      {/* Bow left loop */}
      <path d="M60 36 C52 28 38 28 40 36" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Bow right loop */}
      <path d="M60 36 C68 28 82 28 80 36" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Question mark */}
      <text x="60" y="73" textAnchor="middle" fontSize="20" fill="#2563EB" fontWeight="800" fontFamily="sans-serif" opacity="0.7">?</text>
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
      <path d="M42 60 L78 60 L80 54 L40 54 Z" fill="#2563EB" opacity="0.2" />
      <line x1="40" y1="54" x2="80" y2="54" stroke="#2563EB" strokeWidth="1.5" opacity="0.4" />
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
      <path d="M42 36 L58 52 M58 36 L42 52" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
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

export function EmptyState({ type, title, subtitle, action }: EmptyStateProps) {
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
