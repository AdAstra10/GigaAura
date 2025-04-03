/**
 * PostgreSQL Database Service for GigaAura
 * Handles persistent storage of posts, aura points, user data in PostgreSQL database
 * with local storage fallbacks for offline functionality
 */

import { Post, Comment } from '@lib/slices/postsSlice';
import { AuraPointsState, AuraTransaction } from '@lib/slices/auraPointsSlice';

// PostgreSQL connection configuration
const pgConfig = {
  host: process.env.PG_HOST || 'dpg-cvmv93k9c44c73blmoag-a.oregon-postgres.render.com',
  database: process.env.PG_DATABASE || 'gigaaura_storage',
  user: process.env.PG_USER || 'gigaaura_storage_user',
  password: process.env.PG_PASSWORD || 'Va7MYYSwuwJCKtJQui7DuYlIv7ZUCMRl',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  ssl: {
    rejectUnauthorized: false
  }
};

// Only import pg module on the server side
// Create a connection pool to the PostgreSQL database
let pool: any = null;

// Dynamically import pg only on the server
if (typeof window === 'undefined') {
  // Server-side code
  import('pg').then(pg => {
    const { Pool } = pg;
    pool = new Pool(pgConfig);
    console.log('PostgreSQL pool created on server side');
  }).catch(err => {
    console.error('Failed to import pg module:', err);
  });
} else {
  // Client-side code - provide a mock pool
  console.log('Running in browser, using local storage only');
}

// In-memory post cache for immediate display without waiting for DB
let postsCache: Post[] = [];
let activeListeners: (() => void)[] = [];

// Flag to track if we've detected database connection issues
let hasDatabaseConnectionIssue = false;

// Initialize tables and caches on startup
const initDatabase = async () => {
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Create the necessary tables if they don't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          author_wallet TEXT NOT NULL,
          author_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          likes INTEGER DEFAULT 0,
          liked_by JSONB DEFAULT '[]',
          shares INTEGER DEFAULT 0,
          comments JSONB DEFAULT '[]',
          data JSONB
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS aura_points (
          wallet_address TEXT PRIMARY KEY,
          points INTEGER DEFAULT 100,
          transactions JSONB DEFAULT '[]',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          wallet_address TEXT PRIMARY KEY,
          username TEXT,
          avatar TEXT,
          bio TEXT,
          banner_image TEXT,
          following JSONB DEFAULT '[]',
          followers JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      hasDatabaseConnectionIssue = true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
    hasDatabaseConnectionIssue = true;
  }
  
  // Try to restore posts cache from localStorage for offline support
  if (typeof window !== 'undefined') {
    try {
      const cachedPosts = localStorage.getItem('giga-aura-posts');
      if (cachedPosts) {
        const parsed = JSON.parse(cachedPosts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          postsCache = [...parsed];
          console.log('Restored posts cache from localStorage:', postsCache.length);
        }
      }
    } catch (e) {
      console.warn('Failed to initialize cache from localStorage:', e);
    }
  }
};

// Initialize database on module load
initDatabase();

/**
 * Handle database connection errors
 */
const handleDatabaseError = (error: any): void => {
  console.error('Database error:', error);
  
  if (!hasDatabaseConnectionIssue) {
    console.warn('Database connection issue detected. Switching to local-only mode.');
    hasDatabaseConnectionIssue = true;
    
    // Display a helpful message about the connection issue
    console.info('Database Troubleshooting: \n' +
      'This is likely due to connectivity issues with the PostgreSQL database.\n' +
      'The app will continue to function using local storage only.');
  }
};

/**
 * Save a post to the database
 */
