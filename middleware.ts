// middleware.ts
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const corsMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const corsHeaders = 'Authorization, Content-Type, Accept, Origin, X-Requested-With';

function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');

  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Methods', corsMethods);
  response.headers.set(
    'Access-Control-Allow-Headers',
    request.headers.get('access-control-request-headers') || corsHeaders,
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');

  if (origin) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
    }

    return applyCorsHeaders(NextResponse.next(), request);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/api/:path*',

    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(en|zh|ja)/:path*',

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!api(?:/|$)|_next|_vercel|auth|privacy-policy|terms-of-service|refund-policy|.*\\.|favicon.ico).*)'
  ]
};
