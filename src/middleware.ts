import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, CURATOR_SESSION_COOKIE, ADMIN_SESSION_COOKIE } from '@/lib/session';

// Route protection for the two password-authenticated roles (spec section 2: curators &
// admin use simple username/password; artists never hit this — they're magic-link only).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/curator/dashboard')) {
    const token = req.cookies.get(CURATOR_SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || session.role !== 'curator') {
      const url = req.nextUrl.clone();
      url.pathname = '/curator/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || session.role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/curator/dashboard/:path*', '/admin/:path*'],
};
