/**
 * Storage Utilities
 * Handles browser storage with error handling for disk space issues
 */

/**
 * Safely set localStorage item with error handling
 */
export const safeSetLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    // Handle quota exceeded errors
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn('localStorage quota exceeded, attempting cleanup...');
      
      // Try to clear old data
      try {
        // Clear non-essential storage
        const keysToKeep = ['auth', 'selected-project', 'default-api'];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((k) => {
          if (!keysToKeep.includes(k)) {
            localStorage.removeItem(k);
          }
        });
        
        // Retry
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Failed to free localStorage space:', retryError);
        return false;
      }
    }
    
    // Handle other errors (e.g., disk full)
    if (error.message?.includes('No space left') || error.message?.includes('os error 28')) {
      console.error('Disk space full - cannot write to localStorage');
      return false;
    }
    
    console.error('localStorage error:', error);
    return false;
  }
};

/**
 * Safely get localStorage item
 */
export const safeGetLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('localStorage get error:', error);
    return null;
  }
};

/**
 * Safely remove localStorage item
 */
export const safeRemoveLocalStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('localStorage remove error:', error);
    return false;
  }
};

/**
 * Safely set sessionStorage item with error handling
 */
export const safeSetSessionStorage = (key: string, value: string): boolean => {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn('sessionStorage quota exceeded');
      return false;
    }
    if (error.message?.includes('No space left') || error.message?.includes('os error 28')) {
      console.error('Disk space full - cannot write to sessionStorage');
      return false;
    }
    console.error('sessionStorage error:', error);
    return false;
  }
};

/**
 * Safely get sessionStorage item
 */
export const safeGetSessionStorage = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('sessionStorage get error:', error);
    return null;
  }
};

/**
 * Clear all non-essential storage
 */
export const clearNonEssentialStorage = (): void => {
  try {
    const essentialKeys = ['auth', 'selected-project', 'default-api'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach((key) => {
      if (!essentialKeys.some((essential) => key.includes(essential))) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear all sessionStorage (it's temporary anyway)
    sessionStorage.clear();
    
    console.log('Cleared non-essential storage');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};
