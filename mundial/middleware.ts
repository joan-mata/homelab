import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Cron routes and cron-accessible admin endpoints — protected by CRON_SECRET in handler
  if (pathname.startsWith('/api/cron') || pathname === '/api/admin/sync-apifootball') {
    return NextResponse.next();
  }

  // Unauthenticated
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Force password change
  if (session.user.mustChangePassword && !pathname.startsWith('/change-password') && pathname !== '/api/profile/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
