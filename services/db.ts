/**
 * Local Database Service for GigaAura
 * This is a localStorage-only implementation with no Firebase dependencies
 */

import { Post } from '@lib/slices/postsSlice';
import { AuraPointsState, AuraTransaction } from '@lib/slices/auraPointsSlice';

// In-memory post cache for immediate display without waiting for API
let postsCache: Post[] = [];
let activeListeners: (() => void)[] = [];

// Initialize caches from localStorage on startup
if (typeof window !== 'undefined') {
  try {
    // Try to restore posts cache
    const cachedPosts = localStorage.getItem('giga-aura-posts');
    if (cachedPosts) {
      const parsed = JSON.parse(cachedPosts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        postsCache = parsed;
        console.log('Restored posts cache from localStorage:', postsCache.length);
      }
    }
  } catch (e) {
    console.warn('Failed to initialize cache from localStorage:', e);
  }
}

/**
 * Get local posts from localStorage
 */
const getLocalPosts = (): Post[] => {
  try {
    if (typeof window !== 'undefined') {
      const cachedPosts = localStorage.getItem('giga-aura-posts');
      if (cachedPosts) {
        const parsed = JSON.parse(cachedPosts);
        if (Array.isArray(parsed)) {
          postsCache = parsed;
          return parsed;
        }
      }
    }
    return postsCache;
  } catch (e) {
    console.error('Error getting posts from localStorage:', e);
    return postsCache;
  }
};

/**
 * Get local aura points from localStorage
 */
const getLocalAuraPoints = (walletAddress: string): AuraPointsState => {
  try {
    if (typeof window !== 'undefined') {
      // Try to get from localStorage
      const key = `aura_points_${walletAddress.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Check the backup key if main key not found
      const backupKey = `aura_direct_${walletAddress.toLowerCase()}`;
      const backupStored = localStorage.getItem(backupKey);
      
      if (backupStored) {
        return JSON.parse(backupStored);
      }
    }
    
    // Default initial state
    return {
      totalPoints: 100,
      transactions: []
    };
  } catch (e) {
    console.error('Error getting aura points from localStorage:', e);
    
    // Return default state on error
    return {
      totalPoints: 100,
      transactions: []
    };
  }
};

/**
 * Save a post to localStorage
 */
export const savePost = async (post: Post): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Get existing posts
    const existingPosts = getLocalPosts();
    
    // Check if post already exists
    const existingIndex = existingPosts.findIndex(p => p.id === post.id);
    
    if (existingIndex >= 0) {
      // Update existing post
      existingPosts[existingIndex] = post;
    } else {
      // Add new post
      existingPosts.unshift(post);
    }
    
    // Update cache
    postsCache = existingPosts;
    
    // Save to localStorage
    localStorage.setItem('giga-aura-posts', JSON.stringify(existingPosts));
    
    // Notify listeners
    notifyListeners();
    
    return true;
  } catch (e) {
    console.error('Error saving post to localStorage:', e);
    return false;
  }
};

/**
 * Get all posts from localStorage
 */
export const getPosts = async (): Promise<Post[]> => {
  try {
    // Return posts from localStorage
    const posts = getLocalPosts();
    
    // Sort by date (newest first)
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Update cache
    postsCache = sortedPosts;
    
    // Save sorted posts to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('giga-aura-posts', JSON.stringify(sortedPosts));
    }
    
    return sortedPosts;
  } catch (e) {
    console.error('Error getting posts from localStorage:', e);
    return postsCache;
  }
};

/**
 * Get posts for a specific user from localStorage
 */
export const getUserPosts = async (walletAddress: string): Promise<Post[]> => {
  try {
    // Get all posts 
    const allPosts = await getPosts();
    
    // Filter by wallet address
    return allPosts.filter(post => post.authorWallet.toLowerCase() === walletAddress.toLowerCase());
  } catch (e) {
    console.error('Error getting user posts from localStorage:', e);
    return [];
  }
};

/**
 * Update a post in localStorage
 */
export const updatePost = async (post: Post): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Get existing posts
    const existingPosts = getLocalPosts();
    
    // Find post to update
    const index = existingPosts.findIndex(p => p.id === post.id);
    
    if (index < 0) {
      console.warn('Post not found for update:', post.id);
      return false;
    }
    
    // Update post
    existingPosts[index] = post;
    
    // Update cache
    postsCache = existingPosts;
    
    // Save to localStorage
    localStorage.setItem('giga-aura-posts', JSON.stringify(existingPosts));
    
    // Notify listeners
    notifyListeners();
    
    return true;
  } catch (e) {
    console.error('Error updating post in localStorage:', e);
    return false;
  }
};

/**
 * Get aura points for a wallet from localStorage
 */
export const getAuraPoints = async (walletAddress: string): Promise<AuraPointsState | null> => {
  try {
    return getLocalAuraPoints(walletAddress);
  } catch (e) {
    console.error('Error getting aura points from localStorage:', e);
    return null;
  }
};

/**
 * Save aura points to localStorage
 */
export const saveAuraPoints = async (walletAddress: string, points: AuraPointsState): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase();
    
    // Save to localStorage with both keys
    localStorage.setItem(`aura_points_${normalizedWallet}`, JSON.stringify(points));
    localStorage.setItem(`aura_direct_${normalizedWallet}`, JSON.stringify(points));
    
    return true;
  } catch (e) {
    console.error('Error saving aura points to localStorage:', e);
    return false;
  }
};

/**
 * Add a transaction and update aura points in localStorage
 */
export const addTransaction = async (walletAddress: string, transaction: AuraTransaction): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Get current aura points
    const currentPoints = await getAuraPoints(walletAddress) || {
      totalPoints: 100,
      transactions: []
    };
    
    // Add new transaction
    currentPoints.transactions.push(transaction);
    
    // Update total points
    currentPoints.totalPoints += transaction.amount;
    
    // Save updated points
    return await saveAuraPoints(walletAddress, currentPoints);
  } catch (e) {
    console.error('Error adding transaction to localStorage:', e);
    return false;
  }
};

/**
 * Notify all post listeners of changes
 */
const notifyListeners = () => {
  if (activeListeners.length > 0) {
    const posts = postsCache;
    activeListeners.forEach(callback => callback());
  }
};

/**
 * Listen for post changes (in this case, just return a no-op function)
 */
export const listenToPosts = (callback: (posts: Post[]) => void): (() => void) => {
  const fetchPosts = async () => {
    try {
      const posts = await getPosts();
      callback(posts);
    } catch (error) {
      console.error('Error in listenToPosts callback:', error);
    }
  };
  
  // Initial fetch
  fetchPosts();
  
  // Return unsubscribe function
  const unsubscribe = () => {
    const index = activeListeners.indexOf(fetchPosts);
    if (index >= 0) {
      activeListeners.splice(index, 1);
    }
  };
  
  // Add to active listeners
  activeListeners.push(fetchPosts);
  
  return unsubscribe;
};

/**
 * Add a listener to the active listeners
 */
export const addListener = (unsubscribe: () => void): void => {
  activeListeners.push(unsubscribe);
};

/**
 * Clean up all listeners
 */
export const cleanupAllListeners = (): void => {
  activeListeners.forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (e) {
      console.error('Error unsubscribing listener:', e);
    }
  });
  
  activeListeners = [];
};

// Default export
export default {
  savePost,
  getPosts,
  getUserPosts,
  updatePost,
  getAuraPoints,
  saveAuraPoints,
  addTransaction,
  listenToPosts,
  addListener,
  cleanupAllListeners
};