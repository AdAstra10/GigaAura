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
  WALLET_AURA_POINTS: 'gigaaura_wallet_aura_points_', // Prefix for wallet-specific aura points
};

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Clear all cached data
 */
export const clearCache = (): void => {
  if (!isBrowser) return;

  Object.values(CACHE_KEYS).forEach(key => {
    if (typeof key === 'string' && !key.includes('_wallet_aura_points_')) {
      localStorage.removeItem(key);
    }
  });
};

/**
 * Cache feed posts - SIMPLIFIED
 */
export const cacheFeed = (posts: Post[]): void => {
  if (!isBrowser) return;
  
  try {
    // Filter out any potentially problematic posts first
    const safePosts = posts.filter(post => 
      post && typeof post === 'object' && post.id
    );
    
    console.log('SAVING FEED TO CACHE', safePosts.length, 'posts');
    localStorage.setItem(CACHE_KEYS.FEED, JSON.stringify(safePosts));
    
    // Immediately verify the data was saved
    const savedData = localStorage.getItem(CACHE_KEYS.FEED);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log('VERIFIED FEED CACHE:', parsed.length, 'posts saved successfully');
    }
  } catch (error) {
    console.error('Error caching feed:', error);
  }
};

/**
 * Get cached feed posts - SIMPLIFIED
 */
export const getCachedFeed = (): Post[] | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedFeed = localStorage.getItem(CACHE_KEYS.FEED);
    console.log('GETTING CACHED FEED', cachedFeed ? 'found' : 'not found');
    if (!cachedFeed) return null;
    
    const parsed = JSON.parse(cachedFeed) as Post[];
    console.log('PARSED CACHED FEED', parsed.length, 'posts');
    return parsed;
  } catch (error) {
    console.error('Error getting cached feed:', error);
    return null;
  }
};

/**
 * Cache user posts - SIMPLIFIED
 */
export const cacheUserPosts = (posts: Post[]): void => {
  if (!isBrowser) return;
  
  try {
    // Filter out any potentially problematic posts
    const safePosts = posts.filter(post => 
      post && typeof post === 'object' && post.id
    );
    
    console.log('SAVING USER POSTS TO CACHE', safePosts.length, 'posts');
    localStorage.setItem(CACHE_KEYS.USER_POSTS, JSON.stringify(safePosts));
    
    // Immediately verify the data was saved
    const savedData = localStorage.getItem(CACHE_KEYS.USER_POSTS);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log('VERIFIED USER POSTS CACHE:', parsed.length, 'posts saved successfully');
    }
  } catch (error) {
    console.error('Error caching user posts:', error);
  }
};

/**
 * Get cached user posts - SIMPLIFIED
 */
export const getCachedUserPosts = (): Post[] | null => {
  if (!isBrowser) return null;
  
  try {
    const cachedPosts = localStorage.getItem(CACHE_KEYS.USER_POSTS);
    if (!cachedPosts) return null;
    
    const parsed = JSON.parse(cachedPosts) as Post[];
    console.log('PARSED CACHED USER POSTS', parsed.length, 'posts');
    return parsed;
  } catch (error) {
    console.error('Error getting cached user posts:', error);
    return null;
  }
};

/**
 * Cache Aura Points by wallet address - SIMPLIFIED
 */
export const cacheWalletAuraPoints = (walletAddress: string, pointsState: any): void => {
  if (!isBrowser || !walletAddress) return;
  
  try {
    const key = `${CACHE_KEYS.WALLET_AURA_POINTS}${walletAddress.toLowerCase()}`;
    console.log(`SAVING AURA POINTS FOR WALLET ${walletAddress}:`, pointsState);
    
    // First save the pure state
    localStorage.setItem(key, JSON.stringify(pointsState));
    
    // Immediately verify that the data was saved correctly
    const savedData = localStorage.getItem(key);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log('VERIFIED WALLET AURA POINTS:', parsed.totalPoints, 'points saved successfully');
    }
    
    // Also save a backup as direct wallet cache
    localStorage.setItem(`auraPoints_${walletAddress}`, JSON.stringify(pointsState));
    
    // Save total separately for quick access
    localStorage.setItem(`auraTotal_${walletAddress}`, String(pointsState.totalPoints));
  } catch (error) {
    console.error('Error caching Wallet Aura Points:', error);
  }
};

/**
 * Get cached Aura Points for specific wallet - SIMPLIFIED
 */
export const getWalletAuraPoints = (walletAddress: string): any | null => {
  if (!isBrowser || !walletAddress) return null;
  
  try {
    // Try the new format first
    const key = `${CACHE_KEYS.WALLET_AURA_POINTS}${walletAddress.toLowerCase()}`;
    const cachedPoints = localStorage.getItem(key);
    
    console.log(`GETTING WALLET AURA POINTS FOR ${walletAddress}:`, cachedPoints ? 'found' : 'not found');
    
    if (cachedPoints) {
      const parsed = JSON.parse(cachedPoints);
      console.log(`PARSED WALLET AURA POINTS:`, parsed);
      return parsed;
    }
    
    // Try legacy formats as fallback
    const legacyPoints = localStorage.getItem(`auraPoints_${walletAddress}`);
    if (legacyPoints) {
      console.log(`Found legacy aura points for ${walletAddress}`);
      return JSON.parse(legacyPoints);
    }
    
    const simpleTotalPoints = localStorage.getItem(`auraTotal_${walletAddress}`);
    if (simpleTotalPoints) {
      const totalPoints = parseInt(simpleTotalPoints, 10);
      console.log(`Found simple total points for ${walletAddress}:`, totalPoints);
      return { totalPoints, transactions: [] };
    }
    
    return null;
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
    localStorage.setItem(CACHE_KEYS.AURA_POINTS, JSON.stringify(pointsState));
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
    
    if (!cachedPoints) return null;
    return JSON.parse(cachedPoints);
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
    
    localStorage.setItem(CACHE_KEYS.AURA_TRANSACTIONS, JSON.stringify(safeTransactions));
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
    if (!cachedTransactions) return null;
    return JSON.parse(cachedTransactions);
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
    
    localStorage.setItem(CACHE_KEYS.NOTIFICATIONS, JSON.stringify(safeNotifications));
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
    if (!cachedNotifications) return null;
    return JSON.parse(cachedNotifications);
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
    if (!cachedProfile) return null;
    return JSON.parse(cachedProfile);
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
}; 