/**
 * Caching Service — from The-Design-Lab---TPL-X-YDS
 * TTL-based cache with stale-while-revalidate support
 * PORT TO: Could enhance server/services/notion.js cache or create shared cache util
 */

interface CachedData<T> {
  expiry: number;
  data: T;
}

export const setCache = <T>(key: string, data: T, ttlMinutes: number): void => {
  const now = new Date();
  const expiry = now.getTime() + ttlMinutes * 60 * 1000;
  const item: CachedData<T> = {
    data,
    expiry,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`Error setting cache for key "${key}":`, error);
  }
};

export const getCache = <T>(key: string): T | null => {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }

    const item: CachedData<T> = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch (error) {
    console.error(`Error getting cache for key "${key}":`, error);
    return null;
  }
};

/**
 * Gets an item from cache regardless of expiry.
 * Useful for "stale-while-revalidate" strategies.
 */
export const getAnyCache = <T>(key: string): T | null => {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    const item: CachedData<T> = JSON.parse(itemStr);
    return item.data;
  } catch (error) {
    console.error(`Error getting any cache for key "${key}":`, error);
    return null;
  }
};

export const clearSheetCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sheet_data_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error("Error clearing sheet data cache:", error);
  }
};
