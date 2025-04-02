import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../lib/store';
import { useWallet } from '../../contexts/WalletContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Head from 'next/head';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AuraSidebar from '../../components/AuraSidebar';
import PostCard from '../../components/PostCard';
import { Post } from '../../lib/slices/postsSlice';
import { useRouter } from 'next/router';
import { FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { followUser, unfollowUser } from '../../lib/slices/userSlice';
import { v4 as uuidv4 } from 'uuid';
import { addNotification } from '../../lib/slices/notificationsSlice';
import { addTransaction } from '../../lib/slices/auraPointsSlice';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const UserProfilePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { address } = router.query;
  const { walletAddress, connected } = useWallet();
  const { isDarkMode } = useDarkMode();
  const allPosts = useSelector((state: RootState) => state.posts.feed);
  const user = useSelector((state: RootState) => state.user);
  const { following } = user;
  
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userData, setUserData] = useState({
    username: '',
    bio: '',
    avatar: '',
    followers: 0,
    following: 0,
    joinDate: new Date(2025, 2, 1), // Default join date: March 2025
    verified: Math.random() > 0.5 // Random verification for demo purposes
  });
  
  // Check if the current user is following this profile
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Check following status
  useEffect(() => {
    if (address && typeof address === 'string' && following && Array.isArray(following)) {
      setIsFollowing(following.includes(address));
    }
  }, [address, following]);
  
  // Find user data and posts based on the wallet address
  useEffect(() => {
    if (address && typeof address === 'string' && allPosts.length > 0) {
      try {
        // Find posts by this user
        const posts = allPosts.filter(post => post.authorWallet === address);
        setUserPosts(posts);
        
        // Get user data from the first post if available
        if (posts.length > 0) {
          const firstPost = posts[0];
          setUserData(prevData => ({
            ...prevData,
            username: firstPost.authorUsername || 'Anonymous',
            bio: 'User on GigaAura',
            avatar: firstPost.authorAvatar || '',
          }));
        } else {
          // Try to get profile data from localStorage if no posts
          try {
            if (typeof window !== 'undefined') {
              // Load username
              const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
              const username = usernames[address] || null;
              
              // Load avatar
              const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
              const avatar = profilePictures[address] || null;
              
              // Load bio
              const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
              const bio = bios[address] || null;
              
              if (username || avatar || bio) {
                setUserData(prevData => ({
                  ...prevData,
                  username: username || 'Anonymous',
                  bio: bio || 'User on GigaAura',
                  avatar: avatar || '',
                }));
              }
            }
          } catch (error) {
            console.error('Error loading profile data from localStorage:', error);
          }
        }
      } catch (error) {
        console.error('Error processing profile data:', error);
      }
    }
  }, [address, allPosts]);

  const truncateWallet = (addressStr: string | null | undefined) => {
    if (!addressStr) return '';
    try {
      return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
    } catch (error) {
      console.error('Error truncating wallet address:', error);
      return 'Invalid Address';
    }
  };
  
  // Handle follow/unfollow
  const handleFollowToggle = () => {
    if (!connected || !walletAddress) {
      toast.error('Please connect your wallet to follow users');
      return;
    }
    
    if (!address || typeof address !== 'string' || address === walletAddress) {
      // Cannot follow yourself or invalid address
      return;
    }
    
    if (!isFollowing) {
      // Follow user
      dispatch(followUser(address));
      setIsFollowing(true);
      
      // Add notification
      dispatch(addNotification({
        type: 'follow',
        message: `${user.username || truncateWallet(walletAddress)} followed you`,
        fromWallet: walletAddress,
        fromUsername: user.username || undefined,
        postId: undefined
      }));
      
      // Add transaction for Aura Points
      dispatch(addTransaction({
        id: uuidv4(),
        amount: 5,
        timestamp: new Date().toISOString(),
        action: 'follow_given',
        counterpartyName: userData.username || truncateWallet(address),
        counterpartyWallet: address
      }));
      
      toast.success(`You are now following ${userData.username || truncateWallet(address)}`);
    } else {
      // Unfollow user
      dispatch(unfollowUser(address));
      setIsFollowing(false);
      toast.success(`You have unfollowed ${userData.username || truncateWallet(address)}`);
    }
  };
  
  if (!address) {
    return (
      <div className="min-h-screen bg-light dark:bg-dark flex items-center justify-center">
        <p className="text-gray-800 dark:text-white">Loading profile...</p>
      </div>
    );
  }
  
  // Navigate to own profile if viewing own address
  useEffect(() => {
    if (walletAddress && address && walletAddress === address) {
      router.push('/profile');
    }
  }, [walletAddress, address, router]);
  
  return (
    <>
      <Head>
        <title>{userData.username || 'User'} | GigaAura</title>
        <meta name="description" content={`${userData.username || 'User'}'s profile on GigaAura`} />
      </Head>
      
      <div className="min-h-screen bg-light dark:bg-dark">
        <Header />
        
        <main className="container mx-auto grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-[var(--border-color)]">
          <div className="hidden md:block md:col-span-3">
            <Sidebar className="sticky top-20 px-4" />
          </div>
          
          <div className="col-span-1 md:col-span-6 fixed-width-container">
            <div className="feed-container fixed-width-container">
              {/* Header with back button and name */}
              <div className="sticky top-0 bg-light dark:bg-dark z-10 px-4 py-3 border-b border-[var(--border-color)] flex items-center">
                <Link href="/home" className="mr-4">
                  <div className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                    <FaArrowLeft className="text-black dark:text-white" />
                  </div>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-black dark:text-white">{userData.username || 'Profile'}</h1>
                  <span className="text-gray-500 text-sm">{userPosts.length} posts</span>
                </div>
              </div>
              
              {/* Banner */}
              <div className="relative h-48 bg-gray-300 dark:bg-gray-700">
                {/* Profile Picture - positioned to overlap banner */}
                <div className="absolute -bottom-16 left-4">
                  <div className="w-32 h-32 rounded-full border-4 border-white dark:border-dark bg-gray-300 dark:bg-gray-700 overflow-hidden">
                    {userData.avatar ? (
                      <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                        {userData.username?.charAt(0)?.toUpperCase() || (typeof address === 'string' ? address.charAt(0)?.toUpperCase() : '?')}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Follow Button */}
                {connected && walletAddress !== address && (
                  <div className="absolute top-4 right-4">
                    <button 
                      onClick={handleFollowToggle}
                      className={`${
                        isFollowing 
                          ? 'bg-transparent border border-[var(--border-color)] text-black dark:text-white' 
                          : 'bg-black dark:bg-white text-white dark:text-black'
                      } font-bold py-1.5 px-4 rounded-full hover:bg-opacity-90 transition`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="px-4 pt-20 pb-4 border-b border-[var(--border-color)]">
                <h1 className="text-xl font-bold text-black dark:text-white flex items-center">
                  {userData.username || 'Anonymous User'}
                  {userData.verified && (
                    <CheckBadgeIcon className="h-5 w-5 text-primary ml-1" />
                  )}
                </h1>
                <p className="text-gray-500">@{truncateWallet(typeof address === 'string' ? address : undefined)}</p>
                
                <p className="text-black dark:text-white mt-3">
                  {userData.bio || 'No bio yet'}
                </p>
                
                <div className="flex items-center text-gray-500 mt-3 space-x-4">
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-2" />
                    <span>Joined {format(userData.joinDate, 'MMMM yyyy')}</span>
                  </div>
                </div>
                
                <div className="flex space-x-5 mt-3">
                  <div>
                    <span className="font-bold text-black dark:text-white">{userData.following}</span>
                    <span className="text-gray-500 ml-1">Following</span>
                  </div>
                  <div>
                    <span className="font-bold text-black dark:text-white">{userData.followers}</span>
                    <span className="text-gray-500 ml-1">Followers</span>
                  </div>
                </div>
              </div>
              
              {/* Profile Tabs */}
              <div className="border-b border-[var(--border-color)]">
                <div className="flex">
                  <button
                    className={`flex-1 py-4 text-center font-medium relative ${
                      activeTab === 'posts' 
                        ? 'text-black dark:text-white font-bold' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setActiveTab('posts')}
                  >
                    Posts
                    {activeTab === 'posts' && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
                    )}
                  </button>
                  <button
                    className={`flex-1 py-4 text-center font-medium relative ${
                      activeTab === 'replies' 
                        ? 'text-black dark:text-white font-bold' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setActiveTab('replies')}
                  >
                    Replies
                    {activeTab === 'replies' && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
                    )}
                  </button>
                  <button
                    className={`flex-1 py-4 text-center font-medium relative ${
                      activeTab === 'media' 
                        ? 'text-black dark:text-white font-bold' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setActiveTab('media')}
                  >
                    Media
                    {activeTab === 'media' && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
                    )}
                  </button>
                  <button
                    className={`flex-1 py-4 text-center font-medium relative ${
                      activeTab === 'likes' 
                        ? 'text-black dark:text-white font-bold' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setActiveTab('likes')}
                  >
                    Likes
                    {activeTab === 'likes' && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
                    )}
                  </button>
                </div>
              </div>
              
              {/* User Posts */}
              <div>
                {userPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                      {activeTab === 'posts' ? '@' + userData.username + ' hasn\'t posted yet' : 
                       activeTab === 'replies' ? 'No replies yet' :
                       activeTab === 'media' ? 'No media yet' : 'No likes yet'}
                    </h2>
                    <p className="text-gray-500 max-w-md">
                      {activeTab === 'posts' ? 'When they post, their posts will show up here.' : 
                       activeTab === 'replies' ? 'When they reply to a post, it will show up here.' :
                       activeTab === 'media' ? 'Posts with images or videos will show up here.' : 
                       'Posts they\'ve liked will show up here.'}
                    </p>
                  </div>
                ) : (
                  activeTab === 'posts' && userPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
                
                {activeTab !== 'posts' && (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                      {activeTab === 'replies' ? 'No replies yet' :
                       activeTab === 'media' ? 'No media yet' : 'No likes yet'}
                    </h2>
                    <p className="text-gray-500 max-w-md">
                      {activeTab === 'replies' ? 'When they reply to a post, it will show up here.' :
                       activeTab === 'media' ? 'Posts with images or videos will show up here.' : 
                       'Posts they\'ve liked will show up here.'}
                    </p>
                  </div>
                )}
              </div>
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

export default UserProfilePage; 