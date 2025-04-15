/**
 * PostgreSQL Database Service for GigaAura
 * Handles persistent storage of posts, aura points, user data in PostgreSQL database
 * with local storage fallbacks for offline functionality
 */

import { Post, Comment } from '@lib/slices/postsSlice';
import { AuraPointsState, AuraTransaction } from '@lib/slices/auraPointsSlice';
import { Notification } from '@lib/slices/notificationsSlice';
import { User } from '@lib/slices/userSlice'; // Assuming User type is available

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

// Flag to track if we've detected database connection issues
let hasDatabaseConnectionIssue = false;

// Only import pg module on the server side
// Create a connection pool to the PostgreSQL database
let pool: any = null;

// Dynamically import pg only on the server
if (typeof window === 'undefined') {
  // Server-side code
  try {
    // Use a more robust import method
    const pgModule = require('pg');
    const { Pool } = pgModule;
    pool = new Pool(pgConfig);
    console.log('PostgreSQL pool created on server side');
  } catch (err) {
    console.error('Failed to import pg module or create pool:', err);
    // Set flag to fall back to local storage
    hasDatabaseConnectionIssue = true;
  }
} else {
  // Client-side code - provide a mock pool
  console.log('Running in browser, using local storage only');
  hasDatabaseConnectionIssue = true;
}

// In-memory post cache for immediate display without waiting for DB
let postsCache: Post[] = [];
let activeListeners: (() => void)[] = [];

