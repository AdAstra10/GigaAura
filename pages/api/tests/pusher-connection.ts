import { NextApiRequest, NextApiResponse } from 'next';
import pusherServer from '../../../lib/pusher-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Generate a random ID for this test
    const testId = Math.floor(Math.random() * 1000000).toString();
    
    // Send a test event via Pusher
    await pusherServer.trigger('test-channel', 'test-event', {
      message: 'Hello from the server!',
      timestamp: new Date().toISOString(),
      id: testId
    });
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Test event sent successfully',
      testId,
      timestamp: new Date().toISOString(),
      details: 'Check your client console for the received event'
    });
  } catch (error) {
    console.error('Error sending test event:', error);
    
    // Return error details
    return res.status(500).json({
      success: false,
      error: 'Failed to send test event',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 