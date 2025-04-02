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
import PostCard from '../components/PostCard';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FaCalendarAlt, FaCamera, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { format } from 'date-fns';
import { CheckBadgeIcon, XMarkIcon, CameraIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connectWallet, connecting } = useWallet();
  const { isDarkMode } = useDarkMode();
  const user = useSelector((state: RootState) => state.user);
  const { userPosts, feed } = useSelector((state: RootState) => state.posts);
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [bannerUrl, setBannerUrl] = useState(user.bannerImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editJoinDate] = useState(new Date(2025, 2, 1)); // March 2025
  const [activeTab, setActiveTab] = useState('posts');
  
  // Profile picture upload
  const [showPfpModal, setShowPfpModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [editingBanner, setEditingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // User posts - filter from the main feed
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  
  // Update form when user data changes
  useEffect(() => {
    if (user.username) setUsername(user.username);
    if (user.bio) setBio(user.bio);
    if (user.avatar) setAvatarUrl(user.avatar);
    if (user.bannerImage) setBannerUrl(user.bannerImage);
  }, [user.username, user.bio, user.avatar, user.bannerImage]);
  
  // Get user posts from the feed
  useEffect(() => {
    if (walletAddress && feed.length > 0) {
      const filtered = feed.filter(post => post.authorWallet === walletAddress);
      setMyPosts(filtered);
    }
  }, [walletAddress, feed]);

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
        
        <div className="min-h-screen bg-light dark:bg-dark">
          <Header />
          
          <main className="container mx-auto px-4 py-6">
            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Connect Your Wallet</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Please connect your wallet to view your profile and start earning Aura Points.
              </p>
              
              <button
                onClick={handleConnectWallet}
                disabled={connecting}
                className="px-6 py-3 bg-primary text-white font-medium rounded-full shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors w-full"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
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
        <title>{username || 'My Profile'} | GigaAura</title>
        <meta name="description" content="Your GigaAura profile" />
      </Head>
      
      <div className="min-h-screen bg-light dark:bg-dark">
        <Header />
        
        <main className="container mx-auto grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-[var(--border-color)]">
          <div className="hidden md:block md:col-span-3">
            <Sidebar className="sticky top-20 px-4" />
          </div>
          
          <div className="col-span-1 md:col-span-6 fixed-width-container">
            <div className="feed-container fixed-width-container">
              {/* Profile header with back button and name */}
              <div className="sticky top-0 bg-light dark:bg-dark z-10 px-4 py-3 border-b border-[var(--border-color)] flex items-center">
                <Link href="/home" className="mr-4">
                  <div className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                    <FaArrowLeft className="text-black dark:text-white" />
                  </div>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-black dark:text-white">{username || 'Profile'}</h1>
                  <span className="text-gray-500 text-sm">{myPosts.length} posts</span>
                </div>
              </div>
              
              {/* Banner Image */}
              <div className="relative h-48 bg-gray-300 dark:bg-gray-700">
                {bannerUrl && (
                  <img src={bannerUrl} alt="Profile Banner" className="w-full h-full object-cover" />
                )}
                
                {/* Profile Picture - positioned to overlap banner */}
                <div className="absolute -bottom-16 left-4">
                  <div className="w-32 h-32 rounded-full border-4 border-white dark:border-dark bg-gray-300 dark:bg-gray-700 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                        {username?.charAt(0)?.toUpperCase() || walletAddress?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Edit Profile Button */}
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="bg-black/30 text-white dark:bg-white/20 dark:text-white font-bold py-1 px-4 rounded-full hover:bg-black/40 dark:hover:bg-white/30 transition"
                  >
                    Edit profile
                  </button>
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="px-4 pt-20 pb-4 border-b border-[var(--border-color)]">
                <h1 className="text-xl font-bold text-black dark:text-white flex items-center">
                  {username || 'Anonymous'}
                  {/* Verified badge */}
                  <CheckBadgeIcon className="h-5 w-5 text-primary ml-1" />
                </h1>
                <p className="text-gray-500">@{truncateWallet(walletAddress)}</p>
                
                <p className="text-black dark:text-white mt-3">
                  {bio || 'No bio yet'}
                </p>
                
                <div className="flex items-center text-gray-500 mt-3 space-x-4">
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-2" />
                    <span>Joined {format(editJoinDate, 'MMMM yyyy')}</span>
                  </div>
                  <div>
                    <span className="font-bold text-black dark:text-white">{totalPoints}</span> Aura Points
                  </div>
                </div>
                
                <div className="flex space-x-5 mt-3">
                  <div>
                    <span className="font-bold text-black dark:text-white">175</span>
                    <span className="text-gray-500 ml-1">Following</span>
                  </div>
                  <div>
                    <span className="font-bold text-black dark:text-white">248</span>
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
                {myPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                      {activeTab === 'posts' ? 'You haven\'t posted yet' : 
                       activeTab === 'replies' ? 'No replies yet' :
                       activeTab === 'media' ? 'No media yet' : 'No likes yet'}
                    </h2>
                    <p className="text-gray-500 max-w-md">
                      {activeTab === 'posts' ? 'When you make a post, it will show up here.' : 
                       activeTab === 'replies' ? 'When you reply to a post, it will show up here.' :
                       activeTab === 'media' ? 'Posts with images or videos will show up here.' : 
                       'Posts you\'ve liked will show up here.'}
                    </p>
                  </div>
                ) : (
                  activeTab === 'posts' && myPosts.map(post => (
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
                      {activeTab === 'replies' ? 'When you reply to a post, it will show up here.' :
                       activeTab === 'media' ? 'Posts with images or videos will show up here.' : 
                       'Posts you\'ve liked will show up here.'}
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
      
      {/* Edit Profile Modal (displays over the page when editing is true) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-auto">
          <div className="bg-white dark:bg-dark w-full max-w-xl mx-auto mt-16 rounded-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <div className="flex items-center space-x-4">
                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                  <XMarkIcon className="h-5 w-5 text-black dark:text-white" />
                </button>
                <h2 className="text-xl font-bold text-black dark:text-white">Edit profile</h2>
              </div>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-black dark:bg-white text-white dark:text-black font-bold px-4 py-1.5 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100"
              >
                Save
              </button>
            </div>
            
            {/* Banner Image */}
            <div className="relative h-36 bg-gray-300 dark:bg-gray-700">
              {bannerUrl && (
                <img src={bannerUrl} alt="Profile Banner" className="w-full h-full object-cover" />
              )}
              <button 
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full"
              >
                <CameraIcon className="h-6 w-6" />
              </button>
              <input
                type="file"
                ref={bannerInputRef}
                accept="image/*"
                onChange={(e) => handleImageUpload(e, true)}
                className="hidden"
              />
            </div>
            
            {/* Profile Picture */}
            <div className="relative mx-4 -mt-12">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-dark bg-gray-300 dark:bg-gray-700 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {username?.charAt(0)?.toUpperCase() || walletAddress?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
              >
                <CameraIcon className="h-5 w-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => handleImageUpload(e, false)}
                className="hidden"
              />
            </div>
            
            {/* Edit Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Add your name"
                  className="w-full p-3 bg-transparent border border-[var(--border-color)] rounded-md text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Add your bio"
                  className="w-full p-3 bg-transparent border border-[var(--border-color)] rounded-md text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  maxLength={160}
                ></textarea>
              </div>
              
              <div>
                <p className="text-gray-500 text-sm">
                  Your blue checkmark will be hidden for a period of time after you edit your display
                  name or profile photo until it is reviewed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Picture Crop/Zoom Modal */}
      {showPfpModal && tempImageUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark w-full max-w-md rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black dark:text-white">
                {editingBanner ? 'Edit banner' : 'Edit profile picture'}
              </h3>
              <button 
                onClick={() => {
                  setShowPfpModal(false);
                  setTempImageUrl(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative overflow-hidden">
              <div 
                className={`${
                  editingBanner ? 'w-full h-40' : 'w-64 h-64 mx-auto rounded-full'
                } overflow-hidden bg-gray-200 dark:bg-gray-700`}
              >
                <img 
                  src={tempImageUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${imageZoom})` }}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zoom: {Math.round(imageZoom * 100)}%
              </label>
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
            
            <div className="flex justify-end mt-4 space-x-3">
              <button
                onClick={() => {
                  setShowPfpModal(false);
                  setTempImageUrl(null);
                }}
                className="px-4 py-2 border border-[var(--border-color)] rounded-full text-black dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmProfilePicture}
                className="px-4 py-2 bg-primary text-white rounded-full"
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