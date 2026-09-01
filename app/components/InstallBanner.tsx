'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Already running as standalone (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    // Dismissed before
    if (localStorage.getItem('pwa-dismissed') === '1') {
      setDismissed(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1');
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  }

  if (installed || dismissed || !prompt) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff', border: '2px solid #111', borderRadius: 12,
      boxShadow: '4px 4px 0 #111', padding: '12px 16px', maxWidth: 360, width: 'calc(100% - 32px)',
    }}>
      <img src="/icon-192.png" alt="3E" style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #eee' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Instalar 3E Plataforma</div>
        <div style={{ fontSize: 12, color: '#666' }}>Agregar al escritorio como app</div>
      </div>
      <button onClick={install} style={{
        background: '#111', color: '#fff', border: 'none', borderRadius: 8,
        padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Instalar</button>
      <button onClick={dismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999', lineHeight: 1,
      }}>×</button>
    </div>
  );
}
