import Pusher from 'pusher-js';

// Log connection issues in development
if (process.env.NODE_ENV !== 'production') {
  // Enable pusher logging - remove in production
  Pusher.logToConsole = true;
}

// Initialize Pusher client with your app credentials
const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '477339a84785c23745a5', {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  forceTLS: true, // Use TLS for secure connections
  enabledTransports: ['ws', 'wss', 'xhr_streaming', 'xhr_polling'], // Explicitly enable all transports
  disabledTransports: [], // Don't disable any transports
  authEndpoint: '/api/pusher/auth', // Will add this endpoint if needed later
  auth: {
    headers: {
      // Add any necessary auth headers (if needed)
    }
  },
  activityTimeout: 60000, // Increase activity timeout (default 120000)
  pongTimeout: 30000, // Increase pong timeout (default 30000)
});

// Add connection event listeners for debugging
if (process.env.NODE_ENV !== 'production') {
  pusherClient.connection.bind('connecting', () => {
    console.log('🔄 Pusher attempting to connect...');
  });
  
  pusherClient.connection.bind('connected', () => {
    console.log('✅ Pusher connected successfully');
  });
  
  pusherClient.connection.bind('disconnected', () => {
    console.log('⚠️ Pusher disconnected');
  });
  
  pusherClient.connection.bind('failed', () => {
    console.error('❌ Pusher connection failed');
  });
  
  pusherClient.connection.bind('error', (err: any) => {
    console.error('❌ Pusher connection error:', err);
  });
}

// Export Pusher event channel names for consistency
export const PUSHER_CHANNELS = {
  POSTS: 'posts-channel',
  NOTIFICATIONS: 'notifications-channel',
};

// Export Pusher event names for consistency
export const PUSHER_EVENTS = {
  NEW_POST: 'new-post-event',
  UPDATED_POST: 'updated-post-event',
  NEW_NOTIFICATION: 'new-notification-event',
};

export default pusherClient; 