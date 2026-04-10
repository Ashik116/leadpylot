# Custom Authentication Migration Guide

This document outlines the migration from NextAuth to a custom authentication system using Zustand and React Context.

## Overview

The authentication system has been completely migrated from NextAuth to a custom solution that provides:

- **Zustand Store**: Centralized state management for authentication
- **React Context**: Provider pattern for authentication data
- **Custom Hooks**: Easy-to-use authentication hooks
- **JWT Handling**: Client-side JWT decoding and validation
- **Middleware Support**: Server-side route protection

## Key Components

### 1. Authentication Store (`src/stores/authStore.ts`)

The Zustand store manages authentication state:

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshToken: (newToken: string) => void;
}
```

### 2. Authentication Service (`src/services/authService.ts`)

Handles API calls and token management:

- Login/logout operations
- Token refresh
- Token validation
- Cookie management for server-side auth

### 3. Authentication Provider (`src/components/providers/AuthProvider/AuthProvider.tsx`)

React Context provider that wraps the application:

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}
```

### 4. Custom Hook (`src/hooks/useAuth.ts`)

Easy-to-use hook for authentication:

```typescript
const { user, isAuthenticated, login, logout, hasRole } = useAuth();
```

### 5. JWT Utilities (`src/utils/jwt.ts`)

Client-side JWT handling:

- Token decoding
- Expiration checking
- Role extraction

### 6. Middleware (`src/middleware.ts`)

Server-side route protection:

- Token validation from cookies
- Role-based access control
- Route redirection

## Usage Examples

### Login

```typescript
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();

const handleLogin = async (email: string, password: string) => {
  const result = await login(email, password);
  if (result.success) {
    // Redirect to dashboard
  } else {
    // Handle error
    console.error(result.error);
  }
};
```

### Check Authentication Status

```typescript
import { useAuth } from '@/hooks/useAuth';

const { isAuthenticated, user } = useAuth();

if (isAuthenticated && user) {
  console.log('User is logged in:', user.name);
}
```

### Role-Based Access Control

```typescript
import { useAuth } from '@/hooks/useAuth';

const { hasRole, hasAnyRole } = useAuth();

// Check specific role
if (hasRole('Admin')) {
  // Show admin features
}

// Check multiple roles
if (hasAnyRole(['Admin', 'Agent'])) {
  // Show shared features
}
```

### Logout

```typescript
import { useAuth } from '@/hooks/useAuth';

const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // User will be redirected to sign-in page
};
```

## Migration Changes

### Removed Files

- `src/auth.ts` - NextAuth configuration
- `src/configs/auth.config.ts` - NextAuth config

### Updated Files

- `src/middleware.ts` - Custom authentication middleware
- `src/components/auth/SignIn/SignInClient.tsx` - Uses new auth system
- `src/components/auth/LogoutButton.tsx` - Uses new auth system
- `src/app/layout.tsx` - Removed NextAuth dependencies
- `src/components/providers/index.tsx` - Added AuthProvider

### New Files

- `src/stores/authStore.ts` - Zustand authentication store
- `src/services/authService.ts` - Authentication service
- `src/components/providers/AuthProvider/` - New auth provider components
- `src/hooks/useAuth.ts` - Custom authentication hook
- `src/utils/jwt.ts` - JWT utilities

## Configuration

### Environment Variables

The following environment variables are no longer needed:
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`

### Dependencies

Removed from `package.json`:
- `next-auth`

## Security Considerations

1. **JWT Decoding**: The current implementation only decodes JWT payloads. For production, consider using a library like `jose` for proper JWT verification.

2. **Token Storage**: Tokens are stored in both localStorage and cookies. Cookies are used for server-side middleware, while localStorage is used for client-side persistence.

3. **Token Expiration**: The system automatically checks token expiration and attempts to refresh expired tokens.

4. **CSRF Protection**: Consider implementing CSRF protection for sensitive operations.

## Testing

To test the new authentication system:

1. Start the development server
2. Navigate to `/sign-in`
3. Use valid credentials to log in
4. Verify that you're redirected to the appropriate dashboard
5. Test role-based access control
6. Test logout functionality

## Troubleshooting

### Common Issues

1. **Authentication not persisting**: Check that localStorage is enabled and cookies are being set properly.

2. **Middleware not working**: Verify that the `auth-token` cookie is being set and the middleware can read it.

3. **Role-based access issues**: Ensure that the JWT payload contains the correct role information.

### Debug Mode

Enable debug logging by checking the browser console for authentication-related messages.

## Future Enhancements

1. **JWT Verification**: Implement proper JWT signature verification
2. **Refresh Token Rotation**: Implement refresh token rotation for better security
3. **Multi-factor Authentication**: Add support for MFA
4. **Session Management**: Add session management features
5. **Audit Logging**: Implement authentication audit logging
