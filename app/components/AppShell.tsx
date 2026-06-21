'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import BottomNav from './BottomNav';
import { ErrorBoundary } from './ErrorBoundary';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdminLogin = pathname === '/admin/login';
  const isAdminPage = pathname.startsWith('/admin') && !isAdminLogin;
  const isCajeroPage = pathname.startsWith('/cajero');

  if (isAdminPage) {
    return (
      <div style={{ display: 'flex', minHeight: '100%' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 admin-content admin-bg" style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
          <ErrorBoundary><PageTransition>{children}</PageTransition></ErrorBoundary>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (isCajeroPage) {
    return (
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }

  if (isAdminLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Navbar />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
