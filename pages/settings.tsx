import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../lib/store';
import { useWallet } from '../contexts/WalletContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { updateProfile } from '../lib/slices/userSlice';
import Head from 'next/head';
import Layout from '../components/Layout';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { 
  UserCircleIcon, PaintBrushIcon, ShieldCheckIcon, BellAlertIcon, WalletIcon, 
  ArrowLeftOnRectangleIcon, ArrowPathIcon, CheckCircleIcon, CameraIcon
} from '@heroicons/react/24/outline';

// Settings sections
enum SettingSection {
  ACCOUNT = 'account',
  DISPLAY = 'display',
  PRIVACY = 'privacy',
  NOTIFICATIONS = 'notifications',
  WALLET = 'wallet'
}

// Component for individual settings items
interface SettingItemProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ title, description, children }) => (
  <div className="py-4 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
    <div className="flex justify-between items-center">
      <div>
        <h4 className="font-semibold text-black dark:text-white">{title}</h4>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">
        {children}
      </div>
    </div>
  </div>
);

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  labelId: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, labelId }) => (
  <button
    type="button"
    aria-pressed={enabled}
    aria-labelledby={labelId}
    onClick={() => onChange(!enabled)}
    className={`${enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'} relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
  >
    <span className="sr-only">Use setting</span>
    <span
      aria-hidden="true"
      className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
    />
  </button>
);

const SettingsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { walletAddress, disconnectWallet, connectWallet, connected } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  
  const [activeSection, setActiveSection] = useState<SettingSection>(SettingSection.ACCOUNT);
  const [isSaving, setIsSaving] = useState(false);

  // Profile settings state
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Notification settings state (fetch initial state if stored)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [likesNotify, setLikesNotify] = useState(true);
  const [commentsNotify, setCommentsNotify] = useState(true);
  const [followersNotify, setFollowersNotify] = useState(true);
  const [sharesNotify, setSharesNotify] = useState(true);
  
  // Privacy settings state (fetch initial state if stored)
  const [publicProfile, setPublicProfile] = useState(true);
  const [showAuraPoints, setShowAuraPoints] = useState(true);
  const [allowTagging, setAllowTagging] = useState(true);
  
  // Display settings state
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactView, setCompactView] = useState(false);

  // Initialize form fields when component mounts or user changes
  useEffect(() => {
    setUsernameInput(user.username || '');
    setBioInput(user.bio || '');
    setAvatarPreview(user.avatar || null);
    // TODO: Load other settings (notifications, privacy, display) from user state or localStorage
  }, [user]);

  // Handle disconnect wallet
  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      toast.success('Wallet disconnected.');
      // Optionally redirect to home or login page
      // router.push('/home');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet.');
    }
  };
  
  // Handle section change
  const handleSectionChange = (section: SettingSection) => {
    setActiveSection(section);
  };
  
  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
         toast.error("Image size should not exceed 5MB.");
         return;
       }
       if (!file.type.startsWith('image/')) {
         toast.error("Please select an image file.");
         return;
       }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    setIsSaving(true);
    let avatarUrlToSave = user.avatar; // Keep existing avatar by default

    // If a new avatar file exists, upload it (mock upload)
    if (avatarFile) {
      try {
        // TODO: Replace with actual API call to upload image
        // const uploadedUrl = await uploadImageToService(avatarFile);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate upload
        avatarUrlToSave = avatarPreview; // Use preview URL for mock
        console.log("Simulated avatar upload complete.");
      } catch (error) {
        console.error("Avatar upload failed:", error);
        toast.error("Failed to upload avatar. Profile saved without new avatar.");
        avatarUrlToSave = user.avatar; // Fallback to old avatar on upload error
      }
    }

    const profileData = {
      username: usernameInput || undefined,
      bio: bioInput || undefined,
      avatar: avatarUrlToSave, // Use potentially updated URL
    };
    
    try {
      // TODO: API call to save profile data to backend
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API save
      
      dispatch(updateProfile(profileData));
      
      // Update localStorage as well (consider centralizing this logic)
      if (walletAddress) {
          const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
          const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
          const avatars = JSON.parse(localStorage.getItem('profilePictures') || '{}');
          
          if (profileData.username) usernames[walletAddress] = profileData.username;
          if (profileData.bio) bios[walletAddress] = profileData.bio;
          if (profileData.avatar) avatars[walletAddress] = profileData.avatar;

          localStorage.setItem('usernames', JSON.stringify(usernames));
          localStorage.setItem('userBios', JSON.stringify(bios));
          localStorage.setItem('profilePictures', JSON.stringify(avatars));
      }
      toast.success('Account settings saved!');
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error("Failed to save account settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving other settings sections (mock implementations)
  const handleSaveSettings = async (section: SettingSection) => {
     setIsSaving(true);
     console.log(`Saving ${section} settings...`);
     // TODO: Implement API calls to save these settings
     await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
     setIsSaving(false);
     toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved.`);
     // Persist to localStorage or Redux state if needed
   };

  // Render connect wallet prompt if not connected
  if (!connected) {
    return (
      <Layout>
        <Head>
          <title>Settings | GigaAura</title>
        </Head>
        <div className="flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-100px)]">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Connect Wallet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your wallet to access your settings.
          </p>
          <button
             onClick={async () => { try { await connectWallet(); } catch (e) { toast.error('Failed to connect.') }}}
             className="px-6 py-3 bg-primary text-white font-medium rounded-full shadow-md hover:bg-primary/90 transition-colors"
           >
             Connect Wallet
           </button>
        </div>
      </Layout>
    );
  }
  
  const navigationItems = [
    { name: 'Account', section: SettingSection.ACCOUNT, icon: UserCircleIcon },
    { name: 'Display', section: SettingSection.DISPLAY, icon: PaintBrushIcon },
    { name: 'Privacy', section: SettingSection.PRIVACY, icon: ShieldCheckIcon },
    { name: 'Notifications', section: SettingSection.NOTIFICATIONS, icon: BellAlertIcon },
    { name: 'Wallet', section: SettingSection.WALLET, icon: WalletIcon },
  ];

  return (
    <Layout>
      <Head>
        <title>Settings | GigaAura</title>
        <meta name="description" content="Manage your GigaAura account settings" />
      </Head>

      {/* Sticky Header */} 
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
         <h1 className="text-xl font-bold text-black dark:text-white">Settings</h1>
       </div>

      {/* Main Settings Layout (Sidebar + Content) */} 
      <div className="flex flex-col md:flex-row">
         {/* Settings Navigation Sidebar */} 
         <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex-shrink-0 p-4 md:pt-6">
           <ul className="space-y-1">
             {navigationItems.map((item) => (
               <li key={item.section}>
                 <button
                   className={`w-full flex items-center space-x-3 text-left px-3 py-2 rounded-md transition-colors ${activeSection === item.section ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
                   onClick={() => handleSectionChange(item.section)}
                 >
                   <item.icon className="h-5 w-5 flex-shrink-0" />
                   <span>{item.name}</span>
                 </button>
               </li>
             ))}
           </ul>
         </nav>

        {/* Settings Content Area */} 
        <div className="flex-1 p-6 min-w-0">
          {isSaving && (
             <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md flex items-center text-sm text-blue-700 dark:text-blue-300">
               <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" /> Saving changes...
             </div>
           )}
           
          {/* Account Section */} 
          {activeSection === SettingSection.ACCOUNT && (
             <section aria-labelledby="account-heading">
               <h2 id="account-heading" className="text-lg font-bold mb-4 text-black dark:text-white">Account Information</h2>
               <div className="space-y-4">
                  {/* Avatar Upload */}
                  <div className="flex items-center space-x-4">
                    <Image 
                       src={avatarPreview || '/default-avatar.png'} 
                       alt="Avatar Preview" 
                       width={80} 
                       height={80} 
                       className="rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                     />
                    <label className="cursor-pointer bg-gray-100 dark:bg-gray-800 text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <CameraIcon className="h-4 w-4 inline mr-1"/> Change Picture
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  {/* Username Input */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                       type="text"
                       id="username"
                       value={usernameInput}
                       onChange={(e) => setUsernameInput(e.target.value)}
                       placeholder="Your display name"
                       className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-primary"
                     />
                  </div>
                  {/* Bio Input */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                    <textarea
                       id="bio"
                       value={bioInput}
                       onChange={(e) => setBioInput(e.target.value)}
                       placeholder="Tell something about yourself"
                       rows={3}
                       className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-primary"
                     />
                  </div>
                  <button 
                     onClick={handleProfileUpdate}
                     disabled={isSaving}
                     className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
                   >
                     Save Changes
                   </button>
               </div>
             </section>
           )}
           
          {/* Display Section */} 
          {activeSection === SettingSection.DISPLAY && (
            <section aria-labelledby="display-heading">
              <h2 id="display-heading" className="text-lg font-bold mb-4 text-black dark:text-white">Display Settings</h2>
              <SettingItem title="Dark Mode">
                 <ToggleSwitch enabled={isDarkMode} onChange={toggleDarkMode} labelId="dark-mode-label" />
               </SettingItem>
              <SettingItem title="Reduced Motion" description="Limit animations and motion effects.">
                 <ToggleSwitch enabled={reducedMotion} onChange={setReducedMotion} labelId="reduced-motion-label" />
               </SettingItem>
               <SettingItem title="Compact View" description="Show more content in a smaller space.">
                 <ToggleSwitch enabled={compactView} onChange={setCompactView} labelId="compact-view-label" />
               </SettingItem>
               {/* Save button for this section if needed */}
                <button 
                   onClick={() => handleSaveSettings(SettingSection.DISPLAY)}
                   disabled={isSaving}
                   className="mt-4 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
                 >
                   Save Display Settings
                 </button>
            </section>
          )}

          {/* Privacy Section */} 
          {activeSection === SettingSection.PRIVACY && (
             <section aria-labelledby="privacy-heading">
               <h2 id="privacy-heading" className="text-lg font-bold mb-4 text-black dark:text-white">Privacy Settings</h2>
               <SettingItem title="Public Profile" description="Allow anyone to view your profile.">
                 <ToggleSwitch enabled={publicProfile} onChange={setPublicProfile} labelId="public-profile-label" />
               </SettingItem>
               <SettingItem title="Show Aura Points" description="Display your Aura Points total on your profile.">
                 <ToggleSwitch enabled={showAuraPoints} onChange={setShowAuraPoints} labelId="show-aura-label" />
               </SettingItem>
               <SettingItem title="Allow Tagging" description="Let others tag you in posts.">
                 <ToggleSwitch enabled={allowTagging} onChange={setAllowTagging} labelId="allow-tagging-label" />
               </SettingItem>
               {/* Add more privacy options: Muted words, Blocked accounts */} 
               {/* Save button for this section */}
                <button 
                   onClick={() => handleSaveSettings(SettingSection.PRIVACY)}
                   disabled={isSaving}
                   className="mt-4 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
                 >
                   Save Privacy Settings
                 </button>
             </section>
           )}

          {/* Notifications Section */} 
          {activeSection === SettingSection.NOTIFICATIONS && (
             <section aria-labelledby="notifications-heading">
               <h2 id="notifications-heading" className="text-lg font-bold mb-4 text-black dark:text-white">Notification Settings</h2>
               <SettingItem title="Email Notifications">
                 <ToggleSwitch enabled={emailNotifications} onChange={setEmailNotifications} labelId="email-notify-label" />
               </SettingItem>
               <SettingItem title="Push Notifications">
                 <ToggleSwitch enabled={pushNotifications} onChange={setPushNotifications} labelId="push-notify-label" />
               </SettingItem>
               <h3 className="text-md font-semibold mt-6 mb-2 text-black dark:text-white">Notify me about:</h3>
               <SettingItem title="Likes on my posts">
                 <ToggleSwitch enabled={likesNotify} onChange={setLikesNotify} labelId="likes-notify-label" />
               </SettingItem>
               <SettingItem title="Comments on my posts">
                 <ToggleSwitch enabled={commentsNotify} onChange={setCommentsNotify} labelId="comments-notify-label" />
               </SettingItem>
               <SettingItem title="New followers">
                 <ToggleSwitch enabled={followersNotify} onChange={setFollowersNotify} labelId="followers-notify-label" />
               </SettingItem>
               <SettingItem title="Shares of my posts">
                 <ToggleSwitch enabled={sharesNotify} onChange={setSharesNotify} labelId="shares-notify-label" />
               </SettingItem>
               {/* Save button for this section */}
                <button 
                   onClick={() => handleSaveSettings(SettingSection.NOTIFICATIONS)}
                   disabled={isSaving}
                   className="mt-4 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
                 >
                   Save Notification Settings
                 </button>
             </section>
           )}

          {/* Wallet Section */} 
          {activeSection === SettingSection.WALLET && (
             <section aria-labelledby="wallet-heading">
               <h2 id="wallet-heading" className="text-lg font-bold mb-4 text-black dark:text-white">Wallet</h2>
               <SettingItem title="Connected Wallet">
                 <div className="text-right">
                   <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{walletAddress}</p>
                   <button 
                     onClick={handleDisconnectWallet}
                     className="mt-2 text-sm text-red-600 hover:text-red-800 dark:hover:text-red-400 flex items-center justify-end space-x-1"
                   >
                     <ArrowLeftOnRectangleIcon className="h-4 w-4"/>
                     <span>Disconnect</span>
                   </button>
                 </div>
               </SettingItem>
               {/* Add Export Data, Delete Account options here */} 
             </section>
           )}
        </div>
       </div>
    </Layout>
  );
};

export default SettingsPage; 