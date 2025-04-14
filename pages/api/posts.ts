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
        // Extract the action (like, unlike, comment, share, unshare) and data from body
        const { 
          action, 
          userId, // Wallet address of the user performing the action
          username, // Username of the user performing the action
          avatar,   // Avatar of the user performing the action
          comment   // Content of the comment
        } = req.body;

        if (typeof id !== 'string') {
          return res.status(400).json({ error: 'Invalid post ID' });
        }
        if (!action || !userId) {
          return res.status(400).json({ error: 'Missing action or userId' });
        }

        // Fetch the existing post using the new db function
        const existingPost = await db.getPostById(id);

        if (!existingPost) {
          return res.status(404).json({ error: 'Post not found' });
        }

        // Initialize notification details
        let notificationType: 'like' | 'comment' | 'share' | null = null;
        let notificationMessage: string = '';
        let shouldNotify = false;

        // Deep copy the post to avoid modifying the original object directly
        let updatedPost = JSON.parse(JSON.stringify(existingPost)); 

        // Process the action
        switch (action) {
          case 'like':
            if (!updatedPost.likedBy.includes(userId)) {
              updatedPost.likedBy.push(userId);
              updatedPost.likes = updatedPost.likedBy.length;
              if (userId !== updatedPost.authorWallet) {
                 shouldNotify = true;
                 notificationType = 'like';
                 notificationMessage = `${username || 'A user'} liked your post.`;
              }
            }
            break;
          case 'unlike':
            updatedPost.likedBy = updatedPost.likedBy.filter((u: string) => u !== userId);
            updatedPost.likes = updatedPost.likedBy.length;
            // No notification for unlike
            break;
          case 'share': // Assuming share means repost
            if (!updatedPost.sharedBy.includes(userId)) {
              updatedPost.sharedBy.push(userId);
              updatedPost.shares = updatedPost.sharedBy.length;
               if (userId !== updatedPost.authorWallet) {
                 shouldNotify = true;
                 notificationType = 'share';
                 notificationMessage = `${username || 'A user'} shared your post.`;
              }
            }
            break;
          case 'unshare':
            updatedPost.sharedBy = updatedPost.sharedBy.filter((u: string) => u !== userId);
            updatedPost.shares = updatedPost.sharedBy.length;
             // No notification for unshare
            break;
          case 'comment':
            if (!comment || typeof comment !== 'string') {
              return res.status(400).json({ error: 'Missing or invalid comment content' });
            }
            const newComment = {
              id: uuidv4(),
              postId: id,
              authorWallet: userId,
              authorUsername: username || null,
              authorAvatar: avatar || null,
              content: comment,
              createdAt: new Date().toISOString(),
            };
            // Ensure comments array exists
            if (!Array.isArray(updatedPost.comments)) {
              updatedPost.comments = [];
            }
            updatedPost.comments.push(newComment);
            // Consider adding a comments count field if needed
            // updatedPost.commentsCount = updatedPost.comments.length;
             if (userId !== updatedPost.authorWallet) {
                 shouldNotify = true;
                 notificationType = 'comment';
                 notificationMessage = `${username || 'A user'} commented on your post: "${comment.substring(0, 30)}${comment.length > 30 ? '...' : ''}"`;
             }
            break;
          // Add cases for deleting comments if needed
          default:
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Save the updated post
        const success = await db.updatePost(updatedPost);

        if (success) {
          // Trigger Pusher event for real-time updates
          await triggerUpdatedPost(updatedPost);

          // Save notification if required
          if (shouldNotify && notificationType && updatedPost.authorWallet) {
             const notification = {
                id: uuidv4(),
                recipientWallet: updatedPost.authorWallet, // Notify the post author
                type: notificationType,
                message: notificationMessage,
                fromWallet: userId,
                fromUsername: username || null,
                fromAvatar: avatar || null,
                postId: id,
                commentId: action === 'comment' ? updatedPost.comments[updatedPost.comments.length - 1].id : null, // Link comment ID if it was a comment
                timestamp: new Date().toISOString(),
                read: false,
             };
             await db.saveNotification(notification);
             // Consider triggering a pusher event for the notification as well
             // await triggerNewNotification(notification);
          }

          return res.status(200).json(updatedPost);
        } else {
          // Update failed, log error or return appropriate status
          console.error(`Failed to update post ${id} after action ${action}`);
          return res.status(500).json({ error: 'Failed to update post in database' });
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