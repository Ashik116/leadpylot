# Permission System Usage Guide

## Overview

The permission system allows granular control over UI elements based on individual user permissions, not just roles. Two users with the same role can see different UI elements based on their specific permissions.

## Setup Complete ✅

- Backend endpoint: `GET /api/auth/me/permissions`
- PermissionService: Fetches and checks permissions
- permissionStore: Global Zustand store for permissions
- usePermissions hook: Access permission methods
- PermissionGuard component: Conditional rendering
- useAuth: Updated to include permission methods

## Usage Examples

### 1. Check Permission Directly in Component

```typescript
import { useAuth } from '@/hooks/useAuth';

export const OfferList = () => {
  const { hasPermission } = useAuth();

  return (
    <div>
      <h1>Offers</h1>

      {/* Show "Create Offer" button only if user has permission */}
      {hasPermission('offer:create') && (
        <button className="btn-primary">Create Offer</button>
      )}

      {/* Show "Delete All" button only for admins */}
      {hasPermission('offer:delete:all') && (
        <button className="btn-danger">Delete All Offers</button>
      )}
    </div>
  );
};
```

### 2. Use PermissionGuard Component

```typescript
import { PermissionGuard } from '@/components/Permission/PermissionGuard';

export const OfferList = () => {
  return (
    <div>
      <h1>Offers</h1>

      {/* Render only if user has permission */}
      <PermissionGuard permission="offer:create">
        <button className="btn-primary">Create Offer</button>
      </PermissionGuard>

      {/* Render with custom fallback */}
      <PermissionGuard
        permission="offer:delete:all"
        fallback={<span className="text-gray-400">Admin only</span>}
      >
        <button className="btn-danger">Delete All Offers</button>
      </PermissionGuard>
    </div>
  );
};
```

### 3. Check Multiple Permissions (ANY)

User needs ANY of the specified permissions:

```typescript
import { useAuth } from '@/hooks/useAuth';

export const OfferActions = () => {
  const { hasAnyPermission } = useAuth();

  // User can read offers if they have either 'read:all' OR 'read:own'
  const canReadOffers = hasAnyPermission([
    'offer:read:all',
    'offer:read:own'
  ]);

  return (
    {canReadOffers && (
      <button>View Offers</button>
    )}
  );
};

// Or with PermissionGuard
<PermissionGuard permissions={['offer:read:all', 'offer:read:own']}>
  <button>View Offers</button>
</PermissionGuard>
```

### 4. Check Multiple Permissions (ALL)

User needs ALL of the specified permissions:

```typescript
import { useAuth } from '@/hooks/useAuth';

export const OfferEdit = () => {
  const { hasAllPermissions } = useAuth();

  // User can edit if they have both 'delete:own' AND 'update:own'
  const canEditOffers = hasAllPermissions([
    'offer:delete:own',
    'offer:update:own'
  ]);

  return (
    {canEditOffers && (
      <button>Edit Offer</button>
    )}
  );
};

// Or with PermissionGuard
<PermissionGuard
  permissions={['offer:delete:own', 'offer:update:own']}
  requireAll={true}
>
  <button>Edit Offer</button>
</PermissionGuard>
```

### 5. Show/Hide Based on User Role (Existing)

```typescript
import { useAuth } from '@/hooks/useAuth';

export const Dashboard = () => {
  const { hasRole } = useAuth();

  return (
    <div>
      {/* Admin-only section */}
      {hasRole('Admin') && (
        <AdminPanel />
      )}

      {/* Agent-only section */}
      {hasRole('Agent') && (
        <AgentPanel />
      )}
    </div>
  );
};
```

### 6. Access All Permissions

```typescript
import { useAuth } from '@/hooks/useAuth';

export const DebugPanel = () => {
  const { permissions, role } = useAuth();

  return (
    <div className="debug-panel">
      <h3>Current Role: {role}</h3>
      <h4>Permissions ({permissions.length}):</h4>
      <ul>
        {permissions.map((perm) => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
    </div>
  );
};
```

### 7. Conditional API Calls

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';

