import type { Routes } from '@/@types/routes';
import adminRoute from './adminRoute';
import authRoute from './authRoute';
import dashboardsRoute from './dashboardsRoute';

export const protectedRoutes: Routes = {
  ...adminRoute,
  ...dashboardsRoute,
  '/access-denied': {
    key: 'accessDenied',
    authority: [], // Allow all authenticated users to access this page
  },
};

export const publicRoutes: Routes = {
  // OAuth callback routes (must be public to allow SSO token exchange)
  '/auth/callback': {
    key: 'authCallback',
    authority: [],
  },
  '/call-window': {
    key: 'callWindow',
    authority: [], // Public route - accessible with session storage credentials
  },
};

export const authRoutes = authRoute;
