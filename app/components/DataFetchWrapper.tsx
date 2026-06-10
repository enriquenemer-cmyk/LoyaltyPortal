'use client';

import { useState, useCallback } from 'react';

interface DataFetchWrapperProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
  skeletonRows?: number;
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center animate-pulse">
          <div className="w-10 h-10 rounded-full bg-stone-100 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 bg-stone-100 rounded w-3/4" />
            <div className="h-2.5 bg-stone-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DataFetchWrapper({
  loading,
  error,
  onRetry,
  children,
  skeletonRows = 3,
}: DataFetchWrapperProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
        <Skeleton rows={skeletonRows} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-stone-800 mb-1">No se pudo cargar la información</h3>
          <p className="text-sm text-stone-500">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
