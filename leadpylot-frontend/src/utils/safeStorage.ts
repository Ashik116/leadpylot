/**
 * Safe Storage Wrapper for Zustand
 * Handles storage errors gracefully to prevent app crashes
 */

import { StateStorage } from 'zustand/middleware';

/**
 * Creates a safe localStorage wrapper that handles errors
 */
export const createSafeLocalStorage = (): StateStorage => {
  return {
    getItem: (name: string): string | null => {
      try {
        return localStorage.getItem(name);
      } catch (error: any) {
        console.warn(`Failed to read from localStorage (${name}):`, error.message);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        localStorage.setItem(name, value);
      } catch (error: any) {
        // Handle quota exceeded or disk full errors
        if (error.name === 'QuotaExceededError' || error.code === 22 || 
            error.message?.includes('No space left') || error.message?.includes('os error 28')) {
          console.warn(`Storage quota exceeded for ${name}. Attempting cleanup...`);
          
          try {
            // Try to free up space by removing old/non-essential items
            const essentialKeys = ['auth', 'selected-project', 'default-api'];
            const allKeys = Object.keys(localStorage);
            let freedSpace = false;
            
            allKeys.forEach((key) => {
              if (!essentialKeys.some((essential) => key.includes(essential))) {
                try {
                  localStorage.removeItem(key);
                  freedSpace = true;
                } catch (e) {
                  // Ignore errors when removing items
                }
              }
            });
            
            if (freedSpace) {
              // Retry setting the item
              try {
                localStorage.setItem(name, value);
                console.log(`Successfully saved ${name} after cleanup`);
                return;
              } catch (retryError) {
                console.error(`Still failed after cleanup:`, retryError);
              }
            }
          } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
          }
          
          console.error(`Cannot save ${name} - disk space full or quota exceeded`);
        } else {
          console.error(`Failed to write to localStorage (${name}):`, error);
        }
      }
    },
    removeItem: (name: string): void => {
      try {
        localStorage.removeItem(name);
      } catch (error: any) {
        console.warn(`Failed to remove from localStorage (${name}):`, error.message);
      }
    },
  };
};

/**
 * Creates a safe sessionStorage wrapper that handles errors
 */
export const createSafeSessionStorage = (): StateStorage => {
  return {
    getItem: (name: string): string | null => {
      try {
        return sessionStorage.getItem(name);
      } catch (error: any) {
        console.warn(`Failed to read from sessionStorage (${name}):`, error.message);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        sessionStorage.setItem(name, value);
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22 ||
            error.message?.includes('No space left') || error.message?.includes('os error 28')) {
          console.warn(`SessionStorage quota exceeded for ${name}`);
          
          // Try to clear old sessionStorage data
          try {
            const currentKey = name;
            const allKeys = Object.keys(sessionStorage);
            allKeys.forEach((key) => {
              if (key !== currentKey) {
                try {
                  sessionStorage.removeItem(key);
                } catch (e) {
                  // Ignore
                }
              }
            });
            
            // Retry
            sessionStorage.setItem(name, value);
            return;
          } catch (retryError) {
            console.error(`Cannot save ${name} to sessionStorage - disk space full`);
          }
        } else {
          console.error(`Failed to write to sessionStorage (${name}):`, error);
        }
      }
    },
    removeItem: (name: string): void => {
      try {
        sessionStorage.removeItem(name);
      } catch (error: any) {
        console.warn(`Failed to remove from sessionStorage (${name}):`, error.message);
      }
    },
  };
};