export const savePost = async (post: Post): Promise<boolean> => {
  // Always save to local storage regardless of DB availability
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`giga-aura-post-${post.id}`, JSON.stringify(post));
      
      // Update posts list in localStorage
      const cachedPostIds = localStorage.getItem('giga-aura-post-ids');
      let postIds: string[] = cachedPostIds ? JSON.parse(cachedPostIds) : [];
      
      // Create a new array to avoid issues with frozen objects
      postIds = [...postIds];
      
      if (!postIds.includes(post.id)) {
        postIds.unshift(post.id);
        localStorage.setItem('giga-aura-post-ids', JSON.stringify(postIds));
      }
      
      // Update in-memory cache
      const existingPostIndex = postsCache.findIndex(p => p.id === post.id);
      if (existingPostIndex >= 0) {
        // Create a new array with the updated post
        postsCache = [
          ...postsCache.slice(0, existingPostIndex),
          post,
          ...postsCache.slice(existingPostIndex + 1)
        ];
      } else {
        // Create a new array with the post at the beginning
        postsCache = [post, ...postsCache];
      }
      
      // Also update the full posts cache
      localStorage.setItem('giga-aura-posts', JSON.stringify(postsCache));
      console.log('Post saved to local storage:', post.id);
    } catch (e) {
      console.warn('Failed to save post to localStorage:', e);
    }
  }
  
  // If we know there are database connection issues or running in browser, don't attempt to save to the database
  if (hasDatabaseConnectionIssue || typeof window !== 'undefined' || !pool) {
    console.log('Skipping database save due to client-side execution or connection issues');
    return true; // Consider it a success since we saved locally
  }

  try {
    const client = await pool.connect();
    
    try {
      // Extract comments from post for storing in the database
      const comments = post.comments || [];
      
      // Save post to the database
      const query = `
        INSERT INTO posts (
          id, content, author_wallet, author_name, 
          created_at, likes, liked_by, shares, comments, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          content = $2,
          author_name = $4,
          likes = $6,
          liked_by = $7,
          shares = $8,
          comments = $9,
          data = $10,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const values = [
        post.id,
        post.content,
        post.authorWallet,
        post.authorName,
        post.createdAt || new Date().toISOString(),
        post.likes || 0,
        JSON.stringify(post.likedBy || []),
        post.shares || 0,
        JSON.stringify(comments),
        JSON.stringify(post) // Store the entire post as JSON for future-proofing
      ];
      
      await client.query(query, values);
      console.log('Post saved to database:', post.id);
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error('Error saving post to database:', error);
      return true; // Consider it a success since we saved to local storage
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we saved to local storage
  }
};

/**
 * Get all posts from the database
 */
export const getPosts = async (): Promise<Post[]> => {
  // If we know there are database connection issues, or running in browser, skip database calls and use local cache directly
  if (hasDatabaseConnectionIssue || typeof window !== 'undefined' || !pool) {
    console.log('Using local cache due to client-side execution or database connection issues');
    return getLocalPosts();
  }

  try {
    // Use cache as immediate fallback if available
    if (postsCache.length > 0) {
      console.log('Using cached posts while fetching from database');
    }
    
    const client = await pool.connect();
    
    try {
      // Query all posts, ordered by creation date descending (newest first)
      const result = await client.query(`
        SELECT * FROM posts 
        ORDER BY created_at DESC
      `);
      
      if (result.rows.length === 0) {
        console.log('No posts found in database, falling back to local cache');
        return getLocalPosts();
      }
      
      // Transform rows into Post objects
      const posts: Post[] = result.rows.map((row: any) => {
        try {
          // If we stored the full post as JSON, use that
          if (row.data) {
            return {
              ...JSON.parse(row.data),
              // But override with the latest DB values for critical fields
              likes: row.likes || 0,
              shares: row.shares || 0,
              likedBy: Array.isArray(row.liked_by) ? row.liked_by : [],
              comments: Array.isArray(row.comments) ? row.comments : []
            };
          }
          
          // Otherwise, construct from individual fields
          return {
            id: row.id,
            content: row.content,
            authorWallet: row.author_wallet,
            authorName: row.author_name || '',
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            likes: row.likes || 0,
            likedBy: Array.isArray(row.liked_by) ? row.liked_by : [],
            comments: Array.isArray(row.comments) ? row.comments : [],
            shares: row.shares || 0,
          };
        } catch (e) {
          console.error('Error parsing post from database:', e);
          return null;
        }
      }).filter(Boolean) as Post[];
      
      console.log(`Retrieved ${posts.length} posts from database`);
      
      // Update cache
      if (posts.length > 0) {
        postsCache = [...posts];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('giga-aura-posts', JSON.stringify(posts));
          } catch (e) {
            console.warn('Failed to update posts cache in localStorage:', e);
          }
        }
      }
      
      return posts;
    } catch (error) {
      handleDatabaseError(error);
      console.error('Error getting posts from database:', error);
      
      // Fall back to cache
      return getLocalPosts();
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    
    // Fall back to cache
    return getLocalPosts();
  }
};

/**
 * Get posts by a specific user (wallet address)
 */
export const getUserPosts = async (walletAddress: string): Promise<Post[]> => {
  if (!walletAddress) {
    return [];
  }
  
  // If we know there are database connection issues, use local cache
  if (hasDatabaseConnectionIssue) {
    // Filter local posts by author
    const allPosts = getLocalPosts();
    return allPosts.filter(post => post.authorWallet === walletAddress);
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Query posts by author wallet
      const result = await client.query(`
        SELECT * FROM posts 
        WHERE author_wallet = $1
        ORDER BY created_at DESC
      `, [walletAddress]);
      
      if (result.rows.length === 0) {
        console.log(`No posts found for user ${walletAddress}, checking local cache`);
        // Fall back to filtering from local cache
        const allPosts = getLocalPosts();
        return allPosts.filter(post => post.authorWallet === walletAddress);
      }
      
      // Transform rows into Post objects
      const posts: Post[] = result.rows.map((row: any) => {
        try {
          // If we stored the full post as JSON, use that
          if (row.data) {
            return {
              ...JSON.parse(row.data),
              // But override with the latest DB values for critical fields
              likes: row.likes || 0,
              shares: row.shares || 0,
              likedBy: Array.isArray(row.liked_by) ? row.liked_by : [],
              comments: Array.isArray(row.comments) ? row.comments : []
            };
          }
          
          // Otherwise, construct from individual fields
          return {
            id: row.id,
            content: row.content,
            authorWallet: row.author_wallet,
            authorName: row.author_name || '',
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            likes: row.likes || 0,
            likedBy: Array.isArray(row.liked_by) ? row.liked_by : [],
            comments: Array.isArray(row.comments) ? row.comments : [],
            shares: row.shares || 0,
          };
        } catch (e) {
          console.error('Error parsing post from database:', e);
          return null;
        }
      }).filter(Boolean) as Post[];
      
      console.log(`Retrieved ${posts.length} posts for user ${walletAddress} from database`);
      
      return posts;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error getting posts for user ${walletAddress}:`, error);
      
      // Fall back to filtering from local cache
      const allPosts = getLocalPosts();
      return allPosts.filter(post => post.authorWallet === walletAddress);
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    
    // Fall back to filtering from local cache
    const allPosts = getLocalPosts();
    return allPosts.filter(post => post.authorWallet === walletAddress);
  }
};

