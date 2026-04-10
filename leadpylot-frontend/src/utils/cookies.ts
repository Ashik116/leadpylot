'use client';

import { ACCESS_TOKEN, REFRESH_TOKEN } from '@/constants/Constants';
import Cookies from 'js-cookie';

/**
 * Cookie utility functions for authentication
 * Provides type-safe methods to get, set, and remove cookies
 */

/**
 * Decode JWT token and check if it's expired
 * @param token - JWT token string
 * @returns Object with isValid boolean and decoded payload or null
 */
function decodeJWTToken(token: string): {
  isValid: boolean;
  payload: any | null;
} {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, payload: null };
    }

    // Decode payload (middle part)
    const payload = JSON.parse(atob(parts[1]));

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < currentTime;

    return { isValid: !isExpired, payload: isExpired ? null : payload };
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return { isValid: false, payload: null };
  }
}

// Default cookie options
const DEFAULT_OPTIONS = {
  expires: 1, // 1 day
  path: '/',
  secure: false, // Allow cookies in development
  sameSite: 'lax' as const, // Less restrictive for development
};

/**
 * Set authentication token in cookies
 * @param value - The token value to store
 * @param options - Cookie options (optional)
 */
export function setAuthToken(value: string, options = {}): void {
  Cookies.set(ACCESS_TOKEN, value, { ...DEFAULT_OPTIONS, ...options });
}

/**
 * Get authentication token from cookies
 * Validates token expiry and removes expired tokens automatically
 * @returns The token value or undefined if not found or expired
 */
export function getAuthToken(): string | undefined {
  const token = Cookies.get(ACCESS_TOKEN);

  if (!token) {
    return undefined;
  }

  // Validate token expiry
  const { isValid } = decodeJWTToken(token);

  if (!isValid) {
    // Token is expired or invalid, remove it from cookies
    removeAuthToken();
    return undefined;
  }

  return token;
}

/**
 * Remove authentication token from cookies
 */
export function removeAuthToken(): void {
  Cookies.remove(ACCESS_TOKEN, { path: '/' });
}

/**
 * Set refresh token in cookies
 * @param value - The refresh token value to store
 * @param options - Cookie options (optional)
 */
export function setRefreshToken(value: string, options = {}): void {
  Cookies.set(REFRESH_TOKEN, value, { ...DEFAULT_OPTIONS, ...options });
}

/**
 * Get refresh token from cookies
 * Validates token expiry and removes expired tokens automatically
 * @returns The refresh token value or undefined if not found or expired
 */
export function getRefreshToken(): string | undefined {
  const token = Cookies.get(REFRESH_TOKEN);

  if (!token) {
    return undefined;
  }

  // Validate token expiry
  const { isValid } = decodeJWTToken(token);

  if (!isValid) {
    // Token is expired or invalid, remove it from cookies
    removeRefreshToken();
    return undefined;
  }

  return token;
}

/**
 * Remove refresh token from cookies
 */
export function removeRefreshToken(): void {
  Cookies.remove(REFRESH_TOKEN, { path: '/' });
}

/**
 * Check if a token is valid without removing it from cookies
 * @param token - JWT token string
 * @returns True if token is valid and not expired
 */
export function isTokenValid(token: string): boolean {
  const { isValid } = decodeJWTToken(token);
  return isValid;
}

/**
 * Check if user is authenticated based on valid token presence
 * @returns True if authenticated with valid token, false otherwise
 */
export function isAuthenticated(): boolean {
  const token = Cookies.get(ACCESS_TOKEN);
  return token ? isTokenValid(token) : false;
}

/**
 * Set both authentication and refresh tokens in cookies
 * @param authToken - The access token value
 * @param refreshToken - The refresh token value
 * @param options - Cookie options (optional)
 */
export function setAuthTokens(authToken: string, options = {}): void {
  setAuthToken(authToken, options);
}

/**
 * Remove both authentication and refresh tokens from cookies
 */
export function removeAuthTokens(): void {
  removeAuthToken();
  removeRefreshToken();
}

/**
 * Set any cookie with options
 * @param key - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setCookie(key: string, value: string, options = {}): void {
  Cookies.set(key, value, { ...DEFAULT_OPTIONS, ...options });
}

/**
 * Get any cookie by key
 * @param key - Cookie name
 * @returns Cookie value or undefined
 */
export function getCookie(key: string): string | undefined {
  return Cookies.get(key);
}

/**
 * Remove any cookie by key
 * @param key - Cookie name
 * @param options - Cookie options
 */
export function removeCookie(key: string, options = {}): void {
  Cookies.remove(key, { path: '/', ...options });
}

/**
 * Clean up expired tokens from cookies
 * Removes any expired auth or refresh tokens
 */
export function cleanupExpiredTokens(): void {
  const authToken = Cookies.get(ACCESS_TOKEN);
  const refreshToken = Cookies.get(REFRESH_TOKEN);

  if (authToken && !isTokenValid(authToken)) {
    removeAuthToken();
  }

  if (refreshToken && !isTokenValid(refreshToken)) {
    removeRefreshToken();
  }
}

/**
 * Clear all cookies (useful for logout)
 */
export function clearAllCookies(): void {
  // Get all cookies
  const cookies = document.cookie.split(';');

  // Remove each cookie
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
  }
}
