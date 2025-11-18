import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const publicRoutes = ['/auth'];

export default async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;

    const isPublicRoute = publicRoutes.some(
        (route) => path === route || path.startsWith(`${route}/`),
    );

    const isProtectedRoute = !isPublicRoute;

    const cookie = (await cookies()).get('x-session-id')?.value;

    if (isProtectedRoute && !cookie) {
        return NextResponse.redirect(new URL('/auth', req.nextUrl));
    }

    if (
        isPublicRoute &&
        cookie &&
        !req.nextUrl.pathname.startsWith('/device-dashboard')
    ) {
        return NextResponse.redirect(new URL('/device-dashboard', req.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
