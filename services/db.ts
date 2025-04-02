/**
 * Cloud Database Service for GigaAura
 * Uses Firebase Firestore REST API for persistent cloud storage
 */

import { Post } from '@lib/slices/postsSlice';
import { AuraPointsState, AuraTransaction } from '@lib/slices/auraPointsSlice';

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDgvgA9uxsZCIGTGiPsH5ZcUw2AQ9MBHSw",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gigaaura-app",
};

// Base URL for Firestore REST API
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// In-memory post cache for immediate display without waiting for API
let postsCache: Post[] = [];
let activeListeners: (() => void)[] = [];

/**
 * Get Firebase auth token for REST API requests
 * For simplicity in this implementation we'll use anonymous authentication
 */
const getAuthToken = async (): Promise<string> => {
  try {
    // First check if we have a cached token
    if (typeof window !== 'undefined') {
      const cachedToken = localStorage.getItem('giga-aura-auth-token');
      const tokenExpiry = localStorage.getItem('giga-aura-auth-token-expiry');
      
      // If we have a valid token that is not expired, use it
      if (cachedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        return cachedToken;
      }
    }
    
    // Otherwise, get a new token using the Firebase Auth REST API
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        returnSecureToken: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get auth token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const token = data.idToken;
    const expiresIn = parseInt(data.expiresIn); // This is in seconds
    
    // Cache the token and its expiry time
    if (typeof window !== 'undefined') {
      localStorage.setItem('giga-aura-auth-token', token);
      localStorage.setItem('giga-aura-auth-token-expiry', (Date.now() + (expiresIn * 1000)).toString());
    }
    
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
};

/**
 * Helper to handle REST API responses and catch errors
 */
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firebase REST API error (${response.status}): ${errorText}`);
  }
  return response.json();
};

/**
 * Transform Firestore REST API document to app model
 */
const transformDocument = (document: any): any => {
  if (!document || !document.fields) return null;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(document.fields)) {
    // Skip server-specific fields
    if (key === 'serverTimestamp') continue;
    
    // Extract the actual value based on Firestore's type system
    const fieldValue = value as any;
    const fieldType = Object.keys(fieldValue)[0];
    
    if (fieldType === 'stringValue') {
      result[key] = fieldValue.stringValue;
    } else if (fieldType === 'integerValue') {
      result[key] = parseInt(fieldValue.integerValue, 10);
    } else if (fieldType === 'doubleValue') {
      result[key] = fieldValue.doubleValue;
    } else if (fieldType === 'booleanValue') {
      result[key] = fieldValue.booleanValue;
    } else if (fieldType === 'timestampValue') {
      result[key] = new Date(fieldValue.timestampValue).toISOString();
    } else if (fieldType === 'arrayValue') {
      result[key] = (fieldValue.arrayValue.values || []).map((v: any) => transformDocument({ fields: { value: v } }).value);
    } else if (fieldType === 'mapValue') {
      result[key] = transformDocument(fieldValue.mapValue);
    } else if (fieldType === 'nullValue') {
      result[key] = null;
    }
  }
  
  return result;
};

/**
 * Transform app model to Firestore REST API document
 */
const transformToFirestore = (data: any): any => {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => {
            // Handle primitive types in arrays
            if (item === null) return { nullValue: null };
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') {
              return Number.isInteger(item) 
                ? { integerValue: item.toString() } 
                : { doubleValue: item };
            }
            if (typeof item === 'boolean') return { booleanValue: item };
            // For objects in arrays, convert them to map values
            return { mapValue: transformToFirestore(item) };
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: transformToFirestore(value) };
    }
  }
  
  // Add server timestamp for ordering if saving a document
  if (!fields.serverTimestamp && !fields.createdAt) {
    fields.serverTimestamp = { 
      timestampValue: new Date().toISOString()
    };
  }
  
  return { fields };
};

/**
 * Exponential backoff for retrying operations
 */
const retry = async <T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      // Only delay if we're going to retry
      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after multiple retries');
};

/**
 * Save a post to Firestore with retry
 */
export const savePost = async (post: Post): Promise<boolean> => {
  return retry(async () => {
    try {
      // Ensure post has all required fields
      if (!post.id || !post.authorWallet) {
        console.error('Invalid post data:', post);
        return false;
      }
      
      // Get auth token
      const token = await getAuthToken();
      
      // Prepare document for Firestore
      const document = transformToFirestore(post);
      
      // Save to main posts collection
      const response = await fetch(`${BASE_URL}/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/posts/${post.id}`,
          ...document
        })
      });
      
      await handleResponse(response);
      
      // Also add to user's posts collection
      const userCollectionResponse = await fetch(`${BASE_URL}/users/${post.authorWallet}/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${post.authorWallet}/posts/${post.id}`,
          ...document
        })
      });
      
      await handleResponse(userCollectionResponse);
      
      // Update local cache
      const existingPostIndex = postsCache.findIndex(p => p.id === post.id);
      if (existingPostIndex >= 0) {
        postsCache[existingPostIndex] = post;
      } else {
        postsCache.unshift(post);
      }
      
      console.log('Post saved to Firestore:', post.id);
      return true;
    } catch (error) {
      console.error('Error saving post:', error);
      return false;
    }
  }, 3);
};

/**
 * Get all posts from Firestore with retry
 */
export const getPosts = async (): Promise<Post[]> => {
  return retry(async () => {
    try {
      // Use cache as immediate fallback if available
      if (postsCache.length > 0) {
        console.log('Using cached posts while fetching from API');
      }
      
      // Get auth token
      const token = await getAuthToken();
      
      const response = await fetch(`${BASE_URL}/posts?pageSize=100&orderBy=serverTimestamp desc`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await handleResponse(response);
      
      if (!data.documents) {
        console.log('No posts found in Firestore');
        return postsCache.length > 0 ? postsCache : [];
      }
      
      const posts = data.documents.map((doc: any) => {
        const post = transformDocument(doc);
        // Extract ID from the document path
        const pathParts = doc.name.split('/');
        post.id = pathParts[pathParts.length - 1];
        return post as Post;
      });
      
      // Update cache with fresh data
      postsCache = posts;
      console.log('Retrieved posts from Firestore API:', posts.length);
      
      // Store in localStorage as backup
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('giga-aura-posts', JSON.stringify(posts));
        } catch (e) {
          console.warn('Failed to save posts to localStorage:', e);
        }
      }
      
      return posts;
    } catch (error) {
      console.error('Error getting posts from Firestore API:', error);
      
      // If we have cached posts, use them
      if (postsCache.length > 0) {
        return postsCache;
      }
      
      // Try to load from localStorage as last resort
      if (typeof window !== 'undefined') {
        try {
          const localPosts = localStorage.getItem('giga-aura-posts');
          if (localPosts) {
            const parsed = JSON.parse(localPosts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              postsCache = parsed;
              return parsed;
            }
          }
        } catch (e) {
          console.warn('Failed to parse local posts:', e);
        }
      }
      
      return [];
    }
  }, 3);
};

/**
 * Get posts by a specific user
 */
export const getUserPosts = async (walletAddress: string): Promise<Post[]> => {
  if (!walletAddress) return [];
  
  return retry(async () => {
    try {
      // Get auth token
      const token = await getAuthToken();
      
      const response = await fetch(`${BASE_URL}/users/${walletAddress}/posts?pageSize=50&orderBy=serverTimestamp desc`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await handleResponse(response);
      
      if (!data.documents) {
        console.log(`No posts found for user ${walletAddress}`);
        return [];
      }
      
      const posts = data.documents.map((doc: any) => {
        const post = transformDocument(doc);
        // Extract ID from the document path
        const pathParts = doc.name.split('/');
        post.id = pathParts[pathParts.length - 1];
        return post as Post;
      });
      
      console.log(`Retrieved ${posts.length} posts for user ${walletAddress}`);
      
      return posts;
    } catch (error) {
      console.error(`Error getting posts for user ${walletAddress}:`, error);
      return [];
    }
  });
};

/**
 * Update an existing post
 */
export const updatePost = async (post: Post): Promise<boolean> => {
  if (!post.id) return false;
  
  return retry(async () => {
    try {
      // Get auth token
      const token = await getAuthToken();
      
      // Prepare document for Firestore
      const document = transformToFirestore(post);
      
      // Add last updated field
      document.fields.lastUpdated = { timestampValue: new Date().toISOString() };
      
      // Update in main posts collection
      const response = await fetch(`${BASE_URL}/posts/${post.id}?updateMask.fieldPaths=likes&updateMask.fieldPaths=comments&updateMask.fieldPaths=shares&updateMask.fieldPaths=likedBy&updateMask.fieldPaths=lastUpdated`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/posts/${post.id}`,
          ...document
        })
      });
      
      await handleResponse(response);
      
      // Also update in user's posts collection if we have the author wallet
      if (post.authorWallet) {
        const userPostResponse = await fetch(`${BASE_URL}/users/${post.authorWallet}/posts/${post.id}?updateMask.fieldPaths=likes&updateMask.fieldPaths=comments&updateMask.fieldPaths=shares&updateMask.fieldPaths=likedBy&updateMask.fieldPaths=lastUpdated`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${post.authorWallet}/posts/${post.id}`,
            ...document
          })
        });
        
        await handleResponse(userPostResponse);
      }
      
      // Update post in local cache
      const postIndex = postsCache.findIndex(p => p.id === post.id);
      if (postIndex >= 0) {
        postsCache[postIndex] = post;
      }
      
      console.log('Post updated in Firestore:', post.id);
      return true;
    } catch (error) {
      console.error(`Error updating post ${post.id}:`, error);
      return false;
    }
  });
};

/**
 * Save aura points to Firestore
 */
export const saveAuraPoints = async (walletAddress: string, points: AuraPointsState): Promise<boolean> => {
  if (!walletAddress) return false;
  
  return retry(async () => {
    try {
      // Get auth token
      const token = await getAuthToken();
      
      const document = {
        fields: {
          walletAddress: { stringValue: walletAddress },
          points: { integerValue: points.totalPoints.toString() },
          transactions: {
            arrayValue: {
              values: (points.transactions || []).map(transaction => ({
                mapValue: transformToFirestore(transaction)
              }))
            }
          },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      };
      
      const response = await fetch(`${BASE_URL}/auraPoints/${walletAddress}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/auraPoints/${walletAddress}`,
          ...document
        })
      });
      
      await handleResponse(response);
      
      console.log(`Aura points saved for ${walletAddress}`);
      return true;
    } catch (error) {
      console.error(`Error saving aura points for ${walletAddress}:`, error);
      return false;
    }
  });
};

/**
 * Get aura points from Firestore
 */
export const getAuraPoints = async (walletAddress: string): Promise<AuraPointsState | null> => {
  if (!walletAddress) return null;
  
  return retry(async () => {
    try {
      // Get auth token
      const token = await getAuthToken();
      
      const response = await fetch(`${BASE_URL}/auraPoints/${walletAddress}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle 404 - return default points
      if (response.status === 404) {
        return {
          totalPoints: 100,
          transactions: []
        };
      }
      
      const data = await handleResponse(response);
      
      if (!data.fields) {
        console.log(`No data found for user ${walletAddress}`);
        return {
          totalPoints: 100,
          transactions: []
        };
      }
      
      const transformedData = transformDocument(data);
      
      return {
        totalPoints: transformedData.points || 100,
        transactions: transformedData.transactions || []
      };
    } catch (error) {
      console.error(`Error getting aura points for ${walletAddress}:`, error);
      return {
        totalPoints: 100,
        transactions: []
      };
    }
  });
};

