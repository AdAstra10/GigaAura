import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/postgresql-db';
import pusherServer, { triggerNewPost, triggerUpdatedPost } from '../../lib/pusher-server';
import { v4 as uuidv4 } from 'uuid';

// Set CORS headers for all responses
function setCorsHeaders(res: NextApiResponse) {
  // Allow all origins, methods, and headers for maximum compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Origin, X-Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Add cache control headers to prevent caching issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all responses
  setCorsHeaders(res);
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    if (req.method === 'GET') {
      // Fetch posts
      try {
        const posts = await db.getPosts();
        // Return posts (can be empty array)
        res.status(200).json(posts || []);
      } catch (error) {
        console.error('Error fetching posts:', error);
        // Instead of returning a 500 error, return an empty array with a warning
        // This allows clients to still function even with backend issues
        res.status(200).json([]);
      }
    } else if (req.method === 'POST') {
      // Create a new post
      try {
        const { content, authorWallet, authorUsername, authorAvatar, mediaUrl, mediaType } = req.body;
        
        // Validate required fields
        if (!content || !authorWallet) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Create the post object
        const post = {
          id: uuidv4(),
          content,
          authorWallet,
          authorUsername: authorUsername || null,
          authorAvatar: authorAvatar || null,
          createdAt: new Date().toISOString(),
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          likes: 0,
          comments: 0,
          shares: 0,
          likedBy: [],
          sharedBy: [],
          bookmarkedBy: [],
        };
        
        // Save the post to the database
        const success = await db.savePost(post);
        
        if (success) {
          // Trigger Pusher event for real-time updates
          await triggerNewPost(post);
          
          return res.status(201).json(post);
        } else {
          return res.status(500).json({ error: 'Failed to save post' });
        }
      } catch (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Failed to create post' });
      }
    } else if (req.method === 'PUT') {
      // Update an existing post
      try {
        const { id } = req.query;
        const { likes, likedBy, shares, sharedBy, bookmarkedBy, comments } = req.body;
        
        // Validate required fields
        if (!id) {
          return res.status(400).json({ error: 'Missing post ID' });
        }
        
        // Get the existing post
        const posts = await db.getPosts();
        const existingPost = posts.find(p => p.id === id);
        
        if (!existingPost) {
          return res.status(404).json({ error: 'Post not found' });
        }
        
        // Update the post
        const updatedPost = {
          ...existingPost,
          likes: likes !== undefined ? likes : existingPost.likes,
          likedBy: likedBy || existingPost.likedBy || [],
          shares: shares !== undefined ? shares : existingPost.shares,
          sharedBy: sharedBy || existingPost.sharedBy || [],
          bookmarkedBy: bookmarkedBy || existingPost.bookmarkedBy || [],
          comments: comments !== undefined ? comments : existingPost.comments,
        };
        
        // Save the updated post
        const success = await db.updatePost(updatedPost);
        
        if (success) {
          // Trigger Pusher event for real-time updates
          await triggerUpdatedPost(updatedPost);
          
          return res.status(200).json(updatedPost);
        } else {
          return res.status(500).json({ error: 'Failed to update post' });
        }
      } catch (error) {
        console.error('Error updating post:', error);
        return res.status(500).json({ error: 'Failed to update post' });
      }
    } else {
      // Method not allowed
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'OPTIONS']);
      res.status(405).json({ 
        success: false, 
        warning: `Method ${req.method} Not Allowed`
      });
    }
  } catch (error) {
    console.error('Internal server error:', error);
    // Return warning for internal server error
    res.status(500).json({ 
      success: false, 
      warning: 'Internal server error, please try again later',
      data: null
    });
  }
} 