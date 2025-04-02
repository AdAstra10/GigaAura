/**
 * Simple caching service for GigaAura
 * Provides methods to persist and retrieve data from localStorage
 */

import { Post } from '@lib/slices/postsSlice';
import { AuraTransaction } from '@lib/slices/auraPointsSlice';
import { Notification } from '@lib/slices/notificationsSlice';

// Cache keys
const CACHE_KEYS = {
  FEED: 'gigaaura_feed',
  USER_POSTS: 'gigaaura_user_posts',
  AURA_POINTS: 'gigaaura_aura_points',
  AURA_TRANSACTIONS: 'gigaaura_aura_transactions',
  NOTIFICATIONS: 'gigaaura_notifications',
  USER_PROFILE: 'gigaaura_user_profile',
  CACHE_TIMESTAMP: 'gigaaura_cache_timestamp',
  WALLET_AURA_POINTS: 'gigaaura_wallet_aura_points_', // Prefix for wallet-specific aura points
};

// Cache expiration in milliseconds (7 days instead of 24 hours for longer post persistence)
const CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get current timestamp
 */
const getCurrentTimestamp = (): number => Date.now();

/**
 * Update the cache timestamp
 */
const updateCacheTimestamp = (): void => {
  if (!isBrowser) return;
  localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, getCurrentTimestamp().toString());
};

/**
 * Check if cache is expired
 */
const isCacheExpired = (): boolean => {
  if (!isBrowser) return true;

  const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
  if (!timestamp) return true;

  const cacheTime = parseInt(timestamp, 10);
  const now = getCurrentTimestamp();
  
  return now - cacheTime > CACHE_EXPIRATION;
};

/**
 * Clear all cached data
 */
export const clearCache = (): void => {
  if (!isBrowser) return;

  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Safely stringify data to prevent circular reference errors
 * @param data Data to stringify 
 */
const safeStringify = (data: any): string => {
  try {
    // Handle common edge cases
    if (data === null || data === undefined) {
      return '""';
    }
    
    // Remove circular references
    const seen = new WeakSet();
    return JSON.stringify(data, (key, value) => {
      // Handle null values explicitly
      if (value === null || value === undefined) {
        return value === null ? null : undefined;
      }
      
      // Detect circular reference
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'; // Replace circular reference
        }
        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    console.error('Error in safeStringify:', error);
    return JSON.stringify(null); // Return null string as fallback
  }
};

/**
 * Safely parse JSON string with error handling
 * @param str JSON string to parse
 */
const safeParse = <T>(str: string | null): T | null => {
  if (!str) return null;
  
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    console.error('Error in safeParse:', error);
    return null;
  }
};

/**
 * Cache feed posts
 */
export const cacheFeed = (posts: Post[]): void => {
  if (!isBrowser) return;
  
  try {
    // Filter out any potentially problematic posts first
    const safePosts = posts.filter(post => 
      post && typeof post === 'object' && post.id
    );
    
    localStorage.setItem(CACHE_KEYS.FEED, safeStringify(safePosts));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching feed:', error);
  }
};

/**
 * Get cached feed posts - without expiration check for feed to ensure posts remain
 */
export const getCachedFeed = (): Post[] | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedFeed = localStorage.getItem(CACHE_KEYS.FEED);
    return safeParse<Post[]>(cachedFeed);
  } catch (error) {
    console.error('Error getting cached feed:', error);
    return null;
  }
};

/**
 * Cache user posts
 */
export const cacheUserPosts = (posts: Post[]): void => {
  if (!isBrowser) return;
  
  try {
    // Filter out any potentially problematic posts first
    const safePosts = posts.filter(post => 
      post && typeof post === 'object' && post.id
    );
    
    localStorage.setItem(CACHE_KEYS.USER_POSTS, safeStringify(safePosts));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching user posts:', error);
  }
};

/**
 * Get cached user posts
 */
export const getCachedUserPosts = (): Post[] | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedPosts = localStorage.getItem(CACHE_KEYS.USER_POSTS);
    return safeParse<Post[]>(cachedPosts);
  } catch (error) {
    console.error('Error getting cached user posts:', error);
    return null;
  }
};

/**
 * Cache Aura Points by wallet address
 * @param walletAddress The wallet address to use as a key
 * @param pointsState The full Aura Points state object to cache
 */
