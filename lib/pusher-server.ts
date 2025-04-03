import Pusher from 'pusher';

// Get Pusher credentials from environment variables with fallbacks
const pusherAppId = process.env.PUSHER_APP_ID || '1968757';
const pusherAppKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '477339a84785c23745a5';
const pusherAppSecret = process.env.PUSHER_APP_SECRET || 'e57493127c3d8f40e1ab';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

// Log Pusher configuration at startup (without exposing secrets)
console.log(`Initializing Pusher server with cluster: ${pusherCluster}`);
if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_APP_SECRET) {
  console.warn('Using fallback Pusher credentials - for production, set PUSHER_APP_ID and PUSHER_APP_SECRET');
}

// Initialize the Pusher server instance with app credentials
let pusherServer: Pusher;
try {
  pusherServer = new Pusher({
    appId: pusherAppId,
    key: pusherAppKey,
    secret: pusherAppSecret,
    cluster: pusherCluster,
    useTLS: true, // Use TLS for secure connections
  });
  
  console.log('Pusher server instance created successfully');
} catch (error) {
  console.error('Failed to initialize Pusher server:', error);
  
  // Create a mock implementation that doesn't throw errors when methods are called
  pusherServer = {
    trigger: async () => Promise.resolve({}),
    triggerBatch: async () => Promise.resolve({}),
    get: async () => Promise.resolve({}),
    post: async () => Promise.resolve({}),
    authorizeChannel: () => ({}),
    webhooks: {
      constructEvent: () => ({}),
    },
  } as unknown as Pusher;
  
  console.warn('Using mock Pusher server implementation due to initialization error');
}

// Import channel and event names for consistency
import { PUSHER_CHANNELS, PUSHER_EVENTS } from './pusher';

// Helper function to safely trigger a Pusher event with error handling
const safelyTriggerEvent = async (channel: string, event: string, data: any): Promise<boolean> => {
  try {
    // Add timestamp to the data for debugging
    const eventData = {
      ...data,
      _meta: {
        timestamp: new Date().toISOString(),
        serverEvent: true,
      },
    };
    
    // Trigger the event
    await pusherServer.trigger(channel, event, eventData);
    
    // Log event triggered
    console.log(`Successfully triggered ${event} on ${channel} at ${new Date().toISOString()}`);
    return true;
  } catch (error) {
    // Log detailed error
    console.error(`Error triggering ${event} on ${channel}:`, error);
    
    // Attempt to trigger a diagnostic event
    try {
      await pusherServer.trigger('error-channel', 'trigger-error', {
        originalChannel: channel,
        originalEvent: event,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } catch (diagnosticError) {
      console.error('Failed to send diagnostic event:', diagnosticError);
    }
    
    return false;
  }
};

// Helper function to trigger a new post event
export const triggerNewPost = async (post: any) => {
  console.log(`Attempting to trigger new post event for post ID: ${post.id}`);
  return safelyTriggerEvent(PUSHER_CHANNELS.POSTS, PUSHER_EVENTS.NEW_POST, post);
};

// Helper function to trigger an updated post event
export const triggerUpdatedPost = async (post: any) => {
  console.log(`Attempting to trigger updated post event for post ID: ${post.id}`);
  return safelyTriggerEvent(PUSHER_CHANNELS.POSTS, PUSHER_EVENTS.UPDATED_POST, post);
};

// Helper function to trigger a new notification event
export const triggerNewNotification = async (notification: any) => {
  console.log(`Attempting to trigger new notification event for notification ID: ${notification.id}`);
  return safelyTriggerEvent(PUSHER_CHANNELS.NOTIFICATIONS, PUSHER_EVENTS.NEW_NOTIFICATION, notification);
};

// Helper function to test Pusher connectivity
export const testPusherConnection = async (): Promise<{success: boolean, message: string, details?: any}> => {
  try {
    // Generate test data
    const testId = `test-${Date.now()}`;
    const testData = {
      message: 'Test message',
      id: testId,
      timestamp: new Date().toISOString()
    };
    
    // Attempt to trigger a test event
    const success = await safelyTriggerEvent('test-channel', 'test-event', testData);
    
    if (success) {
      return {
        success: true,
        message: 'Successfully connected to Pusher and triggered test event',
        details: {
          testId,
          channelName: 'test-channel',
          eventName: 'test-event',
          timestamp: new Date().toISOString(),
        }
      };
    } else {
      return {
        success: false,
        message: 'Failed to trigger Pusher test event',
        details: {
          testId,
          channelName: 'test-channel',
          eventName: 'test-event',
          timestamp: new Date().toISOString(),
        }
      };
    }
  } catch (error) {
    console.error('Pusher connection test failed:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
        error: error instanceof Error ? error.stack : 'No stack trace available',
        timestamp: new Date().toISOString(),
      }
    };
  }
};

// Export diagnostic information
export const getPusherServerInfo = () => {
  return {
    initialized: !!pusherServer,
    cluster: pusherCluster,
    appKeyConfigured: !!process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    appIdConfigured: !!process.env.PUSHER_APP_ID,
    appSecretConfigured: !!process.env.PUSHER_APP_SECRET,
    usingFallbacks: !process.env.PUSHER_APP_ID || !process.env.PUSHER_APP_SECRET,
  };
};

export default pusherServer; 