import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Only redirect from root if there's no rendering error
  // This prevents redirect loops in case of errors
  if (url.pathname === '/') {
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match both root and /home paths to handle either case
export const config = {
  matcher: [
    '/',
    '/home'
  ],
}; 