export const cacheWalletAuraPoints = (walletAddress: string, pointsState: any): void => {
  if (!isBrowser || !walletAddress) return;
  
  try {
    const key = `${CACHE_KEYS.WALLET_AURA_POINTS}${walletAddress.toLowerCase()}`;
    localStorage.setItem(key, safeStringify(pointsState));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching Wallet Aura Points:', error);
  }
};

/**
 * Get cached Aura Points for specific wallet
 * @param walletAddress The wallet address to lookup
 */
export const getWalletAuraPoints = (walletAddress: string): any | null => {
  if (!isBrowser || !walletAddress) return null;
  
  try {
    const key = `${CACHE_KEYS.WALLET_AURA_POINTS}${walletAddress.toLowerCase()}`;
    const cachedPoints = localStorage.getItem(key);
    console.log(`Getting wallet aura points for ${walletAddress}:`, cachedPoints);
    
    // Return parsed data
    const result = safeParse(cachedPoints);
    console.log(`Parsed wallet aura points:`, result);
    return result;
  } catch (error) {
    console.error('Error getting cached Wallet Aura Points:', error);
    return null;
  }
};

/**
 * Cache Aura Points total - UPDATED to store full state object instead of just number
 */
export const cacheAuraPoints = (pointsState: any): void => {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(CACHE_KEYS.AURA_POINTS, safeStringify(pointsState));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching Aura Points:', error);
  }
};

/**
 * Get cached Aura Points - UPDATED to return full state object
 */
export const getCachedAuraPoints = (): any | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedPoints = localStorage.getItem(CACHE_KEYS.AURA_POINTS);
    console.log('Retrieved cached Aura Points:', cachedPoints);
    
    // If it's a simple number (legacy format), convert to object
    if (cachedPoints && !isNaN(Number(cachedPoints))) {
      console.log('Converting legacy number format to object');
      return { total: parseInt(cachedPoints, 10), transactions: [] };
    }
    
    return safeParse(cachedPoints);
  } catch (error) {
    console.error('Error getting cached Aura Points:', error);
    return null;
  }
};

/**
 * Cache Aura Transactions
 */
export const cacheAuraTransactions = (transactions: AuraTransaction[]): void => {
  if (!isBrowser) return;
  
  try {
    // Filter out any potentially problematic transactions
    const safeTransactions = transactions.filter(tx => 
      tx && typeof tx === 'object' && tx.id
    );
    
    localStorage.setItem(CACHE_KEYS.AURA_TRANSACTIONS, safeStringify(safeTransactions));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching Aura Transactions:', error);
  }
};

/**
 * Get cached Aura Transactions
 */
export const getCachedAuraTransactions = (): AuraTransaction[] | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedTransactions = localStorage.getItem(CACHE_KEYS.AURA_TRANSACTIONS);
    return safeParse<AuraTransaction[]>(cachedTransactions);
  } catch (error) {
    console.error('Error getting cached Aura Transactions:', error);
    return null;
  }
};

/**
 * Cache notifications
 */
export const cacheNotifications = (notifications: Notification[]): void => {
  if (!isBrowser) return;
  
  try {
    // Filter out any potentially problematic notifications
    const safeNotifications = notifications.filter(n => 
      n && typeof n === 'object' && n.id
    );
    
    localStorage.setItem(CACHE_KEYS.NOTIFICATIONS, safeStringify(safeNotifications));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching notifications:', error);
  }
};

/**
 * Get cached notifications
 */
export const getCachedNotifications = (): Notification[] | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedNotifications = localStorage.getItem(CACHE_KEYS.NOTIFICATIONS);
    return safeParse<Notification[]>(cachedNotifications);
  } catch (error) {
    console.error('Error getting cached notifications:', error);
    return null;
  }
};

/**
 * Cache user profile
 */
export const cacheUserProfile = (profile: any): void => {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(CACHE_KEYS.USER_PROFILE, safeStringify(profile));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching user profile:', error);
  }
};

/**
 * Get cached user profile
 */
export const getCachedUserProfile = (): any | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedProfile = localStorage.getItem(CACHE_KEYS.USER_PROFILE);
    return safeParse<any>(cachedProfile);
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
}; 