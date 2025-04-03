import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/postgresql-db';
import { triggerNewPost, triggerUpdatedPost } from '../../lib/pusher-server';
import { Post } from '../../lib/slices/postsSlice';

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
        const newPost = req.body;
        
        // Enhanced validation for required fields
        if (!newPost || !newPost.content) {
          res.status(400).json({ 
            success: false, 
            warning: 'Post content is required',
            data: null
          });
          return;
        }
        
        // Attempt to save the post
        const savedPost = await db.savePost(newPost);
        
        // Trigger Pusher event after successfully saving post
        let pusherSuccess = false;
        if (savedPost) {
          try {
            pusherSuccess = await triggerNewPost(savedPost);
            if (pusherSuccess) {
              console.log('Pusher event triggered for new post');
            } else {
              console.warn('Failed to trigger Pusher event, but post was saved');
            }
          } catch (pusherError) {
            console.error('Error with Pusher:', pusherError);
          }
        }
        
        // Return success response with the saved post and Pusher status
        res.status(201).json({ 
          success: true, 
          data: savedPost,
          pusherEvent: pusherSuccess,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving post:', error);
        // Return warning instead of error to prevent client-side failures
        res.status(200).json({ 
          success: false, 
          warning: 'Failed to save post, please try again later',
          data: null
        });
      }
    } else if (req.method === 'PUT') {
      // Update an existing post
      try {
        const post = req.body;
        
        // Enhanced validation
        if (!post || !post.id) {
          res.status(400).json({
            success: false,
            warning: 'Post ID is required for updates',
            data: null
          });
          return;
        }
        
        // Attempt to update the post
        const updatedPost = await db.updatePost(post);
        
        // Trigger Pusher event for post update
        let pusherSuccess = false;
        if (updatedPost) {
          try {
            pusherSuccess = await triggerUpdatedPost(updatedPost);
            if (pusherSuccess) {
              console.log('Pusher event triggered for updated post');
            } else {
              console.warn('Failed to trigger Pusher event, but post was updated');
            }
          } catch (pusherError) {
            console.error('Error with Pusher:', pusherError);
          }
        }
        
        // Return success response
        res.status(200).json({
          success: true,
          data: updatedPost,
          pusherEvent: pusherSuccess,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating post:', error);
        // Return warning instead of error
        res.status(200).json({
          success: false,
          warning: 'Failed to update post, please try again later',
          data: null
        });
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