/**
 * Update an existing post
 */
export const updatePost = async (post: Post): Promise<boolean> => {
  if (!post.id) return false;
  
  // Reuse the savePost function which has upsert logic
  return savePost(post);
};

/**
 * Get local posts from cache/localStorage
 */
const getLocalPosts = (): Post[] => {
  // If we have postsCache in memory, use that
  if (postsCache.length > 0) {
    return [...postsCache];
  }
  
  // Otherwise, try to load from localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('giga-aura-posts');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Update our in-memory cache
            postsCache = [...parsed];
            return parsed;
          }
        } catch (e) {
          console.warn('Failed to parse posts from localStorage:', e);
        }
      }
      
      // If we reach here, we need to attempt reconstructing from individual posts
      const cachedPostIds = localStorage.getItem('giga-aura-post-ids');
      if (cachedPostIds) {
        try {
          const postIds = JSON.parse(cachedPostIds);
          if (Array.isArray(postIds) && postIds.length > 0) {
            const reconstructedPosts: Post[] = [];
            
            for (const id of postIds) {
              const postJson = localStorage.getItem(`giga-aura-post-${id}`);
              if (postJson) {
                try {
                  const post = JSON.parse(postJson);
                  reconstructedPosts.push(post);
                } catch (e) {
                  console.warn(`Failed to parse post ${id} from localStorage:`, e);
                }
              }
            }
            
            if (reconstructedPosts.length > 0) {
              // Sort by creation date, newest first
              reconstructedPosts.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
              });
              
              // Update our in-memory cache and localStorage
              postsCache = [...reconstructedPosts];
              localStorage.setItem('giga-aura-posts', JSON.stringify(reconstructedPosts));
              
              return reconstructedPosts;
            }
          }
        } catch (e) {
          console.warn('Failed to reconstruct posts from localStorage:', e);
        }
      }
    } catch (e) {
      console.warn('Error accessing localStorage:', e);
    }
  }
  
  // If all else fails, return an empty array
  return [];
};