// Initialize tables and caches on startup
const initDatabase = async () => {
  try {
    // If we're in the browser or have known connection issues, skip DB initialization
    if (typeof window !== 'undefined' || !pool) {
      console.log('Skipping database initialization - using local storage');
      hasDatabaseConnectionIssue = true;
      return;
    }
    
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
          shared_by JSONB DEFAULT '[]',
          comments JSONB DEFAULT '[]',
          bookmarked_by JSONB DEFAULT '[]',
          data JSONB
        )
      `);
      
      // --- Add ALTER TABLE statements to ensure columns exist --- 
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS shared_by JSONB DEFAULT '[]'`);
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'`);
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS bookmarked_by JSONB DEFAULT '[]'`);
      // Ensure older columns also exist if added incrementally before
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0`);
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS liked_by JSONB DEFAULT '[]'`);
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0`);
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS data JSONB`);
      await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
      // --- End ALTER TABLE statements --- 
      
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
      
      // Create the notifications table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          recipient_wallet TEXT NOT NULL,
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          from_wallet TEXT,
          from_username TEXT,
          from_avatar TEXT,
          post_id TEXT,
          comment_id TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          read BOOLEAN DEFAULT FALSE,
          data JSONB
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
const handleDatabaseError = (error: any, context: string = 'Unknown context'): void => {
  console.error(`Database error in ${context}:`, error);

  // Log a warning but don't permanently switch to local-only mode here.
  // Let the individual functions decide how to handle the error (e.g., fallback or return failure).
  console.warn('Database operation failed. Check connection and query details.');
  // Commenting out the permanent switch:
  // if (!hasDatabaseConnectionIssue) {
  //   console.warn('Database connection issue detected. Relying on local storage/cache where possible.');
  //   hasDatabaseConnectionIssue = true;
  // }
};

/**
 * Helper function to check if a string is valid JSON before attempting to parse
 */
const isValidJSON = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Helper function to safely parse JSON with error handling
 */
const safeJsonParse = (data: any, fallback: any = null) => {
  // If it's already an object, return it directly
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  
  // If not a string, return fallback
  if (typeof data !== 'string' || !data) {
    return fallback;
  }
  
  // Check if it's valid JSON first
  if (!isValidJSON(data)) {
    console.error('Invalid JSON string:', data);
    return fallback;
  }
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
};

/**
 * Save a post to the database
 */
export const savePost = async (post: Post): Promise<boolean> => {
  // Local storage saving logic can remain for client-side caching/optimism
  if (typeof window !== 'undefined') {
    try {
      // Make sure post has proper initial values for likes
      const postWithDefaults = {
        ...post,
        likes: post.likes || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        likedBy: post.likedBy || []
      };
      
      localStorage.setItem(`giga-aura-post-${post.id}`, JSON.stringify(postWithDefaults));
      
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
          postWithDefaults,
          ...postsCache.slice(existingPostIndex + 1)
        ];
      } else {
        // Create a new array with the post at the beginning
        postsCache = [postWithDefaults, ...postsCache];
      }
      
      // Also update the full posts cache
      try {
        const cachedPosts = localStorage.getItem('giga-aura-posts');
        if (cachedPosts) {
          const parsedPosts = JSON.parse(cachedPosts);
          if (Array.isArray(parsedPosts)) {
            const updatedPosts = [...parsedPosts];
            const existingIndex = updatedPosts.findIndex(p => p.id === post.id);
            
            if (existingIndex >= 0) {
              updatedPosts[existingIndex] = postWithDefaults;
            } else {
              updatedPosts.unshift(postWithDefaults);
            }
            
            localStorage.setItem('giga-aura-posts', JSON.stringify(updatedPosts));
          }
        }
      } catch (e) {
        console.warn('Failed to update posts cache in localStorage:', e);
      }
    } catch (e) {
      console.warn('Failed to save post to localStorage:', e);
    }
  }
  
  // If the pool failed to initialize, we cannot proceed with DB operations.
  // Return false as the persistent save failed.
  if (!pool || hasDatabaseConnectionIssue) {
     console.warn('Skipping database save: Pool not initialized or connection issue flag set.');
     return false; // Indicate DB save failure
  }

  // Server-side database operations
  let client;
  try {
    client = await pool.connect();

    try {
      // Ensure post has proper initial values
      const postWithDefaults = {
        ...post,
        likes: post.likes || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        likedBy: post.likedBy || []
      };
      
      // Save post to the database
      const query = `
        INSERT INTO posts (
          id, content, author_wallet, author_name,
          created_at, likes, liked_by, shares, shared_by,
          bookmarked_by, comments, data
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12
        )
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          author_name = EXCLUDED.author_name,
          likes = EXCLUDED.likes,
          liked_by = EXCLUDED.liked_by,
          shares = EXCLUDED.shares,
          shared_by = EXCLUDED.shared_by,
          comments = EXCLUDED.comments,
          bookmarked_by = EXCLUDED.bookmarked_by,
          data = EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const values = [
        postWithDefaults.id,
        postWithDefaults.content,
        postWithDefaults.authorWallet,
        postWithDefaults.authorUsername,
        postWithDefaults.createdAt,
        postWithDefaults.likes,
        JSON.stringify(postWithDefaults.likedBy || []),
        postWithDefaults.shares || 0,
        JSON.stringify(postWithDefaults.sharedBy || []),
        JSON.stringify(postWithDefaults.bookmarkedBy || []),
        JSON.stringify(postWithDefaults.comments || []),
        JSON.stringify(postWithDefaults)
      ];
      
      await client.query(query, values);
      console.log('Post saved to database:', post.id);
      return true; // Indicate DB save success
    } catch (error) {
      handleDatabaseError(error, 'savePost query');
      // console.error('Error saving post to database:', error); // Covered by handleDatabaseError
      return false; // Indicate DB save failure
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    handleDatabaseError(error, 'savePost pool.connect');
    // console.error('Error connecting to database pool:', error); // Covered by handleDatabaseError
    return false; // Indicate DB connection failure
  }
};

/**
 * Get all posts from the database
 */
