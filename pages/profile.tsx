import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../lib/store';
import { updateProfile, User } from '../lib/slices/userSlice';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Layout from '../components/Layout';
import AuraSidebar from '../components/AuraSidebar';
import { Post } from '../lib/slices/postsSlice';
import PostCard from '../components/PostCard';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FaCalendarAlt, FaCamera, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { format } from 'date-fns';
import { CheckBadgeIcon, XMarkIcon, CameraIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

// Extend the User type locally if needed for joinDate (or add to slice)
interface ProfileData extends Partial<User> {
  joinDate?: string | Date; // Add optional joinDate
}

// Loading Spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-10">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const ProfilePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { targetWalletAddress } = router.query; 
  const { walletAddress: connectedWalletAddress, connectWallet, connecting } = useWallet();
  const userState = useSelector((state: RootState) => state.user);
  const { feed } = useSelector((state: RootState) => state.posts);
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  // Determine which wallet address to display/use
  const displayWalletAddress = typeof targetWalletAddress === 'string' ? targetWalletAddress : connectedWalletAddress;
  const isOwnProfile = displayWalletAddress === connectedWalletAddress;

  // State specific to the displayed profile, use extended type
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  // Edit form state - initialize with profileData or defaults
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  
  // Image editing state
  const [showPfpModal, setShowPfpModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [editingBanner, setEditingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching and Initialization --- 

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!displayWalletAddress) {
         setIsLoadingProfile(false);
         // Optionally redirect or show message if no address is available
         // if (!connectedWalletAddress) router.push('/home'); // Example redirect
         return;
      }
      
      setIsLoadingProfile(true);
      console.log(`Fetching profile for: ${displayWalletAddress}`);
      try {
        // TODO: Replace with actual API call to fetch profile data by wallet address
        // const fetchedData = await fetch(`/api/profile/${displayWalletAddress}`).then(res => res.json());
        
        // --- Mock/LocalStorage Fetching --- 
        let fetchedData: ProfileData = {}; // Use ProfileData type
        if (isOwnProfile) {
          // For own profile, use Redux state and add a default joinDate if not present
          fetchedData = { ...userState, joinDate: new Date() }; // Default joinDate to now
        } else {
          // Try loading from localStorage for other profiles (basic persistence)
          const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
          const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
          const avatars = JSON.parse(localStorage.getItem('profilePictures') || '{}');
          const banners = JSON.parse(localStorage.getItem('bannerImages') || '{}');
          // Fetch joinDate if stored, otherwise use placeholder
          const joinDates = JSON.parse(localStorage.getItem('joinDates') || '{}'); 
          fetchedData = {
            username: usernames[displayWalletAddress],
            bio: bios[displayWalletAddress],
            avatar: avatars[displayWalletAddress],
            bannerImage: banners[displayWalletAddress],
            joinDate: joinDates[displayWalletAddress] || new Date(), // Use stored or default
            // Add other fields like followers/following counts if fetched
          };
        }
        // --- End Mock/LocalStorage --- 

        setProfileData(fetchedData);
        // Initialize edit form state only after data is fetched
        setUsername(fetchedData.username || '');
        setBio(fetchedData.bio || '');
        setAvatarUrl(fetchedData.avatar || '');
        setBannerUrl(fetchedData.bannerImage || '');

        // Fetch posts for this profile
        const userSpecificPosts = feed.filter(post => post.authorWallet === displayWalletAddress);
        setProfilePosts(userSpecificPosts);
        console.log(`Found ${userSpecificPosts.length} posts for ${displayWalletAddress}`);

      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Could not load profile.');
        setProfileData({}); // Clear data on error
        setProfilePosts([]);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [displayWalletAddress, isOwnProfile, userState, feed]); // Rerun if address changes or own profile state updates

  // --- Edit Handlers --- 

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isBanner = false) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) { // Corrected check
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
    if (!isOwnProfile) return; // Should not happen, but safeguard

    setIsSaving(true);
    const profileUpdateData = {
      username,
      bio,
      avatar: avatarUrl,
      bannerImage: bannerUrl
      // Include joinDate if it's part of the update payload
    };

    try {
      // TODO: Replace with actual API call to update profile
      // await fetch(`/api/profile/update`, { method: 'POST', body: JSON.stringify(profileUpdateData) });
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Dispatch update to Redux store
      dispatch(updateProfile(profileUpdateData));
      
      // Save profile data to localStorage for persistence
      if (connectedWalletAddress) {
          const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
          const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
          const avatars = JSON.parse(localStorage.getItem('profilePictures') || '{}');
          const banners = JSON.parse(localStorage.getItem('bannerImages') || '{}');
          // Assume joinDate is set once and not updated, or handle update if needed
          
          usernames[connectedWalletAddress] = username;
          bios[connectedWalletAddress] = bio;
          avatars[connectedWalletAddress] = avatarUrl;
          banners[connectedWalletAddress] = bannerUrl;

          localStorage.setItem('usernames', JSON.stringify(usernames));
          localStorage.setItem('userBios', JSON.stringify(bios));
          localStorage.setItem('profilePictures', JSON.stringify(avatars));
          localStorage.setItem('bannerImages', JSON.stringify(banners));
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

  // --- Helper Functions --- 
  
  const truncateWallet = (address: string | null | undefined) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      // No need to redirect here, the main effect will pick up the change
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet.');
    }
  };

  // --- Render Logic --- 

  // Show connect prompt if trying to view any profile without being connected
  if (!connectedWalletAddress && !isLoadingProfile) { 
    return (
      <Layout>
        <Head>
          <title>Connect Wallet | GigaAura</title>
        </Head>
        <div className="flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-100px)]">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your wallet to view profiles and interact with GigaAura.
          </p>
          <button
            onClick={handleConnectWallet}
            disabled={connecting}
            className="px-6 py-3 bg-primary text-white font-medium rounded-full shadow-md hover:bg-primary/90 transition-colors"
          >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </Layout>
    );
  }
  
  // Main profile content
  return (
    <Layout rightSidebarContent={<AuraSidebar />}> 
      <Head>
        {/* Use fetched profile username or default */}
        <title>{profileData.username || truncateWallet(displayWalletAddress) || 'Profile'} | GigaAura</title>
        <meta name="description" content={`Profile of ${profileData.username || displayWalletAddress} on GigaAura`} />
      </Head>
      
      {/* Profile Header (Sticky) */} 
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center space-x-4">
        <button onClick={() => router.back()} className="text-black dark:text-white p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white leading-tight">{profileData.username || 'Profile'}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{profilePosts.length} Posts</p> {/* Post count */} 
        </div>
      </div>

      {isLoadingProfile ? (
        <LoadingSpinner />
      ) : (
        <> 
          {/* Banner Image */}
          <div className="relative h-48 bg-gray-300 dark:bg-gray-700">
            {isEditing && isOwnProfile && (
              <button 
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-xs opacity-0 hover:opacity-100 transition-opacity"
              >
                <CameraIcon className="h-5 w-5 mr-1" /> Change Banner
              </button>
            )}
            {bannerUrl ? (
              <Image src={bannerUrl} alt="Banner" layout="fill" objectFit="cover" />
            ) : (
              <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500"></div> // Default gradient
            )}
            <input type="file" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, true)} accept="image/*" className="hidden" />
          </div>

          {/* Profile Info Section */} 
          <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-start -mt-16">
              {/* Avatar */} 
              <div className="relative">
                 <div className="w-32 h-32 rounded-full border-4 border-white dark:border-black bg-gray-200 dark:bg-gray-600 overflow-hidden">
                   {avatarUrl ? (
                     <Image src={avatarUrl} alt="Avatar" width={128} height={128} objectFit="cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">?</div>
                   )}
                 </div>
                 {isEditing && isOwnProfile && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 bg-gray-800 p-2 rounded-full text-white hover:bg-gray-700"
                      aria-label="Change profile picture"
                    >
                       <CameraIcon className="h-4 w-4" />
                    </button>
                 )}
                 <input type="file" ref={fileInputRef} onChange={(e) => handleImageUpload(e, false)} accept="image/*" className="hidden" />
               </div>

              {/* Edit/Follow Button */} 
              {isOwnProfile ? (
                isEditing ? (
                  <div className="flex space-x-2 mt-16">
                    <button 
                      onClick={() => {
                        setIsEditing(false); 
                        // Reset form if needed
                        setUsername(profileData.username || ''); 
                        setBio(profileData.bio || '');
                        setAvatarUrl(profileData.avatar || '');
                        setBannerUrl(profileData.bannerImage || '');
                      }}
                      className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-4 py-1.5 text-sm bg-black text-white dark:bg-white dark:text-black rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="mt-16 px-4 py-1.5 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Edit profile
                  </button>
                )
              ) : (
                 // TODO: Implement Follow/Unfollow Button Logic
                 <button className="mt-16 px-4 py-1.5 text-sm font-semibold bg-black text-white dark:bg-white dark:text-black rounded-full hover:opacity-90">
                   Follow
                 </button>
               )}
             </div>

            {/* Username, Handle, Bio */} 
            <div className="mt-3">
              {isEditing ? (
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Username"
                  className="text-xl font-bold text-black dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-700 focus:outline-none focus:border-primary w-full mb-1"
                />
              ) : (
                <h2 className="text-xl font-bold text-black dark:text-white">{profileData.username || 'Unnamed User'}</h2>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">@{profileData.username || truncateWallet(displayWalletAddress)}</p>
              {isEditing ? (
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="Bio"
                  rows={3}
                  className="text-sm text-black dark:text-white bg-transparent border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:border-primary w-full mt-2 p-1"
                />
              ) : (
                <p className="text-sm mt-2 text-black dark:text-white">{profileData.bio || 'No bio yet.'}</p>
              )}
            </div>

            {/* Join Date & Stats (Optional) */} 
            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
               {/* Check if joinDate exists before formatting */} 
               {profileData.joinDate && (
                 <div className="flex items-center space-x-1">
                   <FaCalendarAlt />
                   <span>Joined {format(new Date(profileData.joinDate), 'MMMM yyyy')}</span>
                 </div>
               )}
               {/* TODO: Add Following/Followers count */} 
               {/* <div className="flex items-center space-x-1"><span className="font-bold text-black dark:text-white">123</span> Following</div> */}
               {/* <div className="flex items-center space-x-1"><span className="font-bold text-black dark:text-white">456</span> Followers</div> */}
             </div>
           </div>

          {/* Profile Tabs (Posts, Replies, Likes, etc.) */} 
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {['posts', 'replies', 'media', 'likes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-center font-medium capitalize transition-colors ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */} 
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {/* Only rendering Posts for now */}
            {activeTab === 'posts' && (
              profilePosts.length > 0 ? (
                profilePosts.map(post => (
                  <PostCard key={post.id} post={post} comments={post.comments || []} />
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">No posts yet.</div>
              )
            )}
            {/* Add other tab content here (Replies, Media, Likes) */} 
            {activeTab !== 'posts' && (
               <div className="p-6 text-center text-gray-500">{`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`} content not available yet.</div>
             )}
           </div>
         </>
       )}

      {/* Image Cropping/Zooming Modal */} 
      {showPfpModal && tempImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-w-sm w-full relative">
            <button onClick={() => setShowPfpModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-black dark:hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            <h3 className="text-lg font-bold mb-4 text-black dark:text-white">Edit {editingBanner ? 'Banner' : 'Profile Picture'}</h3>
            <div className="relative w-full h-64 overflow-hidden mb-4 bg-gray-200 dark:bg-gray-700 rounded">
              <Image 
                src={tempImageUrl} 
                alt="Preview" 
                layout="fill" 
                objectFit="contain" // Use contain initially, adjust with zoom?
                style={{ transform: `scale(${imageZoom})` }}
              />
            </div>
            {/* Simple Zoom Slider */}
            <div className="flex items-center space-x-2 mb-4">
              <label htmlFor="zoom" className="text-sm text-gray-600 dark:text-gray-300">Zoom:</label>
              <input 
                type="range" 
                id="zoom" 
                min="1" 
                max="3" 
                step="0.1" 
                value={imageZoom}
                onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <button 
              onClick={handleConfirmProfilePicture}
              className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary-hover transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProfilePage; 