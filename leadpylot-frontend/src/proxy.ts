import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  authRoutes as _authRoutes,
  publicRoutes as _publicRoutes,
  protectedRoutes,
} from '@/configs/routes.config';
import { REDIRECT_URL_KEY } from '@/constants/app.constant';
import appConfig from '@/configs/app.config';
import { getRoleBasedEntryPath } from '@/utils/roleBasedRouting';
import { extractUserRole, isTokenExpired } from '@/utils/jwt';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants/Constants';
import { isRoleAllowed } from '@/configs/tenant.config';
import { getSafeRedirectPath } from '@/utils/safeRedirectPath';

const publicRoutes = Object.entries(_publicRoutes).map(([key]) => key);
const authRoutes = Object.entries(_authRoutes).map(([key]) => key);

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Skip middleware for static assets and manifest files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.webmanifest') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);

  // Get token from cookies or headers
  const token =
    request.cookies.get(ACCESS_TOKEN)?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  // Check if user is authenticated - only check if token exists
  const isAuthenticated = token ? !isTokenExpired(token) : false;

  // Get user role from token using JWT decoding
  const userRole = token ? extractUserRole(token) : '';
  // Handle auth routes
  if (isAuthRoute) {
    if (isAuthenticated) {
      const roleBasedPath = getRoleBasedEntryPath(userRole);
      const redirectParam = nextUrl.searchParams.get(REDIRECT_URL_KEY);
      const safeNext = redirectParam ? getSafeRedirectPath(redirectParam) : null;

      if (safeNext) {
        return Response.redirect(new URL(safeNext, nextUrl));
      }

      // Prevent redirect loops by checking if we're already on the target path
      if (pathname !== roleBasedPath) {
        return Response.redirect(new URL(roleBasedPath, nextUrl));
      }
    }

    // Clear potentially stale auth cookies when visiting auth routes
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);

    const cookieNamesToDelete = [ACCESS_TOKEN, REFRESH_TOKEN];

    for (const cookieName of cookieNamesToDelete) {
      response.cookies.delete(cookieName);
    }

    return response;
  }

  // Redirect to unauthenticated entry path if not signed in & not on public route
  if (!isAuthenticated && !isPublicRoute) {
    let callbackUrl = pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }

    const redirectParam = encodeURIComponent(callbackUrl);
    return Response.redirect(
      new URL(`${appConfig.unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${redirectParam}`, nextUrl)
    );
  }

  // Handle role-based access control and redirect to role-specific dashboard if accessing root
  if (isAuthenticated) {
    // TENANT CHECK: Verify user's role is allowed for this tenant
    // This prevents users with wrong roles from accessing tenant-specific deployments
    if (pathname !== '/tenant-access-denied' && !isRoleAllowed(userRole)) {
      // User's role is not allowed for this tenant
      return Response.redirect(new URL('/tenant-access-denied', nextUrl));
    }

    // If user is accessing root ("/"), redirect to their role-specific dashboard
    if (pathname === '/') {
      const roleBasedPath = getRoleBasedEntryPath(userRole);
      return Response.redirect(new URL(roleBasedPath, nextUrl));
    }

    // Check role-based access for protected routes
    // Admin has access to ALL routes by default
    if (pathname !== '/access-denied' && userRole.toLowerCase() !== 'admin') {
      const routeMeta = protectedRoutes[pathname];
      if (routeMeta) {
        // Normalize role comparison by converting both to lowercase strings
        const normalizedUserRole = userRole.toLowerCase();
        const hasAccess = routeMeta.authority.some((role) => {
          const normalizedRouteRole = role.toLowerCase();
          return normalizedUserRole === normalizedRouteRole;
        });

        if (!hasAccess) {
          return Response.redirect(new URL('/access-denied', nextUrl));
        }
      }
    }
  }

  // Default: continue request and expose the pathname for SSR metadata
  const res = NextResponse.next();
  res.headers.set('x-pathname', pathname);
  return res;
}

export const config = {
  matcher: [
    // Match all paths except:
    // - API routes
    // - Static files (_next/static, favicon.ico, etc.)
    // - Images and other assets
    // - Manifest files
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
    '/',
  ],
};
