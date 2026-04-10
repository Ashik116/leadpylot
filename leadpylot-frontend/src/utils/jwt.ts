// Simple JWT decoder for client-side use
// Note: This only decodes the payload, it doesn't verify the signature
// For production, consider using a library like 'jose' for proper JWT handling

export interface JWTPayload {
  sub?: string;
  email?: string;
  role?: string;
  name?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));

    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    // Handle empty or invalid tokens
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return true;
    }

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return true;
    }

    // Check if token is expired (with 5 minute buffer)
    const currentTime = Math.floor(Date.now() / 1000);
    const bufferTime = 5 * 60; // 5 minutes in seconds

    return payload.exp < currentTime + bufferTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

export function extractUserRole(token: string): string {
  try {
    // Handle empty or invalid tokens
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return '';
    }

    const payload = decodeJWT(token);
    return payload?.role || '';
  } catch (error) {
    console.error('Error extracting user role:', error);
    return '';
  }
}

export function extractUserId(token: string): string {
  try {
    // Handle empty or invalid tokens
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return '';
    }

    const payload = decodeJWT(token);
    return payload?.sub || '';
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return '';
  }
}