/**
 * Delete a post
 */
export const deletePost = async (postId: string, authorWallet: string): Promise<boolean> => {
  if (!postId) return false;
  
  // Always delete from local storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`giga-aura-post-${postId}`);
      
      // Update postsCache
      postsCache = postsCache.filter(p => p.id !== postId);
      
      // Update all-posts cache
      localStorage.setItem('giga-aura-posts', JSON.stringify(postsCache));
      
      // Update post-ids list
      const cachedPostIds = localStorage.getItem('giga-aura-post-ids');
      if (cachedPostIds) {
        try {
          const postIds = JSON.parse(cachedPostIds);
          const updatedIds = postIds.filter((id: string) => id !== postId);
          localStorage.setItem('giga-aura-post-ids', JSON.stringify(updatedIds));
        } catch (e) {
          console.warn('Failed to update post-ids in localStorage:', e);
        }
      }
    } catch (e) {
      console.warn('Failed to delete post from localStorage:', e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database delete due to known connection issues');
    return true; // Consider it a success since we deleted locally
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Delete the post from the database
      // Only allow deletion if the authorWallet matches (as a security measure)
      const result = await client.query(`
        DELETE FROM posts 
        WHERE id = $1 AND author_wallet = $2
        RETURNING id
      `, [postId, authorWallet]);
      
      const success = result.rowCount !== null && result.rowCount > 0;
      if (success) {
        console.log(`Post ${postId} deleted from database`);
      } else {
        console.warn(`Failed to delete post ${postId}: not found or not authorized`);
      }
      
      return success;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error deleting post ${postId}:`, error);
      return true; // Consider it a success since we deleted locally
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we deleted locally
  }
};

/**
 * Get Aura Points for a wallet
 */
export const getAuraPoints = async (walletAddress: string): Promise<AuraPointsState> => {
  if (!walletAddress) {
    return { totalPoints: 100, transactions: [] };
  }
  
  // Try loading from localStorage first
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`giga-aura-points-${walletAddress}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      }
    } catch (e) {
      console.warn(`Failed to get aura points from localStorage for ${walletAddress}:`, e);
    }
  }
  
  // If we know there are database connection issues, return default values
  if (hasDatabaseConnectionIssue) {
    return { totalPoints: 100, transactions: [] };
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Get points from database
      const result = await client.query(`
        SELECT * FROM aura_points WHERE wallet_address = $1
      `, [walletAddress]);
      
      if (result.rows.length === 0) {
        // No points record found, create default one
        const defaultPoints = { totalPoints: 100, transactions: [] };
        
        // Save default points to database
        await client.query(`
          INSERT INTO aura_points (wallet_address, points, transactions)
          VALUES ($1, $2, $3)
        `, [walletAddress, defaultPoints.totalPoints, JSON.stringify(defaultPoints.transactions)]);
        
        return defaultPoints;
      }
      
      // Parse points from database
      const row = result.rows[0];
      const auraPoints: AuraPointsState = {
        totalPoints: row.points || 100,
        transactions: Array.isArray(row.transactions) ? row.transactions : []
      };
      
      // Cache in localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`giga-aura-points-${walletAddress}`, JSON.stringify(auraPoints));
        } catch (e) {
          console.warn(`Failed to save aura points to localStorage for ${walletAddress}:`, e);
        }
      }
      
      return auraPoints;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error getting aura points for ${walletAddress}:`, error);
      return { totalPoints: 100, transactions: [] };
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return { totalPoints: 100, transactions: [] };
  }
};

/**
 * Update Aura Points for a wallet
 */
export const updateAuraPoints = async (
  walletAddress: string,
  points: number,
  transaction: AuraTransaction
): Promise<boolean> => {
  if (!walletAddress) return false;
  
  // Get current points first
  const currentAuraPoints = await getAuraPoints(walletAddress);
  
  // Update with new points and transaction
  const updatedAuraPoints: AuraPointsState = {
    totalPoints: points,
    transactions: [transaction, ...currentAuraPoints.transactions]
  };
  
  // Always update localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`giga-aura-points-${walletAddress}`, JSON.stringify(updatedAuraPoints));
    } catch (e) {
      console.warn(`Failed to update aura points in localStorage for ${walletAddress}:`, e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database update due to known connection issues');
    return true; // Consider it a success since we updated locally
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Update points in database
      await client.query(`
        INSERT INTO aura_points (wallet_address, points, transactions, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_address) DO UPDATE SET
          points = $2,
          transactions = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [walletAddress, updatedAuraPoints.totalPoints, JSON.stringify(updatedAuraPoints.transactions)]);
      
      console.log(`Aura points updated for ${walletAddress}`);
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error updating aura points for ${walletAddress}:`, error);
      return true; // Consider it a success since we updated locally
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we updated locally
  }
};

/**
 * Get user data by wallet address
 */
export const getUser = async (walletAddress: string): Promise<any> => {
  if (!walletAddress) return null;
  
  // Try loading from localStorage first
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`giga-aura-user-${walletAddress}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn(`Failed to get user from localStorage for ${walletAddress}:`, e);
    }
  }
  
  // If we know there are database connection issues, return null
  if (hasDatabaseConnectionIssue) {
    return null;
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Get user from database
      const result = await client.query(`
        SELECT * FROM users WHERE wallet_address = $1
      `, [walletAddress]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Parse user from database
      const row = result.rows[0];
      const user = {
        walletAddress: row.wallet_address,
        username: row.username,
        avatar: row.avatar,
        bio: row.bio,
        bannerImage: row.banner_image,
        following: Array.isArray(row.following) ? row.following : [],
        followers: Array.isArray(row.followers) ? row.followers : [],
      };
      
      // Cache in localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`giga-aura-user-${walletAddress}`, JSON.stringify(user));
        } catch (e) {
          console.warn(`Failed to save user to localStorage for ${walletAddress}:`, e);
        }
      }
      
      return user;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error getting user for ${walletAddress}:`, error);
      return null;
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return null;
  }
};

/**
 * Update user data
 */
export const updateUser = async (user: any): Promise<boolean> => {
  if (!user || !user.walletAddress) return false;
  
  // Always update localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`giga-aura-user-${user.walletAddress}`, JSON.stringify(user));
    } catch (e) {
      console.warn(`Failed to update user in localStorage for ${user.walletAddress}:`, e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database update due to known connection issues');
    return true; // Consider it a success since we updated locally
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Update user in database
      await client.query(`
        INSERT INTO users (
          wallet_address, username, avatar, bio, banner_image, 
          following, followers, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_address) DO UPDATE SET
          username = $2,
          avatar = $3,
          bio = $4,
          banner_image = $5,
          following = $6,
          followers = $7,
          updated_at = CURRENT_TIMESTAMP
      `, [
        user.walletAddress,
        user.username,
        user.avatar,
        user.bio,
        user.bannerImage,
        JSON.stringify(user.following || []),
        JSON.stringify(user.followers || [])
      ]);
      
      console.log(`User updated for ${user.walletAddress}`);
      
      // Update posts that reference this user's name
      const posts = await getPosts();
      const userPosts = posts.filter(post => post.authorWallet === user.walletAddress);
      
      if (userPosts.length > 0) {
        for (const post of userPosts) {
          if (post.authorName !== user.username) {
            post.authorName = user.username;
            await savePost(post);
          }
        }
      }
      
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error updating user for ${user.walletAddress}:`, error);
      return true; // Consider it a success since we updated locally
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we updated locally
  }
};

