import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/db-init';
import { Post } from '../../lib/slices/postsSlice';
import { sendEventToAll } from './events';

// In-memory cache for when database is unavailable
let postsCache: Post[] = [];
const lastFetchTime = new Date();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enhanced CORS headers to fix cross-origin issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Set performance and caching headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  try {
    // GET request to fetch all posts
    if (req.method === 'GET') {
      try {
        console.log('API: Fetching posts from database');
        // Get posts without any wallet filtering - all posts are visible to everyone
        const posts = await db.getPosts();
        
        // Update cache
        if (posts && posts.length > 0) {
          postsCache = [...posts];
        }
        
        // Sort posts to ensure newest are at the top
        const sortedPosts = [...(posts || [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Add timestamp to response to help debug
        const response = {
          timestamp: new Date().toISOString(),
          count: sortedPosts.length,
          posts: sortedPosts
        };
        
        return res.status(200).json(sortedPosts);
      } catch (dbError) {
        console.error('Database error in GET /api/posts:', dbError);
        
        // Return cache if available even when database fails
        if (postsCache.length > 0) {
          console.log('API: Returning cached posts due to database error:', postsCache.length);
          return res.status(200).json(postsCache);
        }
        
        // If nothing else works, return empty array with a timestamp
        return res.status(200).json([]);
      }
    }
    
    // POST request to create a new post
    if (req.method === 'POST') {
      const post: Post = req.body;
      
      if (!post || !post.id || !post.content || !post.authorWallet) {
        return res.status(400).json({ error: 'Invalid post data' });
      }
      
      // Make sure createdAt is set
      if (!post.createdAt) {
        post.createdAt = new Date().toISOString();
      }
      
      try {
        // Save the post to the database
        const success = await db.savePost(post);
        
        if (success) {
          // Also add to cache immediately
          postsCache = [post, ...postsCache.filter(p => p.id !== post.id)];
          
          // Notify all connected clients about the new post
          try {
            sendEventToAll({
              type: 'new-post',
              postId: post.id,
              authorWallet: post.authorWallet,
              timestamp: new Date().toISOString()
            });
            console.log('Sent new-post event to all connected clients');
          } catch (eventError) {
            console.error('Failed to broadcast new post event:', eventError);
            // Continue anyway - this is not critical
          }
          
          return res.status(201).json({ success: true, post });
        } else {
          // Even if database save "failed", it might have actually succeeded but returned
          // false due to error handling. Add to cache just in case.
          postsCache = [post, ...postsCache.filter(p => p.id !== post.id)];
          
          return res.status(500).json({ 
            error: 'Failed to save post to database',
            fallback: 'Post will be saved locally in browser',
            success: true,
            post
          });
        }
      } catch (saveError) {
        console.error('Error saving post:', saveError);
        
        // Add to cache even on error
        postsCache = [post, ...postsCache.filter(p => p.id !== post.id)];
        
        return res.status(500).json({ 
          error: 'Database error',
          errorDetails: saveError instanceof Error ? saveError.message : String(saveError),
          success: true, // Still considering a success for client
          post: post,
          message: 'Post will be saved to local storage in the browser'
        });
      }
    }
    
    // If the method is not supported
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    
    // For GET requests, return cache even in case of errors
    if (req.method === 'GET' && postsCache.length > 0) {
      return res.status(200).json(postsCache);
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      errorDetails: error instanceof Error ? error.message : String(error)
    });
  }
} 