export const getPosts = async (): Promise<Post[]> => {
  // If the pool is not available (server hasn't initialized it or error occurred),
  // fall back to local cache/storage.
  if (!pool || hasDatabaseConnectionIssue) {
    console.warn('Using local cache/storage: Pool not initialized or connection issue flag set.');
    return getLocalPosts();
  }

  // Attempt to fetch from the database
  let client;
  try {
    client = await pool.connect();
    console.log('Attempting to fetch posts from database...'); // Added log

    try {
      // Query all posts, ordered by creation date descending (newest first)
      const result = await client.query(`
        SELECT * FROM posts
        ORDER BY created_at DESC
      `);

      console.log(`Retrieved ${result.rows.length} rows from database`); // Added log

      if (result.rows.length === 0) {
        console.log('No posts found in database.'); // Simplified log
        // Update cache to be empty and return empty
        postsCache = [];
         if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('giga-aura-posts', JSON.stringify([]));
            } catch (e) {
              console.warn('Failed to clear posts cache in localStorage:', e);
            }
         }
        return []; // Return empty array if DB is empty
      }

      // Transform rows into Post objects
      const posts: Post[] = result.rows.map((row: any) => {
        try {
          // If we stored the full post as JSON, use that
          if (row.data) {
            try {
              const parsedData = safeJsonParse(row.data, {});
              return {
                ...parsedData,
                // But override with the latest DB values for critical fields
                likes: row.likes || 0,
                shares: row.shares || 0,
                likedBy: safeJsonParse(row.liked_by, []),
                comments: safeJsonParse(row.comments, [])
              };
            } catch (parseError) {
              console.error('Failed to parse post data JSON:', parseError);
              // Fall back to constructing from individual fields
            }
          }

          // Otherwise, construct from individual fields
          return {
            id: row.id,
            content: row.content,
            authorWallet: row.author_wallet,
            authorName: row.author_name || '',
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            likes: row.likes || 0,
            likedBy: safeJsonParse(row.liked_by, []),
            comments: safeJsonParse(row.comments, []),
            shares: row.shares || 0,
          };
        } catch (e) {
          console.error('Error parsing post from database:', e);
          return null;
        }
      }).filter(Boolean) as Post[];

      console.log(`Successfully processed ${posts.length} posts from database`); // Added log

      // Update cache with fresh data from DB
      postsCache = [...posts];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('giga-aura-posts', JSON.stringify(posts));
          console.log('Updated localStorage cache with fresh posts.'); // Added log
        } catch (e) {
          console.warn('Failed to update posts cache in localStorage:', e);
        }
      }

      return posts; // Return fresh data from DB
    } catch (error) {
      handleDatabaseError(error, 'getPosts query');
      // Fall back to cache ONLY if DB query fails
      console.warn('Database query failed. Falling back to local cache/storage.');
      return getLocalPosts();
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    handleDatabaseError(error, 'getPosts pool.connect');
    // Fall back to cache ONLY if DB connection fails
    console.warn('Database connection failed. Falling back to local cache/storage.');
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
            try {
              const parsedData = safeJsonParse(row.data, {});
              return {
                ...parsedData,
                // But override with the latest DB values for critical fields
                likes: row.likes || 0,
                shares: row.shares || 0,
                likedBy: safeJsonParse(row.liked_by, []),
                comments: safeJsonParse(row.comments, [])
              };
            } catch (parseError) {
              console.error('Failed to parse post data JSON:', parseError);
              // Fall back to constructing from individual fields
            }
          }
          
          // Otherwise, construct from individual fields
          return {
            id: row.id,
            content: row.content,
            authorWallet: row.author_wallet,
            authorName: row.author_name || '',
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            likes: row.likes || 0,
            likedBy: safeJsonParse(row.liked_by, []),
            comments: safeJsonParse(row.comments, []),
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
 * Get a single post by its ID
 */
export const getPostById = async (postId: string): Promise<Post | null> => {
  if (!postId) return null;

  // If the pool is not available, try local cache first
  if (!pool || hasDatabaseConnectionIssue) {
    console.warn(`Using local cache for getPostById(${postId}): Pool not initialized or connection issue.`);
    const localPosts = getLocalPosts();
    return localPosts.find(p => p.id === postId) || null;
  }

  let client;
  try {
    client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM posts WHERE id = $1', [postId]);

      if (result.rows.length === 0) {
        console.log(`Post ${postId} not found in database.`);
        return null;
      }

      const row = result.rows[0];
      // Transform row into Post object (using similar logic as getPosts)
      const post: Post = (() => {
         try {
          if (row.data) {
            const parsedData = safeJsonParse(row.data, {});
            return {
              ...parsedData,
              likes: row.likes || 0,
              shares: row.shares || 0,
              likedBy: safeJsonParse(row.liked_by, []),
              sharedBy: safeJsonParse(row.shared_by, []), // Added sharedBy
              comments: safeJsonParse(row.comments, []),
              bookmarkedBy: safeJsonParse(row.bookmarked_by, []) // Added bookmarkedBy
            };
          }
          // Fallback construction
          return {
            id: row.id,
            content: row.content,
            authorWallet: row.author_wallet,
            authorName: row.author_name || '',
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            likes: row.likes || 0,
            likedBy: safeJsonParse(row.liked_by, []),
            comments: safeJsonParse(row.comments, []),
            shares: row.shares || 0,
            sharedBy: safeJsonParse(row.shared_by, []), // Added sharedBy
            bookmarkedBy: safeJsonParse(row.bookmarked_by, []) // Added bookmarkedBy
          };
        } catch (e) {
          console.error('Error parsing single post from database:', e);
          return null; // Return null if parsing fails
        }
      })();


      return post;

    } catch (error) {
      handleDatabaseError(error, `getPostById query (${postId})`);
      return null; // Indicate DB query failure
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    handleDatabaseError(error, `getPostById pool.connect (${postId})`);
    return null; // Indicate DB connection failure
  }
};

/**
 * Update a post in the database (likes, comments, etc.)
 */
export const updatePost = async (post: Post): Promise<boolean> => {
  if (!post || !post.id) return false;

  // Optimistic local storage update (can remain)
  if (typeof window !== 'undefined') {
    try {
      // Find and update the post in the feed cache
      const postsKey = 'giga-aura-posts';
      const cachedPosts = localStorage.getItem(postsKey);
      if (cachedPosts) {
        try {
          const posts = JSON.parse(cachedPosts);
          if (Array.isArray(posts)) {
            // Ensure the likedBy array is properly managed
            const updatedPost = {
              ...post,
              likedBy: post.likedBy || [],
              likes: post.likedBy ? post.likedBy.length : 0, // Ensure likes count matches likedBy length
              // Ensure other fields are included if needed for local cache consistency
              sharedBy: post.sharedBy || [],
              shares: post.sharedBy ? post.sharedBy.length : 0, // Assuming shares count matches sharedBy length
              comments: post.comments || [],
              bookmarkedBy: post.bookmarkedBy || [],
            };

            const updatedPosts = posts.map(p => p.id === post.id ? updatedPost : p);
            localStorage.setItem(postsKey, JSON.stringify(updatedPosts));
          }
        } catch (e) {
          console.warn('Failed to update post in localStorage:', e);
        }
      }

      // Update the individual post cache
      localStorage.setItem(`giga-aura-post-${post.id}`, JSON.stringify(post));
      console.log('Post updated optimistically in localStorage:', post.id);
    } catch (e) {
      console.warn('Failed to update post in localStorage:', e);
    }
  }

  // If the pool failed to initialize, we cannot proceed with DB operations.
  if (!pool) { // Removed hasDatabaseConnectionIssue check here
    console.warn('Skipping database update: Pool not initialized.');
    return false; // Indicate DB update failure
  }

  let client;
  try {
    client = await pool.connect();

    try {
      // We expect the 'post' object passed in to have the complete, final state.
      // The API handler should construct this object before calling updatePost.

      // Ensure arrays are handled correctly and counts match array lengths
      const likedBy = post.likedBy || [];
      const likesCount = likedBy.length;
      const sharedBy = post.sharedBy || [];
      const sharesCount = sharedBy.length; // Assuming shares count matches sharedBy length
      const comments = post.comments || [];
      const bookmarkedBy = post.bookmarkedBy || [];

      // Construct the final post data to be saved in the 'data' JSONB column
      const postDataForJson = {
        ...post,
        likes: likesCount,
        likedBy: likedBy,
        shares: sharesCount,
        sharedBy: sharedBy,
        comments: comments,
        bookmarkedBy: bookmarkedBy
      };


      const query = `
        UPDATE posts SET
          content = $1,
          author_name = $2,
          likes = $3,
          liked_by = $4,
          shares = $5,
          shared_by = $6,
          comments = $7,
          bookmarked_by = $8,
          data = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `;

      const values = [
        post.content,
        post.authorUsername, // Make sure this field exists on the Post type or adjust
        likesCount,
        JSON.stringify(likedBy),
        sharesCount, // Use calculated shares count
        JSON.stringify(sharedBy),
        JSON.stringify(comments), // Save the full comments array
        JSON.stringify(bookmarkedBy),
        JSON.stringify(postDataForJson), // Save the constructed JSON
        post.id
      ];

      const result = await client.query(query, values);

      if (result.rowCount === 0) {
         console.warn(`Failed to update post ${post.id} in database: Post not found.`);
         return false; // Post wasn't found to update
      }

      console.log('Post updated successfully in database:', post.id);
      return true; // Indicate DB update success
    } catch (error) {
      handleDatabaseError(error, `updatePost query (${post.id})`);
      return false; // Indicate DB update failure
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    handleDatabaseError(error, `updatePost pool.connect (${post.id})`);
    return false; // Indicate DB connection failure
  }
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
        const parsed = safeJsonParse(cached, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Update our in-memory cache
          postsCache = [...parsed];
          return parsed;
        }
      }
      
      // If we reach here, we need to attempt reconstructing from individual posts
      const cachedPostIds = localStorage.getItem('giga-aura-post-ids');
      if (cachedPostIds) {
        const postIds = safeJsonParse(cachedPostIds, []);
        if (Array.isArray(postIds) && postIds.length > 0) {
          const reconstructedPosts: Post[] = [];
          
          for (const id of postIds) {
            const postJson = localStorage.getItem(`giga-aura-post-${id}`);
            if (postJson) {
              const post = safeJsonParse(postJson, null);
              if (post) {
                reconstructedPosts.push(post);
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
export const updateUser = async (user: Partial<User> & { walletAddress: string }): Promise<boolean> => {
  if (!user || !user.walletAddress) return false;

  // Optimistic update in localStorage (can remain)
  if (typeof window !== 'undefined') {
    try {
      // Fetch existing user data from local storage to merge
      const existingUserJson = localStorage.getItem(`giga-aura-user-${user.walletAddress}`);
      const existingUser = existingUserJson ? safeJsonParse(existingUserJson, {}) : {};
      const updatedUserLocal = { ...existingUser, ...user };
      localStorage.setItem(`giga-aura-user-${user.walletAddress}`, JSON.stringify(updatedUserLocal));
      console.log(`User updated optimistically in localStorage for ${user.walletAddress}`);
    } catch (e) {
      console.warn(`Failed to update user in localStorage for ${user.walletAddress}:`, e);
    }
  }

  // If the pool is not initialized, we cannot proceed with DB operations.
  if (!pool) {
    console.warn('Skipping database update for user: Pool not initialized.');
    return false; // Indicate DB update failure
  }

  let client;
  try {
    client = await pool.connect();

    try {
      // Fetch the current user data from DB to ensure we have all fields
      const currentResult = await client.query('SELECT * FROM users WHERE wallet_address = $1', [user.walletAddress]);
      const currentUserData = currentResult.rows.length > 0 ? currentResult.rows[0] : {};

      // Merge new data with existing data
      const username = user.username !== undefined ? user.username : currentUserData.username;
      const avatar = user.avatar !== undefined ? user.avatar : currentUserData.avatar;
      const bio = user.bio !== undefined ? user.bio : currentUserData.bio;
      const bannerImage = user.bannerImage !== undefined ? user.bannerImage : currentUserData.banner_image;
      // Ensure following/followers are arrays, merge if necessary (though typically updated elsewhere)
      const following = Array.isArray(user.following) ? user.following : safeJsonParse(currentUserData.following, []);
      const followers = Array.isArray(user.followers) ? user.followers : safeJsonParse(currentUserData.followers, []);


      // Update user in database using INSERT ON CONFLICT
      const query = `
        INSERT INTO users (
          wallet_address, username, avatar, bio, banner_image,
          following, followers, updated_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_address) DO UPDATE SET
          username = $2,
          avatar = $3,
          bio = $4,
          banner_image = $5,
          following = $6,
          followers = $7,
          updated_at = CURRENT_TIMESTAMP
        RETURNING wallet_address
      `;

      const values = [
        user.walletAddress,
        username,
        avatar,
        bio,
        bannerImage,
        JSON.stringify(following || []),
        JSON.stringify(followers || [])
      ];

      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        console.warn(`Failed to update user ${user.walletAddress} in database.`);
        return false; // Indicate DB update failure
      }

      console.log(`User updated successfully in database for ${user.walletAddress}`);

      // Removed the logic that updated all user's posts here for efficiency.
      // Frontend should fetch current user details when displaying posts/profiles.

      return true; // Indicate DB update success
    } catch (error) {
      handleDatabaseError(error, `updateUser query (${user.walletAddress})`);
      return false; // Indicate DB update failure
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    handleDatabaseError(error, `updateUser pool.connect (${user.walletAddress})`);
    return false; // Indicate DB connection failure
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

/**
 * Save a notification
 */
export const saveNotification = async (notification: Notification): Promise<boolean> => {
  if (!notification || !notification.id) return false;
  
  // Always update localStorage first for immediate feedback
  if (typeof window !== 'undefined' && notification.fromWallet) {
    try {
      // Try to get existing notifications for this user
      const notificationsKey = `notifications-${notification.fromWallet}`;
      const existingNotifications = localStorage.getItem(notificationsKey);
      let notifications = [];
      
      if (existingNotifications) {
        notifications = safeJsonParse(existingNotifications, []);
        if (!Array.isArray(notifications)) {
          console.warn('Parsed notifications is not an array, resetting to empty array');
          notifications = [];
        }
      }
      
      // Add the new notification to the beginning of the array
      notifications.unshift(notification);
      
      // Save back to localStorage
      localStorage.setItem(notificationsKey, JSON.stringify(notifications));
      console.log('Notification saved to localStorage:', notification);
    } catch (e) {
      console.warn('Failed to save notification to localStorage:', e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database notification save due to known connection issues');
    return true; // Consider it a success since we saved to localStorage
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Save notification to database
      await client.query(`
        INSERT INTO notifications (
          id, recipient_wallet, type, message, from_wallet, 
          from_username, from_avatar, post_id, comment_id, 
          timestamp, read, data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          message = $4,
          from_username = $6,
          from_avatar = $7,
          data = $12,
          updated_at = CURRENT_TIMESTAMP
      `, [
        notification.id,
        notification.fromWallet, // This is the recipient of the notification
        notification.type,
        notification.message,
        notification.fromWallet,
        notification.fromUsername,
        notification.fromAvatar,
        notification.postId,
        notification.commentId,
        notification.timestamp || new Date().toISOString(),
        notification.read || false,
        JSON.stringify(notification)
      ]);
      
      console.log('Notification saved to database:', notification.id);
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error('Error saving notification to database:', error);
      return true; // Consider it a success since we've already saved to localStorage
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we've already saved to localStorage
  }
};

/**
 * Get notifications for a user
 */
export const getNotifications = async (walletAddress: string): Promise<Notification[]> => {
  if (!walletAddress) return [];
  
  // Try to get from localStorage first
  if (typeof window !== 'undefined') {
    try {
      const notificationsKey = `notifications-${walletAddress}`;
      const cachedNotifications = localStorage.getItem(notificationsKey);
      
      if (cachedNotifications) {
        const parsed = JSON.parse(cachedNotifications);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('Retrieved notifications from localStorage:', parsed.length);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve notifications from localStorage:', e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database notifications retrieval due to known connection issues');
    return []; // Return empty array since we couldn't retrieve from localStorage
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Get notifications from database
      const result = await client.query(`
        SELECT * FROM notifications
        WHERE recipient_wallet = $1
        ORDER BY timestamp DESC
      `, [walletAddress]);
      
      const notifications: Notification[] = result.rows.map((row: any) => {
        try {
          // Handle the main notification fields safely
          const baseNotification = {
            id: row.id,
            type: row.type,
            message: row.message,
            fromWallet: row.from_wallet,
            fromUsername: row.from_username,
            fromAvatar: row.from_avatar,
            postId: row.post_id,
            commentId: row.comment_id,
            timestamp: row.timestamp?.toISOString() || new Date().toISOString(),
            read: !!row.read
          };
          
          // Handle additional data
          if (row.data) {
            try {
              const additionalData = safeJsonParse(row.data, {});
              return {
                ...baseNotification,
                ...additionalData
              };
            } catch (error) {
              console.error('Error parsing notification data:', error);
              return baseNotification;
            }
          }
          
          return baseNotification;
        } catch (error) {
          console.error('Error processing notification row:', error);
          return null;
        }
      }).filter(Boolean) as Notification[];
      
      // Update localStorage with fresh data
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`notifications-${walletAddress}`, JSON.stringify(notifications));
        } catch (e) {
          console.warn('Failed to cache notifications to localStorage:', e);
        }
      }
      
      console.log('Retrieved notifications from database:', notifications.length);
      return notifications;
    } catch (error) {
      handleDatabaseError(error);
      console.error('Error retrieving notifications from database:', error);
      return []; // Return empty array since we couldn't retrieve 
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return []; // Return empty array since we couldn't retrieve
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string, walletAddress: string): Promise<boolean> => {
  if (!notificationId || !walletAddress) return false;
  
  // Update in localStorage first
  if (typeof window !== 'undefined') {
    try {
      const notificationsKey = `notifications-${walletAddress}`;
      const cachedNotifications = localStorage.getItem(notificationsKey);
      
      if (cachedNotifications) {
        const notifications = JSON.parse(cachedNotifications);
        
        if (Array.isArray(notifications)) {
          const updatedNotifications = notifications.map(notification => {
            if (notification.id === notificationId) {
              return { ...notification, read: true };
            }
            return notification;
          });
          
          localStorage.setItem(notificationsKey, JSON.stringify(updatedNotifications));
          console.log('Marked notification as read in localStorage:', notificationId);
        }
      }
    } catch (e) {
      console.warn('Failed to mark notification as read in localStorage:', e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database notification update due to known connection issues');
    return true; // Consider it a success since we updated localStorage
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Mark notification as read in database
      await client.query(`
        UPDATE notifications
        SET read = true
        WHERE id = $1 AND recipient_wallet = $2
      `, [notificationId, walletAddress]);
      
      console.log('Marked notification as read in database:', notificationId);
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error('Error marking notification as read in database:', error);
      return true; // Consider it a success since we updated localStorage
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we updated localStorage
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (walletAddress: string): Promise<boolean> => {
  if (!walletAddress) return false;
  
  // Update in localStorage first
  if (typeof window !== 'undefined') {
    try {
      const notificationsKey = `notifications-${walletAddress}`;
      const cachedNotifications = localStorage.getItem(notificationsKey);
      
      if (cachedNotifications) {
        const notifications = JSON.parse(cachedNotifications);
        
        if (Array.isArray(notifications)) {
          const updatedNotifications = notifications.map(notification => {
            return { ...notification, read: true };
          });
          
          localStorage.setItem(notificationsKey, JSON.stringify(updatedNotifications));
          console.log('Marked all notifications as read in localStorage');
        }
      }
    } catch (e) {
      console.warn('Failed to mark all notifications as read in localStorage:', e);
    }
  }
  
  // If we know there are database connection issues, skip DB operations
  if (hasDatabaseConnectionIssue) {
    console.log('Skipping database notifications update due to known connection issues');
    return true; // Consider it a success since we updated localStorage
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Mark all notifications as read in database
      await client.query(`
        UPDATE notifications
        SET read = true
        WHERE recipient_wallet = $1
      `, [walletAddress]);
      
      console.log('Marked all notifications as read in database');
      return true;
    } catch (error) {
      handleDatabaseError(error);
      console.error('Error marking all notifications as read in database:', error);
      return true; // Consider it a success since we updated localStorage
    } finally {
      client.release();
    }
  } catch (error) {
    handleDatabaseError(error);
    console.error('Error connecting to database pool:', error);
    return true; // Consider it a success since we updated localStorage
  }
};

export default {
  savePost,
  getPosts,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  getAuraPoints,
  updateAuraPoints,
  getUser,
  updateUser,
  cleanupDatabase,
  addTransaction,
  saveNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
}; 