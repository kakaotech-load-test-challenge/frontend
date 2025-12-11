import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // `/chat/` 또는 `/chat/.../` 같은 경우 끝의 슬래시(들)를 제거하여 `/chat` 또는 `/chat/...` 으로 리다이렉트
  if (pathname === '/chat/' || (pathname.startsWith('/chat/') && pathname.endsWith('/'))) {
    url.pathname = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // `/chat` 및 하위 경로에만 미들웨어 적용
  matcher: ['/chat', '/chat/:path*'],
};
