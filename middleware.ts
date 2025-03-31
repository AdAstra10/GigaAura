import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Only redirect from root to /home
  if (pathname === '/') {
    // Check if there's a specific error query parameter to prevent redirect loops
    const hasErrorParam = url.searchParams.has('error');
    
    if (!hasErrorParam) {
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
  }

  // Allow all other requests to proceed normally
  return NextResponse.next();
}

// Match only the root path to prevent over-redirecting
export const config = {
  matcher: ['/']
}; 