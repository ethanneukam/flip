import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // Changed from 'next/request'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // This is the heartbeat: it checks the actual Supabase Auth session
  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  // 1. PUBLIC ROUTES (Anyone can see these)
  const isPublicRoute = [
    '/auth',    // Landing Page
    '/login',   // Login Portal
    '/pricing', 
    '/feed', 
    '/charts', 
    '/admin'
  ].some(p => path.startsWith(p));

  // 2. LOGIC: If on the Root URL (/)
  if (path === '/') {
    return session 
      ? NextResponse.redirect(new URL('/charts', req.url)) 
      : NextResponse.redirect(new URL('/auth', req.url));
  }

  // 3. LOGIC: If logged in, don't let them go back to Login or Landing
  if (session && (path === '/login' || path === '/auth')) {
    return NextResponse.redirect(new URL('/vault', req.url));
  }

  // 4. LOGIC: If NOT logged in and trying to access private stuff (Vault, Dashboard, etc.)
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};