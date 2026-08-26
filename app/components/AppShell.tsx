'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import BottomNav from './BottomNav';
import { ErrorBoundary } from './ErrorBoundary';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isStandaloneAuthPage = pathname === '/admin/login' || pathname === '/admin/forgot-password' || pathname === '/admin/reset-password';
  // Scanned from a phone camera (QR sticker on a physical inventory unit) —
  // needs a minimal mobile-first page, not the full desktop sidebar shell.
  const isInventoryUnitPage = pathname.startsWith('/admin/inventario/unidad/');
  const isAdminPage = pathname.startsWith('/admin') && !isStandaloneAuthPage && !isInventoryUnitPage;
  const isCajeroPage = pathname.startsWith('/cajero');
  const isEmpleadosPage = pathname.startsWith('/empleados');

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

  if (isStandaloneAuthPage || isInventoryUnitPage || isEmpleadosPage) {
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
