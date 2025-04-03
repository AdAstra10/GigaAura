import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../giga-aura/services/db-init';
import { Post } from '../../lib/slices/postsSlice';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // GET request to fetch all posts
    if (req.method === 'GET') {
      const posts = await db.getPosts();
      
      // Sort posts to ensure newest are at the top
      const sortedPosts = [...posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return res.status(200).json(sortedPosts);
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
      
      // Save the post to the database
      const success = await db.savePost(post);
      
      if (success) {
        return res.status(201).json({ success: true, post });
      } else {
        return res.status(500).json({ error: 'Failed to save post' });
      }
    }
    
    // If the method is not supported
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 