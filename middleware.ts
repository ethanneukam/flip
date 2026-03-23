import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // This is crucial: it refreshes the session and sets the cookies correctly
  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  const publicPaths = ['/terminal', '/auth', '/login', '/feed', '/charts', '/item', '/pricing'];
  const isPublicRoute = publicPaths.some(p => path.startsWith(p));

  // 1. Handle Root
  if (path === '/') {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // 2. If Logged In: Block Auth/Login pages and send to Vault
  if (session && (path === '/login' || path === '/auth')) {
    return NextResponse.redirect(new URL('/vault', req.url));
  }

  // 3. If Not Logged In: Block strictly private routes
  if (!session && !isPublicRoute) {
    // Standardize to /login since that is where your file is
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};