import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

const INTERN_BLOCKED_PAGES = [
  '/pipeline',
  '/people',
  '/compliance',
  '/regions',
  '/impact',
  '/reports',
  '/settings',
];

const MENTOR_BLOCKED_PAGES = [
  '/compliance',
  '/regions',
  '/impact',
  '/reports',
  '/settings',
];

function isBlockedPage(pathname: string, blockedPaths: string[]): boolean {
  return blockedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/logo.svg') {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  const { role } = payload;

  // Block restricted page routes for intern
  if (role === 'intern' && !pathname.startsWith('/api/')) {
    // Allow /people/[id] only if it matches their own personId
    if (pathname.startsWith('/people/') && payload.personId) {
      const personIdFromUrl = pathname.split('/')[2];
      if (personIdFromUrl && personIdFromUrl !== payload.personId) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } else if (isBlockedPage(pathname, INTERN_BLOCKED_PAGES)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Block restricted page routes for mentor
  // Note: /compliance/alerts is allowed for mentor (scoped), but /compliance (overview) is blocked
  if (role === 'mentor' && !pathname.startsWith('/api/')) {
    if (pathname === '/compliance' || (pathname.startsWith('/compliance') && !pathname.startsWith('/compliance/alerts'))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (isBlockedPage(pathname, MENTOR_BLOCKED_PAGES.filter(p => p !== '/compliance'))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  if (payload.personId) {
    requestHeaders.set('x-user-person-id', payload.personId);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