export const OfferDeleteButton = ({ offerId }) => {
  const { hasPermission } = useAuth();

  const deleteMutation = useMutation({
    mutationFn: () => deleteOffer(offerId),
    onSuccess: () => toast.success('Offer deleted'),
  });

  const handleDelete = () => {
    if (hasPermission('offer:delete:own')) {
      deleteMutation.mutate();
    } else {
      toast.error('You don\'t have permission to delete offers');
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={!hasPermission('offer:delete:own')}
    >
      Delete Offer
    </button>
  );
};
```

## Common Permission Patterns

### Button Visibility

```typescript
// Show button only if user has permission
<PermissionGuard permission="offer:create">
  <button>Create Offer</button>
</PermissionGuard>
```

### Section Visibility

```typescript
// Show entire section only if user has permission
<PermissionGuard permission="offer:read:all">
  <div className="offer-section">
    <h2>All Offers</h2>
    <OfferTable />
  </div>
</PermissionGuard>
```

### Navigation Item Visibility

```typescript
// Show menu item only if user has permission
{hasPermission('offer:read:own') && (
  <MenuItem icon="offer" path="/offers">
    My Offers
  </MenuItem>
)}
```

### Form Field Visibility

```typescript
// Show form field only if user has permission
<PermissionGuard permission="offer:update:own">
  <Field label="Price" />
</PermissionGuard>
```

## Available Permissions

Permissions are organized by resource and action. Here are some common ones:

### Offer Permissions

- `offer:create` - Create new offers
- `offer:read:own` - Read own offers
- `offer:read:all` - Read all offers (including others')
- `offer:update:own` - Update own offers
- `offer:update:all` - Update any offer
- `offer:delete:own` - Delete own offers
- `offer:delete:all` - Delete any offer

### Lead Permissions

- `lead:create` - Create new leads
- `lead:read:assigned` - Read assigned leads
- `lead:read:all` - Read all leads
- `lead:update` - Update any lead
- `lead:delete:assigned` - Delete assigned lead
- `lead:delete:all` - Delete any lead
- `lead:assign` - Assign leads to agents

### Email Permissions

- `email:send` - Send emails to leads
- `email:read:own` - Read own emails
- `email:read:all` - Read all emails
- `email:approve` - Approve emails (admin)
- `email:reject` - Reject emails (admin)

### User Permissions

- `user:create` - Create users
- `user:read:own` - Read own user data
- `user:read:all` - Read all users
- `user:update` - Update own user data
- `user:update:all` - Update any user
- `user:delete:own` - Delete own user
- `user:delete:all` - Delete any user

_See complete list in:_ `[user-auth-service-api/src/auth/roles/permissions.js](leadpylot-microservices/user-auth-service-api/src/auth/roles/permissions.js)`

## Testing Checklist

### 1. Test Permission-Based UI Visibility

- [ ] Login as user with `offer:create` permission
  - [ ] Verify "Create Offer" button is visible
- [ ] Login as user WITHOUT `offer:create` permission
  - [ ] Verify "Create Offer" button is NOT visible
- [ ] Login as user with `offer:read:own` permission
  - [ ] Verify "My Offers" section is visible
- [ ] Login as user with `offer:read:all` permission
  - [ ] Verify "All Offers" section is visible
- [ ] Login as user with both `offer:delete:own` AND `offer:update:own`
  - [ ] Verify "Edit/Delete" actions are visible
- [ ] Login as user with only one of the permissions
  - [ ] Verify only the correct action is visible

### 2. Test PermissionGuard Fallback

- [ ] Create component with custom fallback
  ```typescript
  <PermissionGuard
    permission="offer:delete:all"
    fallback={<div>You don't have permission</div>}
  >
    <button>Delete All</button>
  </PermissionGuard>
  ```
- [ ] Login as user without permission
  - [ ] Verify fallback content is shown
- [ ] Login as user with permission
  - [ ] Verify children content is shown

### 3. Test Multiple Permissions

- [ ] Test `hasAnyPermission` with array of permissions
  - [ ] Verify at least one permission works
- [ ] Test `hasAllPermissions` with array of permissions
  - [ ] Verify all permissions are required

### 4. Test Logout and Permission Clear

- [ ] Login with permissions loaded
- [ ] Verify permissions are accessible via `useAuth`
- [ ] Logout
- [ ] Verify permissions are cleared from store
- [ ] Login again
- [ ] Verify permissions are loaded again

### 5. Debug Permissions

Add this temporary component to check what permissions you have:

```typescript
import { useAuth } from '@/hooks/useAuth';

export const DebugPermissions = () => {
  const { permissions, role } = useAuth();

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid red',
      padding: '10px',
      zIndex: 9999,
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <strong>Role: {role}</strong>
      <p>Permissions ({permissions.length}):</p>
      <ol>
        {permissions.map((perm) => (
          <li key={perm}>{perm}</li>
        ))}
      </ol>
    </div>
  );
};
```

### 6. Test Backend Endpoint

Test the permissions endpoint directly (with Redis caching):

```bash
# Get user token
TOKEN="your-jwt-token-here"

# Test endpoint (first call = cache miss, subsequent calls = cache hit)
curl -X GET http://localhost:3000/api/auth/me/permissions \
  -H "Authorization: Bearer $TOKEN"

# Expected response (first call):
# {
#   "role": "Agent",
#   "permissions": [
#     "offer:create",
#     "offer:read:own",
#     "offer:update:own",
#     "offer:delete:own"
#   ],
#   "_cached": false
# }

# Expected response (second call - from cache):
# {
#   "role": "Agent",
#   "permissions": [
#     "offer:create",
#     "offer:read:own",
#     "offer:update:own",
#     "offer:delete:own"
#   ],
#   "_cached": true
# }
```

## Troubleshooting

### Issue: Permissions Always Empty

**Symptoms:** `permissions` array is always empty in UI

**Possible Causes:**

1. Backend endpoint not returning permissions
2. AuthProvider not calling `setPermissions()`
3. Fetch call failing silently

**Solutions:**

1. Check browser console for errors
2. Add logging to `useAuth` hook:
   ```typescript
   const { permissions, role } = useAuth();
   console.log('Permissions:', permissions, 'Role:', role);
   ```
3. Verify backend endpoint works with curl (see above)
4. Check `AuthProvider.tsx` useEffect is running

### Issue: PermissionGuard Always Shows Fallback

**Symptoms:** `PermissionGuard` component always shows fallback content

**Possible Causes:**

1. User doesn't have required permission
2. Permission string is incorrect
3. Case sensitivity issue

**Solutions:**

1. Debug what permissions user has (see Debug Permissions section)
2. Check exact permission string in backend `permissions.js`
3. Verify permission string matches exactly (case-sensitive)

### Issue: UI Shows Then Hides (Flicker)

**Symptoms:** UI element appears briefly then disappears

**Possible Causes:**

1. Permissions loading after initial render
2. Race condition between auth and permissions

**Solutions:**

1. Add loading state to PermissionGuard:
   ```typescript
   <PermissionGuard permission="offer:create">
     <div>
       {isLoading ? <Spinner /> : <button>Create</button>}
     </div>
   </PermissionGuard>
   ```

### Issue: Permissions Not Updating After Role Change

**Symptoms:** Changing user role doesn't update UI permissions

**Possible Causes:**

1. Permission store not refreshing
2. User session still has old role

**Solutions:**

1. Logout and login again (reloads permissions)
2. Force reload: `window.location.reload()`

### 7. Test Cache Invalidation

After changing user's role via API, the Redis cache is automatically invalidated:

```bash
# 1. Update user's role via API
curl -X PUT http://localhost:3000/api/roles/6789 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["offer:create", "lead:create"]
  }'

