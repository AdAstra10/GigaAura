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

// Helper function to trigger a new post event
export const triggerNewPost = async (post: any) => {
  try {
    await pusherServer.trigger(
      PUSHER_CHANNELS.POSTS,
      PUSHER_EVENTS.NEW_POST,
      post
    );
    console.log('Triggered new post event via Pusher');
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
  }
};

// Helper function to trigger an updated post event
export const triggerUpdatedPost = async (post: any) => {
  try {
    await pusherServer.trigger(
      PUSHER_CHANNELS.POSTS,
      PUSHER_EVENTS.UPDATED_POST,
      post
    );
    console.log('Triggered updated post event via Pusher');
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
  }
};

// Helper function to trigger a new notification event
export const triggerNewNotification = async (notification: any) => {
  try {
    await pusherServer.trigger(
      PUSHER_CHANNELS.NOTIFICATIONS,
      PUSHER_EVENTS.NEW_NOTIFICATION,
      notification
    );
    console.log('Triggered new notification event via Pusher');
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
  }
};

export default pusherServer; 