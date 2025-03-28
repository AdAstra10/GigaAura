import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@lib/store';
import { setNotifications, markAllAsRead, markAsRead, Notification } from '@lib/slices/notificationsSlice';
import Head from 'next/head';
import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import AuraSidebar from '@components/AuraSidebar';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

const NotificationsPage = () => {
  const dispatch = useDispatch();
  const { items, unreadCount } = useSelector((state: RootState) => state.notifications);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  // Load notifications on component mount
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);

      try {
        // Simulating API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate mock notifications
        const now = Date.now();
        const mockNotifications: Notification[] = [
          {
            id: uuidv4(),
            type: 'like',
            message: 'CryptoWhale liked your post',
            fromWallet: '3xGh..p7F1',
            fromUsername: 'CryptoWhale',
            fromAvatar: 'https://cloudinary.com/avatar1.jpg',
            postId: 'post-123',
            timestamp: new Date(now - 1000 * 60 * 10).toISOString(), // 10 minutes ago
            read: false
          },
          {
            id: uuidv4(),
            type: 'comment',
            message: 'SolanaBuilder commented on your post: "Great insights!"',
            fromWallet: '7kJt..r2D5',
            fromUsername: 'SolanaBuilder',
            postId: 'post-456',
            commentId: 'comment-123',
            timestamp: new Date(now - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            read: false
          },
          {
            id: uuidv4(),
            type: 'follow',
            message: 'NFTCollector started following you',
            fromWallet: '9pWb..z8T2',
            fromUsername: 'NFTCollector',
            timestamp: new Date(now - 1000 * 60 * 120).toISOString(), // 2 hours ago
            read: true
          },
          {
            id: uuidv4(),
            type: 'system',
            message: 'You earned 50 Aura Points this week! Keep engaging to earn more.',
            timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            read: true
          },
          {
            id: uuidv4(),
            type: 'share',
            message: 'Web3Visionary shared your post',
            fromWallet: '2yFR..p8L3',
            fromUsername: 'Web3Visionary',
            postId: 'post-789',
            timestamp: new Date(now - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
            read: true
          }
        ];

        dispatch(setNotifications(mockNotifications));
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [dispatch]);

  // Mark notification as read when clicked
  const handleNotificationClick = (notificationId: string) => {
    dispatch(markAsRead(notificationId));
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  // Filter notifications based on activeFilter
  const filteredNotifications = activeFilter === 'unread'
    ? items.filter(notification => !notification.read)
    : items;

  // Format relative time
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMs = now.getTime() - notificationTime.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMins < 60) {
      return `${diffInMins}m ago`;
    } else if (diffInMins < 24 * 60) {
      return `${Math.floor(diffInMins / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMins / (60 * 24))}d ago`;
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <div className="bg-[#F6B73C] w-10 h-10 rounded-full flex items-center justify-center text-white">
            ❤️
          </div>
        );
      case 'comment':
        return (
          <div className="bg-[#F0A830] w-10 h-10 rounded-full flex items-center justify-center text-white">
            💬
          </div>
        );
      case 'follow':
        return (
          <div className="bg-[#2C89B7] w-10 h-10 rounded-full flex items-center justify-center text-white">
            👤
          </div>
        );
      case 'share':
        return (
          <div className="bg-[#60C5D1] w-10 h-10 rounded-full flex items-center justify-center text-white">
            🔄
          </div>
        );
      case 'system':
        return (
          <div className="bg-[#F6E04C] w-10 h-10 rounded-full flex items-center justify-center text-white">
            🔔
          </div>
        );
      default:
        return (
          <div className="bg-gray-400 w-10 h-10 rounded-full flex items-center justify-center text-white">
            📮
          </div>
        );
    }
  };

  return (
    <>
      <Head>
        <title>Notifications | GigaAura</title>
        <meta name="description" content="Your notifications on GigaAura" />
      </Head>

      <div className="min-h-screen bg-light">
        <Header />
        
        <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3">
            <Sidebar />
          </div>
          
          <div className="col-span-1 md:col-span-6">
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-bold">Notifications</h1>
                  <div className="bg-[#F6B73C] text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount > 0 ? unreadCount : 'All read'}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="border rounded-md overflow-hidden">
                    <button
                      className={`px-3 py-1 text-sm ${activeFilter === 'all' ? 'bg-[#2C89B7] text-white' : 'bg-white text-gray-700'}`}
                      onClick={() => setActiveFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-3 py-1 text-sm ${activeFilter === 'unread' ? 'bg-[#2C89B7] text-white' : 'bg-white text-gray-700'}`}
                      onClick={() => setActiveFilter('unread')}
                    >
                      Unread
                    </button>
                  </div>
                  
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[#2C89B7] text-sm hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
              </div>
              
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No notifications to display.</p>
                  {activeFilter === 'unread' && (
                    <p className="mt-2 text-sm">
                      <button
                        onClick={() => setActiveFilter('all')}
                        className="text-[#2C89B7] hover:underline"
                      >
                        View all notifications
                      </button>
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-[#F6B73C]/5' : ''}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        
                        <div className="flex-1">
                          <p className={`${!notification.read ? 'font-medium' : ''}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                        
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-[#F6B73C]"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden md:block md:col-span-3">
            <AuraSidebar />
          </div>
        </main>
      </div>
    </>
  );
};

export default NotificationsPage; 