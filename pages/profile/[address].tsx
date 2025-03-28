import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { useWallet } from '../../contexts/WalletContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Head from 'next/head';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import AuraSidebar from '../../components/AuraSidebar';
import { Post } from '../../lib/slices/postsSlice';
import { useRouter } from 'next/router';

const UserProfilePage = () => {
  const router = useRouter();
  const { address } = router.query;
  const { walletAddress } = useWallet();
  const { isDarkMode } = useDarkMode();
  const allPosts = useSelector((state: RootState) => state.posts.feed);
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userData, setUserData] = useState({
    username: '',
    bio: '',
    avatar: '',
    followers: 0,
    following: 0
  });
  
  // Find user data and posts based on the wallet address
  useEffect(() => {
    if (address && typeof address === 'string' && allPosts.length > 0) {
      // Find posts by this user
      const posts = allPosts.filter(post => post.authorWallet === address);
      setUserPosts(posts);
      
      // Get user data from the first post if available
      if (posts.length > 0) {
        const firstPost = posts[0];
        setUserData({
          username: firstPost.authorUsername || 'Anonymous',
          bio: 'User on GigaAura',
          avatar: firstPost.authorAvatar || '',
          followers: Math.floor(Math.random() * 100), // Mock data
          following: Math.floor(Math.random() * 100)  // Mock data
        });
      }
    }
  }, [address, allPosts]);

  const truncateWallet = (addressStr: string | null) => {
    if (!addressStr) return '';
    return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
  };
  
  // Handle follow action (mock functionality)
  const handleFollow = () => {
    alert('Following user functionality would be implemented here');
  };
  
  if (!address) {
    return (
      <div className="min-h-screen bg-light dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-800 dark:text-white">Loading profile...</p>
      </div>
    );
  }
  
  const isOwnProfile = walletAddress === address;
  if (isOwnProfile) {
    router.push('/profile');
    return null;
  }
  
  return (
    <>
      <Head>
        <title>{userData.username || 'User'} | GigaAura</title>
        <meta name="description" content={`${userData.username || 'User'}'s profile on GigaAura`} />
      </Head>
      
      <div className="min-h-screen bg-light dark:bg-gray-900">
        <Header />
        
        <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3">
            <Sidebar />
          </div>
          
          <div className="col-span-1 md:col-span-6 space-y-6">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-[#60C5D1]">
                    {userData.avatar ? (
                      <img src={userData.avatar} alt={userData.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                        {userData.username ? userData.username.charAt(0).toUpperCase() : (address as string).substring(0, 2)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold mb-1 dark:text-white">{userData.username || 'Anonymous User'}</h1>
                  <p className="text-gray-500 dark:text-gray-400 mb-3">{truncateWallet(address as string)}</p>
                  <p className="mb-4 dark:text-gray-300">{userData.bio || 'No bio yet'}</p>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="bg-[#F6E04C]/10 dark:bg-[#F6E04C]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{userPosts.length}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Posts</p>
                    </div>
                    <div className="bg-[#F0A830]/10 dark:bg-[#F0A830]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{userData.followers}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Followers</p>
                    </div>
                    <div className="bg-[#2C89B7]/10 dark:bg-[#2C89B7]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{userData.following}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Following</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleFollow}
                    className="px-4 py-2 bg-[#2C89B7] text-white rounded-md hover:bg-[#2C89B7]/90"
                  >
                    Follow
                  </button>
                </div>
              </div>
            </div>
            
            {/* User Posts */}
            <div>
              <h2 className="text-xl font-semibold mb-4 dark:text-white">{userData.username}'s Posts</h2>
              
              {userPosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">This user hasn't created any posts yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post: Post) => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#60C5D1] flex items-center justify-center text-white">
                            {userData.username ? userData.username.charAt(0).toUpperCase() : (address as string).substring(0, 2)}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium dark:text-white">{userData.username || 'Anonymous'}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="mt-2 dark:text-gray-300">{post.content}</p>
                          
                          {post.mediaUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden">
                              {post.mediaType === 'image' ? (
                                <img src={post.mediaUrl} alt="Post media" className="w-full h-auto" />
                              ) : post.mediaType === 'video' ? (
                                <video src={post.mediaUrl} controls className="w-full" />
                              ) : null}
                            </div>
                          )}
                          
                          <div className="mt-3 flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <span>❤️</span>
                              <span>{post.likes}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>💬</span>
                              <span>{post.comments}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>🔄</span>
                              <span>{post.shares}</span>
                            </div>
                          </div>
                        </div>
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

export default UserProfilePage; 