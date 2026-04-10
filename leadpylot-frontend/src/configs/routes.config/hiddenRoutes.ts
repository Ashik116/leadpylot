import type { Routes } from '@/@types/routes';
import { Role } from '../navigation.config/auth.route.config';

/**
 * Hidden routes configuration
 *
 * These routes need permission checking but should NOT appear in navigation menus.
 * Examples: detail pages, dynamic routes, modal pages, etc.
 */
export const hiddenRoutes: Routes = {
  // Lead detail pages (accessed from leads list, not navigation)
  '/dashboards/leads/[id]': {
    key: 'dashboard.leads.leadDetail',
    authority: [Role.ADMIN, Role.AGENT],
    meta: { pageContainerType: 'default' },
    dynamicRoute: true,
  },
  '/dashboards/agent-live-lead': {
    key: 'dashboard.agentLiveLead',
    authority: [Role.ADMIN, Role.AGENT],
    meta: { pageContainerType: 'default' },
    dynamicRoute: false,
  },
  '/dashboards/agent-recycle-lead': {
    key: 'dashboard.agentRecycleLead',
    authority: [Role.ADMIN, Role.AGENT],
    meta: { pageContainerType: 'default' },
    dynamicRoute: false,
  },
  '/accounts/notifications': {
    key: 'accounts.notifications',
    authority: [Role.ADMIN, Role.AGENT],
    meta: { pageContainerType: 'default' },
    dynamicRoute: false,
  },

  // Tenant management routes (Admin only)
  '/admin/tenants/create': {
    key: 'admin.tenants.create',
    authority: [Role.ADMIN],
    meta: { pageContainerType: 'default' },
    dynamicRoute: false,
  },
  '/admin/tenants/[id]': {
    key: 'admin.tenants.detail',
    authority: [Role.ADMIN],
    meta: { pageContainerType: 'default' },
    dynamicRoute: true,
  },
  '/dashboards/reclamations/[id]': {
    key: 'dashboard.reclamations.detail',
    authority: [Role.ADMIN, Role.AGENT],
    meta: { pageContainerType: 'default' },
    dynamicRoute: true,
  },
};
