# Authentik SSO Integration Setup Guide

This guide explains how to configure Authentik as a Single Sign-On (SSO) provider for your CRM system.

## Overview

The integration uses OAuth 2.0 / OpenID Connect (OIDC) protocol with PKCE (Proof Key for Code Exchange) for secure authentication.

### Flow Diagram

```
┌─────────┐     ┌─────────────┐     ┌───────────┐     ┌─────────────┐
│ Browser │────▶│  Frontend   │────▶│  Backend  │────▶│  Authentik  │
│         │     │  (React)    │     │  (Node)   │     │   (IdP)     │
└─────────┘     └─────────────┘     └───────────┘     └─────────────┘
     │                │                   │                  │
     │  Click SSO     │                   │                  │
     │───────────────▶│                   │                  │
     │                │  Get Auth URL     │                  │
     │                │──────────────────▶│                  │
     │                │                   │                  │
     │                │◀──────────────────│                  │
     │  Redirect to Authentik             │                  │
     │───────────────────────────────────────────────────────▶
     │                                                       │
     │  User Login at Authentik                              │
     │◀──────────────────────────────────────────────────────│
     │                                                       │
     │  Callback with code                │                  │
     │───────────────▶│──────────────────▶│                  │
     │                │                   │ Exchange code    │
     │                │                   │─────────────────▶│
     │                │                   │◀─────────────────│
     │                │                   │ Get user info    │
     │                │                   │─────────────────▶│
     │                │                   │◀─────────────────│
     │                │                   │                  │
     │                │  Token + User     │                  │
     │◀──────────────────────────────────│                  │
     │                │                   │                  │
```

## Step 1: Configure Authentik

### 1.1 Create an Application in Authentik

1. Log in to your Authentik admin panel
2. Navigate to **Applications** → **Applications**
3. Click **Create**
4. Fill in:
   - **Name**: `LeadPylot CRM` (or your app name)
   - **Slug**: `leadpylot-crm`
   - **Provider**: (we'll create this next)

### 1.2 Create an OAuth2/OIDC Provider

1. Navigate to **Applications** → **Providers**
2. Click **Create**
3. Select **OAuth2/OpenID Provider**
4. Configure:
   - **Name**: `LeadPylot CRM Provider`
   - **Authorization flow**: Select your preferred flow (typically `default-provider-authorization-implicit-consent`)
   - **Client type**: `Confidential`
   - **Client ID**: Auto-generated (copy this)
   - **Client Secret**: Auto-generated (copy this)
   - **Redirect URIs/Origins**:
     ```
     http://localhost:3001/auth/authentik/callback
     https://your-api-domain.com/auth/authentik/callback
     ```
   - **Signing Key**: Select a signing key or create one
   
5. Under **Advanced protocol settings**:
   - **Access code validity**: `60` (seconds)
   - **Access Token validity**: `86400` (24 hours)
   - **Refresh Token validity**: `2592000` (30 days)
   - **Scopes**: `openid`, `profile`, `email`
   - **Subject mode**: `Based on the User's Email`

6. Save the provider

### 1.3 Link Provider to Application

1. Go back to your Application
2. Set the **Provider** to the one you just created
3. Save

## Step 2: Configure Backend Environment

Add the following environment variables to your `.env` file in `user-auth-service-api`:

```env
# Authentik SSO Configuration
AUTHENTIK_BASE_URL=https://authentik.yourdomain.com
AUTHENTIK_CLIENT_ID=your_client_id_from_step_1
AUTHENTIK_CLIENT_SECRET=your_client_secret_from_step_1
AUTHENTIK_REDIRECT_URI=http://localhost:3001/auth/authentik/callback

# Frontend URL for redirects after authentication
FRONTEND_URL=http://localhost:3000
```

### Production Configuration

```env
# Production Authentik SSO Configuration
AUTHENTIK_BASE_URL=https://authentik.yourdomain.com
AUTHENTIK_CLIENT_ID=your_production_client_id
AUTHENTIK_CLIENT_SECRET=your_production_client_secret
AUTHENTIK_REDIRECT_URI=https://api.yourdomain.com/auth/authentik/callback
FRONTEND_URL=https://app.yourdomain.com
```

## Step 3: User Mapping

The system matches Authentik users to CRM users using the following strategies (in order):

1. **By Email**: Matches `email` from Authentik with `email` or `login` field in CRM User
2. **By Username**: Matches `preferred_username` from Authentik with `login` field in CRM
3. **By Authentik ID**: Matches `sub` claim with `authentik_id` field in CRM (for returning users)

### Important Notes

- Users must **exist in the CRM database** before they can log in via Authentik
- The system does NOT auto-create users from Authentik
- An admin must create the user account first (with matching email/login)
- After first SSO login, the `authentik_id` is stored for faster future lookups

### Matching a CRM User to Authentik

Ensure that each CRM user's `login` or `email` field matches their Authentik username or email:

```javascript
// Example: User in CRM
{
  login: "john.doe@company.com",  // Must match Authentik email or username
  email: "john.doe@company.com",  // Optional but recommended
  role: "Agent",
  active: true
}
```

## Step 4: API Endpoints

The following endpoints are available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/authentik/status` | GET | Check if SSO is configured |
| `/auth/authentik/url` | GET | Get authorization URL for frontend |
| `/auth/authentik` | GET | Initiate OAuth flow (redirect) |
| `/auth/authentik/callback` | GET | OAuth callback (redirect from Authentik) |
| `/auth/authentik/callback` | POST | OAuth callback (API mode for SPAs) |
| `/auth/authentik/logout` | GET | Get Authentik logout URL |

## Step 5: Frontend Integration

The frontend automatically shows the "Sign in with SSO" button if Authentik is configured.

### How It Works

1. Frontend calls `/auth/authentik/status` to check if SSO is enabled
2. If enabled, shows the SSO button
3. On click, gets authorization URL from `/auth/authentik/url`
4. Redirects user to Authentik login page
5. After login, Authentik redirects to `/auth/authentik/callback`
6. Backend validates the code, gets user info, matches CRM user
7. Redirects to frontend `/auth/callback` with token
8. Frontend stores token and redirects to dashboard

## Troubleshooting

### "No matching account found in the CRM"

The user's email/username in Authentik doesn't match any user in the CRM database.

**Solution**: Create a user in the CRM with the same email or username as in Authentik.

### "SSO is not configured"

The required environment variables are missing.

**Solution**: Verify all `AUTHENTIK_*` environment variables are set correctly.

### "Invalid or expired state parameter"

The OAuth state expired (>10 minutes) or was tampered with.

**Solution**: Try the login process again.

### "Account is disabled"

The matched CRM user has `active: false`.

**Solution**: Enable the user account in the CRM admin panel.

## Security Considerations

1. **PKCE**: The implementation uses PKCE (S256) to prevent authorization code interception attacks
2. **State Parameter**: Random state prevents CSRF attacks
3. **Token Storage**: Tokens are stored securely and hashed in sessions
4. **Short-lived Codes**: Authorization codes expire quickly (60 seconds default)
5. **HTTPS**: Always use HTTPS in production

## Testing

1. Set up Authentik with the configuration above
2. Create a test user in both Authentik and your CRM (same email)
3. Start the backend and frontend
4. Navigate to the sign-in page
5. Click "Sign in with SSO"
6. Log in with your Authentik credentials
7. Verify you're redirected to the dashboard
