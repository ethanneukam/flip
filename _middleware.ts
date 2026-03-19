import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const url = req.nextUrl.clone();
  const path = req.nextUrl.pathname;

  // 1. Define Public Routes
  // Notice: '/scan' and '/vault' are NOT here. They are strictly private.
  const publicPaths = ['/terminal', '/auth', '/login', '/feed', '/charts', '/item'];
  
  // Allows sub-routes like /charts/123 to be public as well
  const isPublicRoute = publicPaths.some(p => path.startsWith(p));

  // 2. Redirect root '/' to '/auth' (Landing Page)
  if (path === '/') {
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  // 3. If Logged In: Never show Login or Auth screens again
  if (session && (path === '/login' || path === '/auth')) {
    url.pathname = '/vault';
    return NextResponse.redirect(url);
  }

  // 4. If Not Logged In: Block access to Private Routes (/scan, /vault)
  if (!session && !isPublicRoute) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};