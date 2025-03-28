import { useState, useEffect, ChangeEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { updateProfile } from '../lib/slices/userSlice';
import { useWallet } from '../contexts/WalletContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AuraSidebar from '../components/AuraSidebar';
import { Post } from '../lib/slices/postsSlice';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connect, isConnecting } = useWallet();
  const { isDarkMode } = useDarkMode();
  const user = useSelector((state: RootState) => state.user);
  const { userPosts } = useSelector((state: RootState) => state.posts);
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Update form when user data changes
  useEffect(() => {
    if (user.username) setUsername(user.username);
    if (user.bio) setBio(user.bio);
    if (user.avatar) setAvatarUrl(user.avatar);
  }, [user.username, user.bio, user.avatar]);
  
  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    try {
      // In a real app, you'd have an API call here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      dispatch(updateProfile({
        username,
        bio,
        avatar: avatarUrl
      }));
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const truncateWallet = (address: string | null) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const navigateToUserProfile = (authorWallet: string) => {
    router.push(`/profile/${authorWallet}`);
  };
  
  if (!walletAddress) {
    return (
      <>
        <Head>
          <title>Profile | GigaAura</title>
          <meta name="description" content="Your GigaAura profile" />
        </Head>
        
        <div className="min-h-screen bg-light dark:bg-gray-900">
          <Header />
          
          <main className="container mx-auto px-4 py-6">
            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Connect Your Wallet</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Please connect your wallet to view your profile and start earning Aura Points.
              </p>
              
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="px-6 py-3 bg-primary text-white font-medium rounded-full shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors w-full"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Don't have a Phantom wallet? <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get one here</a>
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Head>
        <title>Profile | GigaAura</title>
        <meta name="description" content="Your GigaAura profile" />
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
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                        {username ? username.charAt(0).toUpperCase() : walletAddress.substring(0, 2)}
                      </div>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="mt-2">
                      <input
                        type="text"
                        className={`w-full p-2 border border-gray-300 rounded-md ${
                          isDarkMode 
                            ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                            : 'bg-white text-gray-900'
                        }`}
                        placeholder="Avatar URL"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  {isEditing ? (
                    <input
                      type="text"
                      className={`w-full p-2 text-2xl font-bold border border-gray-300 rounded-md mb-2 ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                          : 'bg-white text-gray-900'
                      }`}
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                    />
                  ) : (
                    <h1 className="text-2xl font-bold mb-1 dark:text-white">{username || 'Anonymous User'}</h1>
                  )}
                  
                  <p className="text-gray-500 dark:text-gray-400 mb-3">{truncateWallet(walletAddress)}</p>
                  
                  {isEditing ? (
                    <textarea
                      className={`w-full p-2 border border-gray-300 rounded-md mb-4 ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                          : 'bg-white text-gray-900'
                      }`}
                      placeholder="Bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={160}
                    />
                  ) : (
                    <p className="mb-4 dark:text-gray-300">{bio || 'No bio yet'}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="bg-[#F6E04C]/10 dark:bg-[#F6E04C]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{userPosts.length}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Posts</p>
                    </div>
                    <div className="bg-[#F0A830]/10 dark:bg-[#F0A830]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{user.followers}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Followers</p>
                    </div>
                    <div className="bg-[#2C89B7]/10 dark:bg-[#2C89B7]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{user.following}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Following</p>
                    </div>
                    <div className="bg-[#F6B73C]/10 dark:bg-[#F6B73C]/5 px-4 py-2 rounded-md">
                      <p className="text-lg font-semibold dark:text-white">{totalPoints}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aura Points</p>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="px-4 py-2 bg-[#2C89B7] text-white rounded-md hover:bg-[#2C89B7]/90 flex-1"
                      >
                        {isSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-[#F6B73C] text-white rounded-md hover:bg-[#F6B73C]/90"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* User Posts */}
            <div>
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Your Posts</h2>
              
              {userPosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">You haven't created any posts yet.</p>
                  <p className="mt-2 dark:text-gray-300">
                    <a href="/" className="text-[#2C89B7] hover:underline">Go to home</a> to create your first post and earn Aura Points!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post: Post) => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="w-10 h-10 rounded-full bg-[#60C5D1] flex items-center justify-center text-white cursor-pointer"
                            onClick={() => navigateToUserProfile(post.authorWallet)}
                          >
                            {username ? username.charAt(0).toUpperCase() : walletAddress.substring(0, 2)}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium dark:text-white">{username || 'Anonymous'}</span>
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

export default ProfilePage; 