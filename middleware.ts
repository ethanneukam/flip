import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session and set cookies
  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  // Define strictly public routes (/auth is just the landing page now)
  const publicPaths = ['/auth', '/login', '/feed', '/charts', '/item', '/pricing'];
  const isPublicRoute = publicPaths.some(p => path.startsWith(p));

  // 1. Handle Root: Send unauthenticated users to the Landing Page (/auth)
  if (path === '/') {
    // If they are logged in, send them to the app. If not, to the landing page.
    if (session) {
      return NextResponse.redirect(new URL('/charts', req.url));
    }
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // 2. If Logged In: Block the login page AND the landing page, send straight to app
  if (session && (path === '/login' || path === '/auth')) {
    return NextResponse.redirect(new URL('/charts', req.url));
  }

  // 3. If Not Logged In: Block strictly private routes and force them to the actual Login portal
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};