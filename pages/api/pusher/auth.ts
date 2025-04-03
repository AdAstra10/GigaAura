import { NextApiRequest, NextApiResponse } from 'next';
import pusherServer from '../../../lib/pusher-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests for authentication
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
  
  // Extract the socket ID and channel name from the request
  const { socket_id, channel_name } = req.body;
  
  // Validate the required parameters
  if (!socket_id || !channel_name) {
    return res.status(400).json({ error: 'socket_id and channel_name are required' });
  }
  
  try {
    // Get the current user from the session or request
    // For demonstration, we're using a dummy user ID
    // In a real app, you would get this from the authenticated session
    const currentUser = {
      id: req.headers.authorization || 'user-123',
      // Add any other user data needed for channel authorization
    };
    
    // Authorize the socket connection for the given channel
    // This is where you would implement your channel access control logic
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: currentUser.id,
      user_info: {
        // Additional user info if needed
      }
    });
    
    // Return the auth response to the client
    return res.status(200).json(authResponse);
  } catch (error) {
    console.error('Error authenticating Pusher channel:', error);
    return res.status(500).json({ 
      error: 'Error authenticating channel',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 