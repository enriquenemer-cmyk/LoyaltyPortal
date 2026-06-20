'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdminLogin = pathname === '/admin/login';
  const isAdminPage = pathname.startsWith('/admin') && !isAdminLogin;
  const isCajeroPage = pathname.startsWith('/cajero');

  if (isAdminPage) {
    return (
      <div className="flex min-h-full">
        <Sidebar />
        <main className="flex-1 min-w-0 md:ml-[240px] pt-12 md:pt-0 admin-bg min-h-screen">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    );
  }

  if (isCajeroPage) {
    return (
      <>
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
      </>
    );
  }

  // Login page — full screen, no navbar
  if (isAdminLogin) {
    return <>{children}</>;
  }

  // Default: premio, verificar, home, etc.
  return (
    <div className="flex flex-col min-h-full">
      <Navbar />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
