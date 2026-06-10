'use client';

import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      style={{
        backgroundColor: dark ? '#3b4d6b' : '#d1d5db',
      }}
    >
      {/* Track icons */}
      <span className="absolute left-1 flex items-center justify-center w-4 h-4 pointer-events-none select-none">
        {/* Moon — visible in light mode (left side) */}
        <svg
          className="w-2.5 h-2.5 transition-opacity duration-300"
          style={{ opacity: dark ? 0 : 0.5 }}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </span>
      <span className="absolute right-1 flex items-center justify-center w-4 h-4 pointer-events-none select-none">
        {/* Sun — visible in dark mode (right side) */}
        <svg
          className="w-2.5 h-2.5 text-yellow-300 transition-opacity duration-300"
          style={{ opacity: dark ? 0.8 : 0 }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </span>

      {/* Sliding circle */}
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out"
        style={{
          transform: dark ? 'translateX(24px)' : 'translateX(0)',
          boxShadow: dark
            ? '0 1px 4px rgba(0,0,0,0.4)'
            : '0 1px 3px rgba(0,0,0,0.2)',
        }}
        aria-hidden="true"
      />
    </button>
  );
}
