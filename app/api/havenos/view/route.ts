import { NextRequest, NextResponse } from 'next/server';
import { isHavenosAuthenticated } from '@/lib/havenos-auth';
import bundle from '@/havenos-site/dashboards.json';

// Dashboards are bundled at build time from havenos-site/dashboards.json,
// which `python haven.py publish` regenerates. Pushing that file redeploys
// the site with fresh numbers.
const dashboards = bundle.dashboards as Record<string, string>;

export async function GET(req: NextRequest) {
  if (!isHavenosAuthenticated()) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const name = req.nextUrl.searchParams.get('d') ?? 'monday';
  const html = dashboards[name];
  if (!html) {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