# 2. Check backend logs for cache invalidation:
# [Cache MISS] Permissions for user user123 cached in Redis
# [Cache MISS] Permissions invalidated for role: Agent (user role changed)
# [Cache HIT] Permissions for user user123 from database
# [Cache HIT] Permissions for user user123 cached in Redis

# 3. Test permissions endpoint again - should get fresh permissions
curl -X GET http://localhost:3000/api/auth/me/permissions \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response: Updated permissions with "_cached": true
```

**Note:** Cache is automatically invalidated when:

- Roles are updated via `/api/roles/:id` endpoint
- Role is deleted
- Role is created with new permissions
- Backend logs show `[Cache MISS]` then `[Cache HIT]` on subsequent requests

**Backend automatically:**

- Invalidates role cache via `invalidateRoleCache()` in role service
- Re-caches permissions in Redis after role update
- Frontend gets fresh permissions on next API call

## API Reference

### useAuth Hook

```typescript
interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Role methods
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;

  // Permission methods
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  permissions: string[];
  role: string;

  // Actions
  login: (email, password) => Promise<{ success; error }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates) => void;

  // Profile
  profile: CurrentUser | null;
  profileImageId: string | null;
}
```

### PermissionGuard Component

```typescript
interface PermissionGuardProps {
  permission?: string; // Single permission to check
  permissions?: string[]; // Multiple permissions to check
  requireAll?: boolean; // Require ALL (default: false = ANY)
  fallback?: React.ReactNode; // Fallback if no permission
  children: React.ReactNode;
}
```

## Example: Converting from Role-Based to Permission-Based

### Before (Role-Based)

```typescript
// Old way - only checks role
{user.role === 'Admin' && (
  <button>Delete All Offers</button>
)}
```

### After (Permission-Based)

```typescript
// New way - checks specific permission
<PermissionGuard permission="offer:delete:all">
  <button>Delete All Offers</button>
</PermissionGuard>
```

## Summary

The permission system provides:

1. **Granular Control**: Different users with same role can have different UI access
2. **Database-Driven**: Permissions from backend, automatic updates
3. **Type-Safe**: TypeScript support for all permission strings
4. **Performant**: Zustand store for instant checks
5. **Reusable Components**: PermissionGuard for easy conditional rendering
6. **Flexible**: Single, any, or all permission checks

For questions or issues, refer to:

- Backend permissions: `[user-auth-service-api/src/auth/roles/permissions.js](leadpylot-microservices/user-auth-service-api/src/auth/roles/permissions.js)`
- Role mappings: `[user-auth-service-api/src/auth/roles/rolePermissions.js](leadpylot-microservices/user-auth-service-api/src/auth/roles/rolePermissions.js)`
