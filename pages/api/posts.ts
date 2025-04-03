import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/postgresql-db';
import { triggerNewPost, triggerUpdatedPost } from '../../lib/pusher-server';
import { Post } from '../../lib/slices/postsSlice';

// Enhanced CORS middleware
const cors = async (req: NextApiRequest, res: NextApiResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Handle CORS preflight
    const isPreflightHandled = await cors(req, res);
    if (isPreflightHandled) return;
    
    if (req.method === 'GET') {
      // Fetch posts from PostgreSQL database
      const posts = await db.getPosts();
      res.status(200).json(posts);
    } else if (req.method === 'POST') {
      // Create a new post in PostgreSQL database
      const { content, walletAddress, username, timestamp } = req.body;
      
      if (!content || !walletAddress) {
        return res.status(400).json({ error: 'Content and wallet address are required' });
      }
      
      // Create post object compatible with the database service
      const newPost: Post = {
        id: Date.now().toString(), // Generate a unique ID
        content,
        authorWallet: walletAddress,
        authorName: username || 'Anonymous',
        createdAt: timestamp || new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: []
      };
      
      // Save the post to the database
      const success = await db.savePost(newPost);
      
      if (success) {
        // Trigger Pusher event for real-time update
        await triggerNewPost(newPost);
        res.status(201).json(newPost);
      } else {
        res.status(500).json({ error: 'Failed to save post' });
      }
    } else if (req.method === 'PUT') {
      // Update an existing post (like, comment, bookmark)
      const postUpdate = req.body;
      
      if (!postUpdate || !postUpdate.id) {
        return res.status(400).json({ error: 'Post ID is required' });
      }
      
      // Update the post in the database
      const success = await db.updatePost(postUpdate);
      
      if (success) {
        // Trigger Pusher event for real-time update of the modified post
        await triggerUpdatedPost(postUpdate);
        res.status(200).json({ success: true, message: 'Post updated successfully' });
      } else {
        res.status(500).json({ error: 'Failed to update post' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
} 