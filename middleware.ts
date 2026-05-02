import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/v1/')) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 405 });
    }
    const origin = req.headers.get('origin');
    if (origin) {
      // Block browser CORS by not setting any Access-Control-* response header.
      // The browser will reject the response. Server-to-server (no Origin) is unaffected.
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