/**
 * Clean up database connections
 * This should be called when the app is shutting down or changing routes
 */
export const cleanupDatabase = async (): Promise<void> => {
  // If running in the browser or pool is null, just return
  if (typeof window !== 'undefined' || !pool) {
    console.log('Skipping PostgreSQL cleanup in browser environment');
    return;
  }
  
  try {
    console.log('Cleaning up PostgreSQL database connections');
    
    // Close the connection pool
    await pool.end();
    
    console.log('PostgreSQL connection pool closed successfully');
  } catch (error) {
    console.error('Error closing PostgreSQL connection pool:', error);
  }
};

/**
 * Add a transaction to a user's aura points
 */
export const addTransaction = async (walletAddress: string, transaction: AuraTransaction): Promise<boolean> => {
  if (!walletAddress) return false;
  
  // Always update localStorage first for immediate feedback
  if (typeof window !== 'undefined') {
    try {
      // Get existing aura points
      const pointsString = localStorage.getItem(`giga-aura-points-${walletAddress}`);
      let auraPoints: AuraPointsState;
      
      if (pointsString) {
        try {
          // Try to parse existing data
          auraPoints = JSON.parse(pointsString);
        } catch (e) {
          console.warn('Failed to parse aura points from localStorage, creating new record');
          auraPoints = { totalPoints: 100, transactions: [] };
        }
      } else {
        // Create new aura points record
        auraPoints = { totalPoints: 100, transactions: [] };
      }
      
      // Add transaction to the beginning of the list
      auraPoints.transactions = [transaction, ...auraPoints.transactions];
      
      // Update total points
      auraPoints.totalPoints += transaction.amount;
      
      // Save back to localStorage
      localStorage.setItem(`giga-aura-points-${walletAddress}`, JSON.stringify(auraPoints));
      console.log(`Transaction added to aura points in localStorage for ${walletAddress}:`, transaction);
    } catch (e) {
      console.warn('Failed to add transaction to aura points in localStorage:', e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database transaction addition due to known connection issues');
    return true; // Consider it a success since we updated locally
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // First get current aura points
      const result = await client.query(`
        SELECT * FROM aura_points WHERE wallet_address = $1
      `, [walletAddress]);
      
      let auraPoints: AuraPointsState;
      
      if (result.rows.length === 0) {
        // If user doesn't have aura points yet, create new record
        auraPoints = {
          totalPoints: 100, // Default starting points
          transactions: []
        };
      } else {
        // Parse existing aura points
        const row = result.rows[0];
        auraPoints = {
          totalPoints: row.points || 100,
          transactions: Array.isArray(row.transactions) ? row.transactions : []
        };
      }
      
      // Add transaction to the beginning of the list
      auraPoints.transactions = [transaction, ...auraPoints.transactions];
      
      // Update total points
      auraPoints.totalPoints += transaction.amount;
      
      // Save updated aura points to database
      await client.query(`
        INSERT INTO aura_points (wallet_address, points, transactions, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_address) DO UPDATE SET
          points = $2,
          transactions = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [walletAddress, auraPoints.totalPoints, JSON.stringify(auraPoints.transactions)]);
      
      console.log(`Transaction added to aura points in database for ${walletAddress}:`, transaction);
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error(`Error adding transaction to aura points for ${walletAddress}:`, error);
      return true; // Consider it a success since we updated locally
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we updated locally
  }
};

export default {
  savePost,
  getPosts,
  getUserPosts,
  updatePost,
  deletePost,
  getAuraPoints,
  updateAuraPoints,
  getUser,
  updateUser,
  cleanupDatabase,
  addTransaction
}; 