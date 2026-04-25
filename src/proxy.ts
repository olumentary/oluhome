import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const publicPaths = ['/login', '/register', '/verify-email'];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  if (publicPaths.some((p) => pathname === p)) return true;
  if (pathname.startsWith('/share/')) return true;
  if (pathname.startsWith('/api/webhooks/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/pricing')) return true;
  return false;
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes — always allow
  if (isPublicRoute(pathname)) {
    // Redirect authenticated users away from auth pages
    if (session && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/items', req.url));
    }
    return NextResponse.next();
  }

  // Everything below requires authentication
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Admin routes — require admin role
  if (pathname.startsWith('/admin') && session.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/items', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
