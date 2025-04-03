import Pusher from 'pusher-js';

// Initialize Pusher client with your app credentials
const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '', {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  forceTLS: true, // Use TLS for secure connections
});

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