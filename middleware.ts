import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/admin/login', '/api/admin/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    !PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get('admin_session');
  if (session?.value === process.env.ADMIN_PASSWORD) return NextResponse.next();

  // API routes get 401 instead of redirect
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
