import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Define public routes that don't need a login
  const isPublicRoute = 
    req.nextUrl.pathname === '/' || 
    req.nextUrl.pathname === '/charts' || 
     req.nextUrl.pathname === '/auth' || 
     req.nextUrl.pathname === '/feed' || 
    req.nextUrl.pathname === '/login';


  // If there's no session and they try to access a protected route, boot them
  if (!session && !isPublicRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }
// FIX: If user is logged in and tries to go to /login, send them to /vault (Asset Monitor)
  if (session && req.nextUrl.pathname === '/login') {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/vault';
    return NextResponse.redirect(redirectUrl);
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};