import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../lib/store';
// Only import existing types/actions from the slice
import { setNotifications, Notification } from '../lib/slices/notificationsSlice'; 
import Layout from '../components/Layout';
import { FaUserPlus, FaHeart, FaRegComment, FaRetweet, FaAt } from 'react-icons/fa'; 
import { BellIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useWallet } from '../contexts/WalletContext';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

// Helper to get notification icon - Use base Notification['type']
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'follow': return <FaUserPlus className="text-blue-500" />;
    case 'like': return <FaHeart className="text-red-500" />;
    case 'comment': return <FaRegComment className="text-green-500" />;
    case 'share': return <FaRetweet className="text-purple-500" />; // Assuming 'share' exists, adjust if needed
    case 'system': return <BellIcon className="text-gray-500" />;
    // Handle other potential base types or default
    default: return <BellIcon className="text-gray-500" />; // Default icon for unknown types
  }
};

// Helper to format time ago
const formatTimeAgo = (timestamp: string | Date): string => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "recently";
  }
};

const NotificationsPage: NextPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  // Use the base Notification type from the slice
  const notifications = useSelector((state: RootState) => state.notifications.items); 
  const { connected, walletAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mentions'>('all');

  // Fetch notifications (replace with API call if backend exists)
  useEffect(() => {
    if (connected && walletAddress) {
      setIsLoading(true);
      // Simulate fetching or load from localStorage
      try {
        const storedNotifications = localStorage.getItem(`giga-aura-notifications-${walletAddress}`);
        if (storedNotifications) {
          const parsedNotifications = JSON.parse(storedNotifications);
          if (Array.isArray(parsedNotifications)) {
            // Ensure dispatching data matching Notification[] type
            dispatch(setNotifications(parsedNotifications as Notification[])); 
          } else {
             dispatch(setNotifications([]));
          }
        } else {
          dispatch(setNotifications([])); // Set empty if no storage/API
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
        toast.error('Failed to load notifications.');
        dispatch(setNotifications([]));
      } finally {
        setIsLoading(false);
      }
    } else {
      dispatch(setNotifications([])); // Clear if not connected
      setIsLoading(false);
    }
  }, [dispatch, connected, walletAddress]);

  const handleRemoveNotification = (id: string) => {
    if (!walletAddress) return; 
    console.warn("removeNotification action not implemented, removing locally.");
    const updatedNotifications = notifications.filter(n => n.id !== id);
    // Dispatch with Notification[] type
    dispatch(setNotifications(updatedNotifications as Notification[])); 
    toast.success('Notification dismissed.');
    try {
      localStorage.setItem(`giga-aura-notifications-${walletAddress}`, JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error("Error saving notifications to storage:", error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'mentions') {
       console.warn("Filtering by mentions is not supported yet as 'mention' type might not exist.");
       return false; // Return empty for mentions for now
     }
    return false;
  });


  return (
    <Layout> 
      <Head>
        <title>Notifications | GigaAura</title>
        <meta name="description" content="View your notifications on GigaAura" />
      </Head>

      {/* Sticky Header for Notifications */}
       <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
         {/* Top bar */} 
         <div className="px-4 py-3 flex justify-between items-center">
           <h1 className="text-xl font-bold text-black dark:text-white">Notifications</h1>
         </div>
         {/* Filter Tabs */} 
         <div className="flex border-b border-gray-200 dark:border-gray-800">
           <button
             onClick={() => setFilter('all')}
             className={`flex-1 py-3 text-center font-medium transition-colors ${filter === 'all' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
           >
             All
           </button>
           <button
             onClick={() => setFilter('mentions')}
             className={`flex-1 py-3 text-center font-medium transition-colors ${filter === 'mentions' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
           >
             Mentions
           </button>
         </div>
       </div>

      {/* Notifications List */} 
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {/* Adjust empty state message based on filter */}
             {filter === 'mentions' 
               ? 'You have no mentions yet.'
               : 'You have no notifications yet.'}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div key={notification.id} className="flex items-start space-x-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
              <div className="flex-shrink-0 w-6 pt-1 text-center">
                 {/* Use base type for icon */} 
                 {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                 {/* Use optional chaining for potentially missing properties */}
                 {(notification as any).user?.walletAddress && (
                   <Image 
                     src={(notification as any).fromAvatar || '/default-avatar.png'} 
                     alt="" 
                     width={24} 
                     height={24} 
                     className="w-6 h-6 rounded-full mr-2 inline-block align-middle object-cover"/>
                 )}
                <p className="text-sm text-black dark:text-white leading-snug inline align-middle">
                   {(notification as any).user?.walletAddress && (
                     <Link href={`/profile/${(notification as any).user.walletAddress}`} passHref>
                       <span className="font-bold hover:underline cursor-pointer">{(notification as any).user.username || 'Someone'}</span>
                     </Link>
                   )}
                  {' '}{notification.message}
                  {(notification as any).postId && (
                    <Link href={`/post/${(notification as any).postId}`} passHref>
                       <span className="text-primary hover:underline cursor-pointer"> your post</span>
                    </Link>
                  )}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                  {formatTimeAgo(notification.timestamp)}
                </span>
              </div>
              {/* Dismiss button */} 
              <button 
                onClick={() => handleRemoveNotification(notification.id)} 
                className="text-gray-400 hover:text-red-500 text-xs p-1 -mr-1"
                aria-label="Dismiss notification"
              >
                 &times;
              </button>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage; 