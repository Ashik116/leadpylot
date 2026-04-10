# Dynamic Role-Based Access Control (RBAC) Implementation Guide

## Overview

This application includes a **dynamic** Role-Based Access Control (RBAC) system that automatically reads route permissions from your existing navigation configuration files. When a user tries to access a page they don't have permission for, they are automatically redirected to an "Access Denied" page.

## Key Feature: Dynamic Permission Loading

**The system automatically extracts permissions from your navigation configs!**

You no longer need to maintain duplicate permission configurations. The system reads the `authority` field from:
- `src/configs/navigation.config/dashboards.navigation.config.ts`
- `src/configs/navigation.config/admin.navigation.config.ts`

## User Roles

The system supports three roles:

1. **Admin** - Full access to all pages and features
2. **Agent** - Limited access to specific pages (controlled via navigation config)
3. **Provider** - Configurable access (controlled via navigation config)

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Navigation Config Files                            │
│  (dashboards.navigation.config.ts)                           │
│  (admin.navigation.config.ts)                               │
│         Each route has 'authority' field                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           routePermissions.ts                               │
│  - Extracts routes from navigation configs                  │
│  - Builds permission map dynamically                        │
│  - Auto-initializes on app load                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostLoginLayout                           │
│  (Wraps all protected routes)                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     RouteGuard                              │
│  - Checks user role from authStore                          │
│  - Gets current route path                                  │
│  - Checks permissions from dynamically built map            │
│  - Redirects to /access-denied if no permission             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Page Content                              │
│  (Rendered only if user has permission)                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/configs/navigation.config/dashboards.navigation.config.ts` | Dashboard navigation with `authority` field |
| `src/configs/navigation.config/admin.navigation.config.ts` | Admin navigation with `authority` field |
| `src/configs/navigation.config/auth.route.config.ts` | Permission utilities and helper functions |
| `src/configs/navigation.config/routePermissions.ts` | Auto-initializes permissions from navigation configs |
| `src/components/shared/RouteGuard.tsx` | Route protection component |
| `src/components/layouts/PostLoginLayout/PostLoginLayout.tsx` | Layout with RouteGuard integration |
| `src/hooks/useRoutePermissions.ts` | Hooks for component-level permission checks |
| `src/app/(protected-pages)/access-denied/page.tsx` | Access denied page |

## Configuration

### Defining Route Permissions

**Simply add the `authority` field to your navigation items!**

In `dashboards.navigation.config.ts` or `admin.navigation.config.ts`:

```typescript
{
  key: 'dashboard.leads',
  path: `${DASHBOARDS_PREFIX_PATH}/leads`,
  title: 'Leads',
  icon: 'dashboardLeads',
  type: NAV_ITEM_TYPE_ITEM,
  authority: [Role.ADMIN], // Only Admin can access
  subMenu: [],
},
{
  key: 'dashboard.home',
  path: `${DASHBOARDS_PREFIX_PATH}/home`,
  title: 'Home',
  icon: 'dashboardHome',
  type: NAV_ITEM_TYPE_ITEM,
  authority: [Role.ADMIN, Role.AGENT, Role.PROVIDER], // All roles can access
  subMenu: [],
},
```

### Permission Patterns

The system supports nested routes with different permissions:

```typescript
{
  key: 'dashboard.leads',
  path: '', // Parent route (no direct access)
  title: 'Leads',
  type: NAV_ITEM_TYPE_COLLAPSE,
  authority: [Role.ADMIN], // Parent permission
  subMenu: [
    {
      key: 'dashboard.leads.allLeads',
      path: `${DASHBOARDS_PREFIX_PATH}/leads`,
      title: 'All Leads',
      type: NAV_ITEM_TYPE_ITEM,
      authority: [Role.ADMIN, Role.AGENT], // Child permission (overridden)
      subMenu: [],
    },
    {
      key: 'dashboard.leads.leadsBank',
      path: `${DASHBOARDS_PREFIX_PATH}/leads-bank`,
      title: 'Leads Bank',
      type: NAV_ITEM_TYPE_ITEM,
      authority: [Role.ADMIN], // Admin only
      subMenu: [],
    },
  ],
},
```

### Default Behavior

Any route **not defined** in your navigation configs defaults to **Admin-only access**.

## Usage Examples

### 1. Adding New Routes with Permissions

**Step 1:** Add route to navigation config with `authority` field:

```typescript
// In dashboards.navigation.config.ts
{
  key: 'dashboard.reports',
  path: `${DASHBOARDS_PREFIX_PATH}/reports`,
  title: 'Reports',
  icon: 'dashboardReports',
  type: NAV_ITEM_TYPE_ITEM,
  authority: [Role.ADMIN], // Admin only
  subMenu: [],
},
```

**Step 2:** That's it! No additional configuration needed. The RouteGuard will automatically enforce the permission.

### 2. Granting Agent Access to Existing Routes

Simply update the `authority` field in your navigation config:

```typescript
// BEFORE: Admin only
{
  key: 'dashboard.someFeature',
  path: `${DASHBOARDS_PREFIX_PATH}/some-feature`,
  authority: [Role.ADMIN],
  // ... other fields
}

