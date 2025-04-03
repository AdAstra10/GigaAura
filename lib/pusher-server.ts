import Pusher from 'pusher';

// Initialize the Pusher server instance with your app credentials
const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '1968757',
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '477339a84785c23745a5',
  secret: process.env.PUSHER_APP_SECRET || 'e57493127c3d8f40e1ab',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true, // Use TLS for secure connections
});

// Import channel and event names for consistency
import { PUSHER_CHANNELS, PUSHER_EVENTS } from './pusher';

// Helper function to safely trigger a Pusher event with error handling
const safelyTriggerEvent = async (channel: string, event: string, data: any): Promise<boolean> => {
  try {
    await pusherServer.trigger(channel, event, data);
    console.log(`Successfully triggered ${event} on ${channel}`);
    return true;
  } catch (error) {
    console.error(`Error triggering ${event} on ${channel}:`, error);
    return false;
  }
};

// Helper function to trigger a new post event
export const triggerNewPost = async (post: any) => {
  return safelyTriggerEvent(PUSHER_CHANNELS.POSTS, PUSHER_EVENTS.NEW_POST, post);
};

// Helper function to trigger an updated post event
export const triggerUpdatedPost = async (post: any) => {
  return safelyTriggerEvent(PUSHER_CHANNELS.POSTS, PUSHER_EVENTS.UPDATED_POST, post);
};

// Helper function to trigger a new notification event
export const triggerNewNotification = async (notification: any) => {
  return safelyTriggerEvent(PUSHER_CHANNELS.NOTIFICATIONS, PUSHER_EVENTS.NEW_NOTIFICATION, notification);
};

// Helper function to test Pusher connectivity
export const testPusherConnection = async (): Promise<{success: boolean, message: string}> => {
  try {
    // Trigger a test event on a test channel
    await pusherServer.trigger('test-channel', 'test-event', {
      message: 'Test message',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Successfully connected to Pusher and triggered test event'
    };
  } catch (error) {
    console.error('Pusher connection test failed:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export default pusherServer; 