import { useState, useEffect, ChangeEvent, useRef } from 'react';
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
import toast from 'react-hot-toast';
import { FaCalendarAlt, FaCamera } from 'react-icons/fa';
import { format } from 'date-fns';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connectWallet, isLoading } = useWallet();
  const { isDarkMode } = useDarkMode();
  const user = useSelector((state: RootState) => state.user);
  const { userPosts } = useSelector((state: RootState) => state.posts);
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [bannerUrl, setBannerUrl] = useState(user.bannerImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editJoinDate] = useState(new Date(2025, 2, 1)); // March 2025
  
  // Profile picture upload
  const [showPfpModal, setShowPfpModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [editingBanner, setEditingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Update form when user data changes
  useEffect(() => {
    if (user.username) setUsername(user.username);
    if (user.bio) setBio(user.bio);
    if (user.avatar) setAvatarUrl(user.avatar);
    if (user.bannerImage) setBannerUrl(user.bannerImage);
  }, [user.username, user.bio, user.avatar, user.bannerImage]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isBanner = false) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.includes('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageUrl(reader.result as string);
        setShowPfpModal(true);
        setEditingBanner(isBanner);
        setImageZoom(1);
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const handleConfirmProfilePicture = () => {
    if (tempImageUrl) {
      if (editingBanner) {
        setBannerUrl(tempImageUrl);
      } else {
        setAvatarUrl(tempImageUrl);
      }
      setShowPfpModal(false);
      setTempImageUrl(null);
      setEditingBanner(false);
    }
  };
  
  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    try {
      // In a real app, you'd have an API call here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      dispatch(updateProfile({
        username,
        bio,
        avatar: avatarUrl,
        bannerImage: bannerUrl
      }));
      
      // Save profile data to localStorage for persistence with wallet address
      if (walletAddress) {
        // Create centralized function to save all profile data
        const saveProfileData = () => {
          // Save profile picture
          if (avatarUrl) {
            const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
            profilePictures[walletAddress] = avatarUrl;
            localStorage.setItem('profilePictures', JSON.stringify(profilePictures));
          }
          
          // Save banner image
          if (bannerUrl) {
            const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
            bannerImages[walletAddress] = bannerUrl;
            localStorage.setItem('bannerImages', JSON.stringify(bannerImages));
          }
          
          // Save username
          if (username) {
            const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
            usernames[walletAddress] = username;
            localStorage.setItem('usernames', JSON.stringify(usernames));
          }
          
          // Save bio
          if (bio) {
            const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
            bios[walletAddress] = bio;
            localStorage.setItem('userBios', JSON.stringify(bios));
          }
        };
        
        // Execute the save function
        saveProfileData();
        
        // Force a reload of profile data to ensure it's updated across the app
        // This is important for ensuring that Header component also sees the changes
        dispatch(updateProfile({
          username,
          bio,
          avatar: avatarUrl,
          bannerImage: bannerUrl
        }));
      }
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
      await connectWallet();
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
                disabled={isLoading}
                className="px-6 py-3 bg-primary text-white font-medium rounded-full shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors w-full"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
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
          <div className="hidden md:block md:col-span-3 sidebar-column">
            <Sidebar className="sticky top-20" />
          </div>
          
          <div className="col-span-1 md:col-span-6 space-y-6 content-column">
            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow overflow-hidden card-outline">
              {/* Banner Image */}
              <div className="relative h-40 bg-gradient-to-r from-yellow-400 via-green-400 to-blue-400">
                {bannerUrl && (
                  <img src={bannerUrl} alt="Profile Banner" className="w-full h-full object-cover" />
                )}
                {isEditing && (
                  <button 
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full"
                  >
                    <FaCamera size={16} />
                  </button>
                )}
                <input
                  type="file"
                  ref={bannerInputRef}
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                  style={{ display: 'none' }}
                />
              </div>
              
              <div className="p-6 pt-16">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  <div className="relative -mt-24 z-10">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-[#60C5D1] border-4 border-white dark:border-gray-800">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={username || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                          {username ? username.charAt(0).toUpperCase() : walletAddress.substring(0, 2)}
                        </div>
                      )}
                    </div>
                    
                    {isEditing && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full"
                      >
                        <FaCamera size={16} />
                      </button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      style={{ display: 'none' }}
                    />
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
                    
                    <p className="text-gray-500 dark:text-gray-400 mb-1">@{username || truncateWallet(walletAddress)}</p>
                    
                    <div className="flex items-center justify-center sm:justify-start text-gray-500 dark:text-gray-400 mb-3">
                      <FaCalendarAlt className="mr-1" size={14} />
                      <span className="text-sm">Joined {format(editJoinDate, 'MMMM yyyy')}</span>
                    </div>
                    
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
                        <p className="text-lg font-semibold dark:text-white">{user.followers?.length || 0}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Followers</p>
                      </div>
                      <div className="bg-[#2C89B7]/10 dark:bg-[#2C89B7]/5 px-4 py-2 rounded-md">
                        <p className="text-lg font-semibold dark:text-white">{user.following?.length || 0}</p>
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
                          className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 hover-effect"
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
            </div>
            
            {/* User Posts */}
            <div>
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Your Posts</h2>
              
              {userPosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow p-6 text-center card-outline">
                  <p className="text-gray-500 dark:text-gray-400">You haven't created any posts yet.</p>
                  <p className="mt-2 dark:text-gray-300">
                    <a href="/" className="text-[#2C89B7] hover:underline">Go to home</a> to create your first post and earn Aura Points!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post: Post) => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow p-4 card-outline">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#60C5D1]">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username || 'User'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                {user.username ? user.username.charAt(0).toUpperCase() : walletAddress.substring(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="font-medium dark:text-white">{user.username || 'Anonymous User'}</h3>
                            <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                              • {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="my-2 dark:text-gray-200">{post.content}</p>
                          
                          {post.mediaUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden">
                              {post.mediaType === 'image' ? (
                                <img 
                                  src={post.mediaUrl} 
                                  alt="Post media" 
                                  className="w-full h-auto"
                                />
                              ) : (
                                <video 
                                  src={post.mediaUrl} 
                                  controls 
                                  className="w-full"
                                ></video>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-3 flex space-x-4 text-sm">
                            <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{post.likes}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>{post.comments}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
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

      {/* Image Edit Modal for both profile picture and banner */}
      {showPfpModal && tempImageUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-xl w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">
              {editingBanner ? 'Edit Banner Image' : 'Set Profile Picture'}
            </h3>
            
            <div className="flex justify-center mb-4 overflow-hidden">
              <div className={`overflow-hidden ${editingBanner ? 'w-full h-48 aspect-[3/1]' : 'w-64 h-64 rounded-full'}`}>
                <img 
                  src={tempImageUrl} 
                  alt={editingBanner ? "Banner" : "Profile"} 
                  className="w-full h-full object-cover transform"
                  style={{ transform: `scale(${imageZoom})` }}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="text-sm text-gray-600 dark:text-gray-300 mb-1 block">Zoom</label>
              <input 
                type="range" 
                min="1" 
                max="2" 
                step="0.01" 
                value={imageZoom} 
                onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-center text-sm">
              {editingBanner 
                ? 'Recommended banner size is 1500×500 pixels (3:1 aspect ratio)' 
                : 'Recommended profile picture size is 400×400 pixels'}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPfpModal(false);
                  setTempImageUrl(null);
                  setEditingBanner(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmProfilePicture}
                className="px-4 py-2 bg-primary text-white rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage; 