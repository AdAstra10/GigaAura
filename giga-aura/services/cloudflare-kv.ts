/**
 * Cloudflare KV Database Service for GigaAura (DEPRECATED)
 * 
 * This is a legacy adapter for Cloudflare KV that is maintained for backward compatibility only.
 * The application has migrated to PostgreSQL as its primary database.
 * 
 * This implementation provides the same interface as the PostgreSQL service
 * but relies on local storage only and logs warnings about using a deprecated service.
 */

import { Post, Comment } from '@lib/slices/postsSlice';
import { AuraPointsState, AuraTransaction } from '@lib/slices/auraPointsSlice';

// In-memory cache for offline functionality
let postsCache: Post[] = [];

// Warn that this service is deprecated
console.warn(
  'DEPRECATED: The Cloudflare KV database service is deprecated and will be removed in a future update. ' +
  'Please use the PostgreSQL database service instead.'
);

// Initialize cache from localStorage
if (typeof window !== 'undefined') {
  try {
    const cachedPosts = localStorage.getItem('giga-aura-posts');
    if (cachedPosts) {
      const parsed = JSON.parse(cachedPosts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        postsCache = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to initialize Cloudflare KV cache from localStorage:', e);
  }
}

/**
 * Save a post to the local storage (Cloudflare KV is deprecated)
 */
export const savePost = async (post: Post): Promise<boolean> => {
  console.warn('Using deprecated Cloudflare KV service for saving post');
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`giga-aura-post-${post.id}`, JSON.stringify(post));
      
      const existingPostIndex = postsCache.findIndex(p => p.id === post.id);
      if (existingPostIndex >= 0) {
        postsCache = [
          ...postsCache.slice(0, existingPostIndex),
          post,
          ...postsCache.slice(existingPostIndex + 1)
        ];
      } else {
        postsCache = [post, ...postsCache];
      }
      
      localStorage.setItem('giga-aura-posts', JSON.stringify(postsCache));
    } catch (e) {
      console.error('Failed to save post to localStorage:', e);
    }
  }
  
  return true;
};

/**
 * Get all posts from local storage (Cloudflare KV is deprecated)
 */
export const getPosts = async (): Promise<Post[]> => {
  console.warn('Using deprecated Cloudflare KV service for getting posts');
  return postsCache;
};

/**
 * Get a post by ID from local storage (Cloudflare KV is deprecated)
 */
export const getPost = async (id: string): Promise<Post | null> => {
  console.warn('Using deprecated Cloudflare KV service for getting post by ID');
  
  if (typeof window !== 'undefined') {
    try {
      const post = localStorage.getItem(`giga-aura-post-${id}`);
      if (post) {
        return JSON.parse(post);
      }
    } catch (e) {
      console.error('Failed to get post from localStorage:', e);
    }
  }
  
  return postsCache.find(p => p.id === id) || null;
};

/**
 * Delete a post from local storage (Cloudflare KV is deprecated)
 */
export const deletePost = async (id: string): Promise<boolean> => {
  console.warn('Using deprecated Cloudflare KV service for deleting post');
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`giga-aura-post-${id}`);
      
      const existingPostIndex = postsCache.findIndex(p => p.id === id);
      if (existingPostIndex >= 0) {
        postsCache = [
          ...postsCache.slice(0, existingPostIndex),
          ...postsCache.slice(existingPostIndex + 1)
        ];
        localStorage.setItem('giga-aura-posts', JSON.stringify(postsCache));
      }
    } catch (e) {
      console.error('Failed to delete post from localStorage:', e);
      return false;
    }
  }
  
  return true;
};

/**
 * Save aura points to local storage (Cloudflare KV is deprecated)
 */
export const saveAuraPoints = async (walletAddress: string, auraPoints: number, transaction?: AuraTransaction): Promise<boolean> => {
  console.warn('Using deprecated Cloudflare KV service for saving aura points');
  
  if (typeof window !== 'undefined') {
    try {
      const storedPoints = localStorage.getItem(`giga-aura-points-${walletAddress}`);
      let pointsData: AuraPointsState = storedPoints ? JSON.parse(storedPoints) : { 
        totalPoints: 100, 
        transactions: [],
      };
      
      pointsData.totalPoints = auraPoints;
      
      if (transaction) {
        pointsData.transactions = [transaction, ...pointsData.transactions];
      }
      
      localStorage.setItem(`giga-aura-points-${walletAddress}`, JSON.stringify(pointsData));
    } catch (e) {
      console.error('Failed to save aura points to localStorage:', e);
      return false;
    }
  }
  
  return true;
};

/**
 * Get aura points from local storage (Cloudflare KV is deprecated)
 */
export const getAuraPoints = async (walletAddress: string): Promise<AuraPointsState | null> => {
  console.warn('Using deprecated Cloudflare KV service for getting aura points');
  
  if (typeof window !== 'undefined') {
    try {
      const storedPoints = localStorage.getItem(`giga-aura-points-${walletAddress}`);
      if (storedPoints) {
        return JSON.parse(storedPoints);
      }
    } catch (e) {
      console.error('Failed to get aura points from localStorage:', e);
    }
  }
  
  return { totalPoints: 100, transactions: [] };
};

// Export all functions as the default object to match the interface of other database services
export default {
  savePost,
  getPosts,
  getPost,
  deletePost,
  saveAuraPoints,
  getAuraPoints
}; 