import { NextApiRequest, NextApiResponse } from 'next';
import pusherServer from '../../../lib/pusher-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET requests for diagnostics
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
  
  // Collect environment variables related to Pusher (but hide sensitive values)
  const pusherConfig = {
    appId: process.env.PUSHER_APP_ID ? '✓ [Set]' : '✗ [Missing]',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY ? '✓ [Set]' : '✗ [Missing]',
    secret: process.env.PUSHER_APP_SECRET ? '✓ [Set]' : '✗ [Missing]',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  };
  
  try {
    // Send a test event to verify Pusher connectivity
    const testId = `test-${Date.now()}`;
    const testData = {
      id: testId,
      message: 'Diagnostic test event',
      timestamp: new Date().toISOString(),
    };
    
    let pusherSuccess = false;
    let error = null;
    
    try {
      await pusherServer.trigger('test-channel', 'test-event', testData);
      pusherSuccess = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error triggering Pusher event';
    }
    
    // Get Next.js CSP settings if available
    let cspInfo = '';
    try {
      // This might not be available in the API context
      if (process.env.CSP_CONNECT_SRC) {
        cspInfo = process.env.CSP_CONNECT_SRC;
      }
    } catch (err) {
      cspInfo = 'Unable to fetch CSP configuration';
    }
    
    // Return comprehensive status information
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      pusher: {
        config: pusherConfig,
        testEvent: {
          success: pusherSuccess,
          channelName: 'test-channel',
          eventName: 'test-event',
          testId,
          error,
        },
      },
      security: {
        corsEnabled: true,
        cspInfo,
      },
      environment: process.env.NODE_ENV || 'development',
      clientInfo: {
        info: "To check Pusher client connectivity, open browser dev tools and run: window.pusherDiagnostics()",
        script: `
function pusherDiagnostics() {
  const pusher = window.pusherClient || window.Pusher;
  if (!pusher) return { error: "Pusher not found on window object" };
  
  try {
    // If using our app's exported client
    if (window.pusherClient) {
      return {
        connected: pusherClient.connection.state === 'connected',
        state: pusherClient.connection.state,
        socketId: pusherClient.connection.socket_id,
        transport: pusherClient.connection.transport?.name || 'none'
      };
    }
    
    // Otherwise check for global Pusher instances
    return { 
      message: "Pusher found but couldn't access connection details. Check console logs for errors." 
    };
  } catch (err) {
    return { error: err.message };
  }
}
        `
      },
      troubleshooting: {
        tips: [
          "Ensure all Pusher domains are allowed in CSP connect-src directive",
          "Check that Pusher credentials are correctly set in environment variables",
          "Verify that the client is subscribing to 'test-channel' to receive the test event",
          "Look for blocked requests in the browser's Network tab",
          "Try different transport methods if WebSockets are blocked (xhr_streaming, xhr_polling)"
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 