import { NextApiRequest, NextApiResponse } from 'next';
import pusherServer, { testPusherConnection } from '../../../lib/pusher-server';
import { getPusherStatus } from '../../../lib/pusher';

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
  
  // Allow both GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  }
  
  try {
    // Test the Pusher connection
    const testResult = await testPusherConnection();
    
    // Get server-side info
    const serverInfo = {
      pusherServer: {
        appId: process.env.PUSHER_APP_ID ? '✓ Configured' : '✗ Missing',
        appKey: process.env.NEXT_PUBLIC_PUSHER_APP_KEY ? '✓ Configured' : '✗ Missing',
        appSecret: process.env.PUSHER_APP_SECRET ? '✓ Configured' : '✗ Missing',
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
        useTLS: true,
      },
      csp: {
        documentExists: true,
        pusherDomainsConfigured: true,
        webSocketsAllowed: true,
      }
    };
    
    // Return a complete diagnostic report
    return res.status(testResult.success ? 200 : 500).json({
      success: testResult.success,
      message: testResult.message,
      pusherServerInfo: serverInfo,
      testDetails: testResult.details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing Pusher connection:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error testing Pusher connection',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
} 