/**
 * Add a transaction to a user's aura points history
 */
export const addTransaction = async (walletAddress: string, transaction: AuraTransaction): Promise<boolean> => {
  if (!walletAddress) return false;
  
  return retry(async () => {
    try {
      // First, get current aura points
      const userPoints = await getAuraPoints(walletAddress);
      
      // If we got null or couldn't fetch, create a new points object
      const updatedPoints: AuraPointsState = userPoints || {
        totalPoints: 100,
        transactions: []
      };
      
      // Add the new transaction
      updatedPoints.totalPoints += transaction.amount;
      updatedPoints.transactions = [...(updatedPoints.transactions || []), transaction];
      
      // Save back to Firestore
      const success = await saveAuraPoints(walletAddress, updatedPoints);
      
      console.log(`Transaction added for ${walletAddress}: ${transaction.amount} points`);
      return success;
    } catch (error) {
      console.error(`Error adding transaction for ${walletAddress}:`, error);
      return false;
    }
  });
};

/**
 * Set up polling for real-time updates (simulates onSnapshot)
 */
export const listenToPosts = (callback: (posts: Post[]) => void): (() => void) => {
  let isListening = true;
  let pollInterval: any;
  
  const fetchPosts = async () => {
    if (!isListening) return;
    
    try {
      const posts = await getPosts();
      if (posts && posts.length > 0 && isListening) {
        callback(posts);
      }
    } catch (error) {
      console.error('Error in posts listener:', error);
    }
  };
  
  // Initial fetch
  fetchPosts();
  
  // Set up polling every 15 seconds
  pollInterval = setInterval(fetchPosts, 15000);
  
  // Track this listener
  const unsubscribe = () => {
    isListening = false;
    clearInterval(pollInterval);
    // Remove from active listeners
    const index = activeListeners.indexOf(unsubscribe);
    if (index >= 0) {
      activeListeners.splice(index, 1);
    }
  };
  
  activeListeners.push(unsubscribe);
  console.log(`Added post listener (total: ${activeListeners.length})`);
  
  return unsubscribe;
};

/**
 * Helper function to track listener subscriptions
 */
export const addListener = (unsubscribe: () => void): void => {
  activeListeners.push(unsubscribe);
  console.log(`Added Firestore listener (total: ${activeListeners.length})`);
};

/**
 * Detach all active listeners
 */
export const cleanupAllListeners = (): void => {
  if (activeListeners.length > 0) {
    console.log(`Cleaning up ${activeListeners.length} Firestore listeners`);
    activeListeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (e) {
        console.warn('Error unsubscribing listener:', e);
      }
    });
    activeListeners.length = 0; // Clear the array
  }
};

/**
 * Clean up Firebase-related resources
 */
export const cleanupFirebase = async (verbose = true): Promise<void> => {
  try {
    // Detach all listeners
    cleanupAllListeners();
    
    if (verbose) console.log('Firebase resources cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up Firebase resources:', error);
  }
};

export default {
  savePost,
  getPosts,
  getUserPosts,
  updatePost,
  saveAuraPoints,
  getAuraPoints,
  addTransaction,
  listenToPosts,
  cleanupFirebase
}; 