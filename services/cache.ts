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
};

// Cache expiration in milliseconds (24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

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
 * Cache feed posts
 */
export const cacheFeed = (posts: Post[]): void => {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(CACHE_KEYS.FEED, JSON.stringify(posts));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching feed:', error);
  }
};

/**
 * Get cached feed posts
 */
export const getCachedFeed = (): Post[] | null => {
  if (!isBrowser || isCacheExpired()) return null;
  
  try {
    const cachedFeed = localStorage.getItem(CACHE_KEYS.FEED);
    return cachedFeed ? JSON.parse(cachedFeed) : null;
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
    localStorage.setItem(CACHE_KEYS.USER_POSTS, JSON.stringify(posts));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching user posts:', error);
  }
};

/**
 * Get cached user posts
 */
export const getCachedUserPosts = (): Post[] | null => {
  if (!isBrowser || isCacheExpired()) return null;
  
  try {
    const cachedPosts = localStorage.getItem(CACHE_KEYS.USER_POSTS);
    return cachedPosts ? JSON.parse(cachedPosts) : null;
  } catch (error) {
    console.error('Error getting cached user posts:', error);
    return null;
  }
};

/**
 * Cache Aura Points total
 */
export const cacheAuraPoints = (points: number): void => {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(CACHE_KEYS.AURA_POINTS, points.toString());
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching Aura Points:', error);
  }
};

/**
 * Get cached Aura Points total
 */
export const getCachedAuraPoints = (): number | null => {
  if (!isBrowser || isCacheExpired()) return null;
  
  try {
    const cachedPoints = localStorage.getItem(CACHE_KEYS.AURA_POINTS);
    return cachedPoints ? parseInt(cachedPoints, 10) : null;
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
    localStorage.setItem(CACHE_KEYS.AURA_TRANSACTIONS, JSON.stringify(transactions));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching Aura Transactions:', error);
  }
};

/**
 * Get cached Aura Transactions
 */
export const getCachedAuraTransactions = (): AuraTransaction[] | null => {
  if (!isBrowser || isCacheExpired()) return null;
  
  try {
    const cachedTransactions = localStorage.getItem(CACHE_KEYS.AURA_TRANSACTIONS);
    return cachedTransactions ? JSON.parse(cachedTransactions) : null;
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
    localStorage.setItem(CACHE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching notifications:', error);
  }
};

/**
 * Get cached notifications
 */
export const getCachedNotifications = (): Notification[] | null => {
  if (!isBrowser || isCacheExpired()) return null;
  
  try {
    const cachedNotifications = localStorage.getItem(CACHE_KEYS.NOTIFICATIONS);
    return cachedNotifications ? JSON.parse(cachedNotifications) : null;
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
    localStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
    updateCacheTimestamp();
  } catch (error) {
    console.error('Error caching user profile:', error);
  }
};

/**
 * Get cached user profile
 */
export const getCachedUserProfile = (): any | null => {
  if (!isBrowser || isCacheExpired()) return null;
  
  try {
    const cachedProfile = localStorage.getItem(CACHE_KEYS.USER_PROFILE);
    return cachedProfile ? JSON.parse(cachedProfile) : null;
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
}; 