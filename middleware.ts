import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Redirect from root to /home to avoid issues with the root route
  if (url.pathname === '/') {
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/',
  ],
}; 