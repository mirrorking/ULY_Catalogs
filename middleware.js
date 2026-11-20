import { NextResponse } from 'next/server';

export async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 放行登录页、静态资源、api接口
  const allowPaths = ["/auth.html", "/css/", "/js/", "/img/", "/api/"];
  if (allowPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = request.headers.get("cookie") || "";
  const isAuth = cookie.includes("uly_verified=1");

  if (!isAuth) {
    return NextResponse.redirect(new URL("/auth.html", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};
