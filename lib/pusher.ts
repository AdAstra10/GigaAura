import Pusher from 'pusher-js';

// Log connection issues in development
if (process.env.NODE_ENV !== 'production') {
  // Enable pusher logging - remove in production
  Pusher.logToConsole = true;
}

// Create a robust Pusher client initialization with fallbacks
const createPusherClient = () => {
  try {
    // Check if we're on client-side before creating Pusher client
    if (typeof window === 'undefined') {
      console.log('Pusher client not initialized on server side');
      return createMockPusherClient();
    }
    
    // Make sure the APP_KEY is available
    const appKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '477339a84785c23745a5';
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';
    
    console.log(`Initializing Pusher client with cluster: ${cluster}`);
    
    const client = new Pusher(appKey, {
      cluster: cluster,
      forceTLS: true, // Use TLS for secure connections
      enabledTransports: ['ws', 'wss', 'xhr_streaming', 'xhr_polling'], // Explicitly enable all transports
      disabledTransports: [], // Don't disable any transports
      authEndpoint: '/api/pusher/auth', // Authentication endpoint for private channels
      wsHost: 'ws-us2.pusher.com', // Explicitly set WebSocket host to match CSP
      httpHost: 'sockjs-us2.pusher.com', // Explicitly set HTTP host
      auth: {
        headers: {
          // Add any necessary auth headers (if needed)
        }
      },
      // Transport fallback settings
      activityTimeout: 30000, // Decrease activity timeout for faster reconnects (was 60000)
      pongTimeout: 15000, // Decrease pong timeout for faster reconnects (was 30000)
      enableStats: true, // Enable connection statistics
    });

    // Setup additional default event handlers
    if (process.env.NODE_ENV !== 'production') {
      client.connection.bind('connecting', () => {
        console.log('🔄 Pusher attempting to connect...');
      });
      
      client.connection.bind('connected', () => {
        console.log('✅ Pusher connected successfully');
        console.log('Socket ID:', client.connection.socket_id);
        // Log transport method
        if ((client.connection as any).transport) {
          console.log('Transport method:', (client.connection as any).transport.name);
        }
      });
      
      client.connection.bind('disconnected', () => {
        console.log('⚠️ Pusher disconnected');
      });
      
      client.connection.bind('failed', () => {
        console.error('❌ Pusher connection failed');
        
        // When connection fails, try to reconnect
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect to Pusher...');
          client.connect();
        }, 3000);
      });
      
      client.connection.bind('error', (err: any) => {
        console.error('❌ Pusher connection error:', err);
        // Check for CSP violations
        if (err && err.type === 'WebSocketError') {
          console.error('Possible CSP violation. Check that your Content-Security-Policy allows connections to Pusher domains.');
          console.error(`Make sure wss://ws-us2.pusher.com is allowed in your CSP connect-src directive.`);
          
          // Log connection information for debugging
          console.debug('Connection Details:', {
            wsHost: 'ws-us2.pusher.com',
            httpHost: 'sockjs-us2.pusher.com',
            cluster: cluster,
            forceTLS: true,
            state: client.connection.state
          });
        }
      });
    }

    return client;
  } catch (error) {
    console.error('Failed to initialize Pusher client:', error);
    return createMockPusherClient();
  }
};

// Create a mock client that doesn't throw errors when methods are called
const createMockPusherClient = () => {
  console.warn('Using mock Pusher client');
  return {
    connection: {
      bind: () => {},
      state: 'unavailable',
      socket_id: 'mock-socket-id',
      transport: { name: 'mock' },
    },
    subscribe: () => ({
      bind: () => {},
      unbind: () => {},
      unbind_all: () => {},
    }),
    unsubscribe: () => {},
    disconnect: () => {},
    connect: () => {},
  } as unknown as Pusher;
};

// Initialize the Pusher client
const pusherClient = createPusherClient();

// Export Pusher event channel names for consistency
export const PUSHER_CHANNELS = {
  POSTS: 'posts-channel',
  NOTIFICATIONS: 'notifications-channel',
  TEST: 'test-channel',
};

// Export Pusher event names for consistency
export const PUSHER_EVENTS = {
  NEW_POST: 'new-post-event',
  UPDATED_POST: 'updated-post-event',
  NEW_NOTIFICATION: 'new-notification-event',
  TEST: 'test-event',
};

// Export information about the Pusher connection status
export const getPusherStatus = () => {
  try {
    return {
      connected: pusherClient.connection.state === 'connected',
      state: pusherClient.connection.state,
      socketId: pusherClient.connection.socket_id,
      transport: (pusherClient.connection as any).transport?.name || 'unknown',
    };
  } catch (error) {
    return {
      connected: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      transport: 'none',
    };
  }
};

// Helper function to check if Pusher is working
export const isPusherWorking = () => {
  try {
    return pusherClient.connection.state === 'connected';
  } catch (error) {
    return false;
  }
};

export default pusherClient; 