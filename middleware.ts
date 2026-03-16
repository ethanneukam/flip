import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const url = req.nextUrl.clone();
  const path = req.nextUrl.pathname;

  // 1. Define Public Routes (Unlocked)
  const isPublicRoute = 
    path === '/terminal' || 
    path === '/scan' || 
    path === '/auth' || 
    path === '/login' ||
    path === '/feed';

  // 2. Redirect root '/' to '/auth'
  if (path === '/') {
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  // 3. If Logged In: Prevent access to Login/Auth (Redirect to Vault/Monitor)
  if (session && (path === '/login' || path === '/auth')) {
    url.pathname = '/vault';
    return NextResponse.redirect(url);
  }

  // 4. If Not Logged In: Only block Private Routes (Vault, etc.)
  if (!session && !isPublicRoute) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};