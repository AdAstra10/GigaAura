import { NextApiRequest, NextApiResponse } from 'next';
import pusherServer from '../../../lib/pusher-server';
import { PUSHER_CHANNELS, PUSHER_EVENTS, getPusherStatus } from '../../../lib/pusher';

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
      await pusherServer.trigger(PUSHER_CHANNELS.TEST, PUSHER_EVENTS.TEST, testData);
      pusherSuccess = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error triggering Pusher event';
    }
    
    // Get Next.js CSP settings if available
    let cspInfo = '';
    try {
      // Get CSP from headers config in next.config.js
      if (process.env.NEXT_PUBLIC_CSP_CONNECT_SRC) {
        cspInfo = process.env.NEXT_PUBLIC_CSP_CONNECT_SRC;
      } else {
        cspInfo = "CSP information not available in environment. Check next.config.js for Content-Security-Policy headers.";
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
          channelName: PUSHER_CHANNELS.TEST,
          eventName: PUSHER_EVENTS.TEST,
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
  // Access the global pusher client
  if (!window.pusherClient) {
    console.error("Pusher client not found on window object");
    return { error: "Pusher client not found on window" };
  }
  
  try {
    const status = {
      connected: window.pusherClient.connection.state === 'connected',
      state: window.pusherClient.connection.state,
      socketId: window.pusherClient.connection.socket_id || 'none',
      transport: 'unknown'
    };
    
    // Try to get transport info
    if (window.pusherClient.connection.socket) {
      status.transport = window.pusherClient.connection.socket.transport?.name || 'unknown';
    }
    
    // Check for CSP issues
    const cspViolations = [];
    const getCspViolations = () => {
      const reports = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('pusher.com') && entry.duration === 0);
      
      return reports.map(entry => entry.name);
    };
    
    try {
      const violations = getCspViolations();
      if (violations.length > 0) {
        status.cspIssues = violations;
      }
    } catch (e) {
      console.error("Error checking for CSP violations:", e);
    }
    
    console.log("Pusher diagnostics:", status);
    return status;
  } catch (err) {
    console.error("Error getting Pusher status:", err);
    return { error: err.message || "Unknown error" };
  }
}

// Make the function globally available
window.pusherDiagnostics = pusherDiagnostics;
        `
      },
      troubleshooting: {
        tips: [
          "Ensure all Pusher domains are allowed in CSP connect-src directive (wss://*.pusher.com, etc.)",
          "Check that Pusher credentials are correctly set in environment variables",
          "Verify that the client is subscribing to the correct channel to receive events",
          "Look for blocked requests in the browser's Network tab",
          "Check Chrome DevTools Console for CSP violation messages",
          "Try a different browser to see if the issue persists",
          "If using private channels, ensure the authentication endpoint is working",
          "Try different transport methods if WebSockets are blocked (xhr_streaming, xhr_polling)"
        ],
        commonIssues: {
          cspViolations: "Your Content Security Policy is blocking Pusher connections. Add the necessary domains to your connect-src CSP directive.",
          authErrors: "Authentication errors may occur with private channels. Check your auth endpoint.",
          networkBlocks: "Corporate firewalls may block WebSocket connections. Try enabling alternative transports."
        },
        debugging: {
          checkNetworkTab: "Look for failed requests to *.pusher.com domains in the Network tab",
          inspectConsoleErrors: "Check for errors containing 'Pusher', 'WebSocket', or 'CSP' in the Console",
          testClientStatus: "Run window.pusherDiagnostics() in the Console to see connection status"
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Error running Pusher diagnostics',
      message: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 