// AFTER: Admin and Agent
{
  key: 'dashboard.someFeature',
  path: `${DASHBOARDS_PREFIX_PATH}/some-feature`,
  authority: [Role.ADMIN, Role.AGENT], // Just add Role.AGENT
  // ... other fields
}
```

### 3. Component-Level Permission Checks

Use hooks to conditionally render UI elements:

```typescript
import { useCanAccessRoute, useIsAdmin, useIsAgent } from '@/hooks/useRoutePermissions';

function MyComponent() {
  const canAccessLeads = useCanAccessRoute('/dashboards/leads');
  const isAdmin = useIsAdmin();
  const isAgent = useIsAgent();

  return (
    <div>
      {isAdmin && <AdminPanel />}
      {isAgent && <AgentPanel />}
      {canAccessLeads && <LeadsButton />}
    </div>
  );
}
```

## Current Route Permissions (From Navigation Configs)

The system automatically extracts these from your navigation configs:

### Admin Only Routes (Agent Cannot Access)

From `dashboards.navigation.config.ts`:
- `/dashboards/leads-bank` - authority: `[Role.ADMIN]`
- `/dashboards/leads/pending-leads` - authority: `[Role.ADMIN]`
- `/dashboards/leads/archived` - authority: `[Role.ADMIN]`
- `/dashboards/live-leads` - authority: `[Role.ADMIN]` (Admin version)
- `/dashboards/recycle-leads` - authority: `[Role.ADMIN]` (Admin version)
- `/dashboards/documents` - authority: `[Role.ADMIN]`
- `/dashboards/projects` - authority: `[Role.ADMIN]`
- `/admin/*` - All admin routes (from admin.navigation.config.ts)

### Agent Can Access

From `dashboards.navigation.config.ts`:
- `/dashboards/home` - authority: `[Role.PROVIDER]` (Note: Consider adding AGENT if needed)
- `/dashboards/leads` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/live-leads` - authority: `[Role.AGENT]` (Agent version)
- `/dashboards/recycle-leads` - authority: `[Role.AGENT]` (Agent version)
- `/dashboards/offers` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/termin` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/calendar` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/tickets` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/mails` - authority: `[Role.AGENT]`
- `/dashboards/todo` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/openings` - authority: `[Role.ADMIN, Role.AGENT]`
- `/dashboards/reclamations` - authority: `[Role.AGENT]`

### Provider Can Access

- `/dashboards/home` - authority: `[Role.PROVIDER]`
- Various routes with `[Role.ADMIN, Role.PROVIDER]`

## Testing

### Testing as Admin

1. Login as Admin user
2. Navigate to any page
3. All pages should be accessible

### Testing as Agent

1. Login as Agent user
2. Try to access `/dashboards/leads-bank`
3. Should be redirected to `/access-denied`
4. Try to access `/dashboards/leads`
5. Should load successfully (Agent has access)

### Direct URL Access Test

1. Login as Agent
2. Manually enter `/dashboards/leads-bank` in browser URL
3. Should be redirected to `/access-denied` with message:
   > "You don't have permission to access this page. Please contact your administrator if you believe this is an error."

### Debug Mode

In development mode, the system logs all extracted routes to the console:

```javascript
console.log('[RoutePermissions] Initialized with', permissions.length, 'routes');
console.table(permissions);
```

Check your browser console to see the current permission mappings.

## Available Hooks

All hooks are in `src/hooks/useRoutePermissions.ts`:

| Hook | Description |
|------|-------------|
| `useCanAccessRoute(route)` | Check if user can access a specific route |
| `useRoutePermission(route)` | Get full permission details for a route |
| `useHasRole(roles)` | Check if user has any of the specified roles |
| `useUserRole()` | Get current user's role |
| `useIsAdmin()` | Check if user is Admin |
| `useIsAgent()` | Check if user is Agent |
| `useIsProvider()` | Check if user is Provider |

## Example: Hide Navigation Items Based on Role

Your existing navigation system already handles this! The `authority` field in your navigation configs controls which items appear in the sidebar/menu for each role.

For custom components:

```typescript
import { useCanAccessRoute } from '@/hooks/useRoutePermissions';

function CustomNavigation() {
  const canAccessLeads = useCanAccessRoute('/dashboards/leads');

  return (
    <nav>
      <Link href="/dashboards/home">Home</Link>
      {canAccessLeads && <Link href="/dashboards/leads">Leads</Link>}
    </nav>
  );
}
```

## How It Works Under the Hood

### 1. Route Extraction

The `extractRoutesFromNav` function recursively traverses your navigation configs:

```typescript
const extractRoutesFromNav = (
  navItems: NavigationTree[],
  parentPath = ''
): Map<string, Role[]> => {
  const routeMap = new Map<string, Role[]>();

  navItems.forEach((item) => {
    // Extract route path and authority
    if (item.path && item.authority) {
      routeMap.set(item.path, item.authority);
    }

    // Recursively process submenus
    if (item.subMenu?.length) {
      const subRoutes = extractRoutesFromNav(item.subMenu, item.path);
      subRoutes.forEach((roles, path) => routeMap.set(path, roles));
    }
  });

  return routeMap;
};
```

### 2. Auto-Initialization

The `routePermissions.ts` module automatically initializes on import:

```typescript
import { buildRoutePermissions, setRoutePermissions } from './auth.route.config';
import dashboardsNavigationConfig from './dashboards.navigation.config';
import adminNavigationConfig from './admin.navigation.config';

export const initializeRoutePermissions = () => {
  const permissions = buildRoutePermissions(
    dashboardsNavigationConfig,
    adminNavigationConfig
  );
  setRoutePermissions(permissions);
};

// Auto-initialize on module load
initializeRoutePermissions();
```

### 3. Permission Checking

The `hasRouteAccess` function checks if a user's role is in the route's allowed roles:

```typescript
export const hasRouteAccess = (route: string, userRole: Role): boolean => {
  const permission = getRoutePermission(route);

  // If no specific permission found, default to Admin-only
  if (!permission) {
    return userRole === Role.ADMIN;
  }

  // Check if user's role is in the allowed roles
  return permission.roles.includes(userRole);
};
```

## Security Notes

⚠️ **Important:** This is frontend-only protection. For production:

1. **Always validate permissions on the backend** - Never rely solely on frontend checks
2. **Secure API endpoints** - Verify user role on every API call
3. **Use JWT tokens** - Include role claims in the token
4. **Implement API middleware** - Check permissions before returning data

Example API protection:

```typescript
// Backend API middleware
app.get('/api/leads', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  // Return leads data
});
```

## Troubleshooting

### Issue: Agent can still access Admin pages

**Cause:** Route has wrong `authority` in navigation config

**Solution:** Update the `authority` field in the navigation config:
```typescript
{
  path: '/dashboards/some-admin-route',
  authority: [Role.ADMIN], // Should only have ADMIN
}
```

### Issue: Access denied page not showing

**Cause:** RouteGuard not properly integrated or permissions not initialized

**Solution:**
- Ensure `routePermissions.ts` is imported in `RouteGuard.tsx`
- Check browser console for initialization logs
- Verify navigation configs have `authority` fields

### Issue: Agent can't access a page they should

**Cause:** Route missing from navigation config or wrong `authority`

**Solution:**
- Add the route to navigation config with proper `authority`
- Ensure `Role.AGENT` is in the authority array:
  ```typescript
  authority: [Role.ADMIN, Role.AGENT]
  ```

### Issue: Changes to navigation config not reflected

**Cause:** Browser cache or need to reload

**Solution:**
- Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for route permission logs

## Migration from Hardcoded Permissions

**Before (Old System):**
```typescript
// In auth.route.config.ts
export const routePermissions: RoutePermission[] = [
  {
    path: '/dashboards/leads',
    roles: [Role.ADMIN, Role.AGENT],
  },
  // ... manually maintained for every route
];
```

**After (New Dynamic System):**
```typescript
// In dashboards.navigation.config.ts
{
  key: 'dashboard.leads',
  path: `${DASHBOARDS_PREFIX_PATH}/leads`,
  authority: [Role.ADMIN, Role.AGENT], // Single source of truth!
}
```

## Summary

✅ **Dynamic System Benefits:**
- ✅ No duplicate permission configuration
- ✅ Single source of truth: navigation configs
- ✅ Automatically reads `authority` field
- ✅ Easy to add/remove routes
- ✅ Automatic permission enforcement
- ✅ Debug logging in development
- ✅ Component-level permission hooks

✅ **How It Works:**
1. Add `authority` field to navigation items
2. System auto-extracts permissions on app load
3. RouteGuard checks permissions automatically
4. Unauthorized users redirected to access-denied

✅ **Key Points:**
- **No hardcoded permissions** - Everything comes from navigation configs
- **Authority field controls access** - Update `authority` to change permissions
- **Auto-initialization** - Permissions loaded automatically on app start
- **Backend validation required** - Don't forget API security!

✅ **Next Steps:**
1. Review your navigation configs
2. Ensure all routes have proper `authority` fields
3. Test with Admin and Agent users
4. Implement backend API permission checks
5. Monitor console logs for debugging
