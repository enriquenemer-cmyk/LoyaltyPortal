import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

// Routes accessible by any authenticated role
const ANY_ROLE_ROUTES = ['/admin/registros', '/admin/clientes'];

// Routes restricted to admin + manager
const MANAGER_ROUTES = ['/admin/generate', '/admin/premios', '/admin/campanas', '/admin/reglas'];

// Routes restricted to admin only
const ADMIN_ONLY_ROUTES = ['/admin/restaurantes', '/admin/usuarios', '/admin/seguridad'];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API routes are never protected by this middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Login page is always accessible
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Guard against missing or weak SESSION_SECRET
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('error', 'misconfiguration');
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(request, res, sessionOptions);

  if (!session.username) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const role = session.role;

  // Admin-only routes
  if (matchesRoute(pathname, ADMIN_ONLY_ROUTES)) {
    if (role !== 'admin') {
      const forbidden = new URL('/admin', request.url);
      forbidden.searchParams.set('flash', 'forbidden');
      return NextResponse.redirect(forbidden);
    }
  }

  // Manager + admin routes (not accessible to cajero)
  if (matchesRoute(pathname, MANAGER_ROUTES)) {
    if (role !== 'admin' && role !== 'manager') {
      const forbidden = new URL('/admin', request.url);
      forbidden.searchParams.set('flash', 'forbidden');
      return NextResponse.redirect(forbidden);
    }
  }

  // Any-role routes: already authenticated, no further restriction needed
  // (ANY_ROLE_ROUTES just requires authentication, which is already checked above)

  return res;
}

export const config = {
  // Matches /admin, /admin/page.tsx route, and all /admin/* sub-paths
  // Explicitly excludes /api/* so those are never intercepted
  matcher: ['/admin', '/admin/:path*'],
};
