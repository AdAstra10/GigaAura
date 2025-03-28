import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@lib/store';
import { useWallet } from '@contexts/WalletContext';
import Head from 'next/head';
import Header from '@components/Header';
import Sidebar from '@components/Sidebar';

// Settings sections
enum SettingSection {
  ACCOUNT = 'account',
  DISPLAY = 'display',
  PRIVACY = 'privacy',
  NOTIFICATIONS = 'notifications',
  WALLET = 'wallet'
}

const SettingsPage = () => {
  const dispatch = useDispatch();
  const { walletAddress, disconnect } = useWallet();
  const [activeSection, setActiveSection] = useState<SettingSection>(SettingSection.ACCOUNT);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [likesNotify, setLikesNotify] = useState(true);
  const [commentsNotify, setCommentsNotify] = useState(true);
  const [followersNotify, setFollowersNotify] = useState(true);
  const [sharesNotify, setSharesNotify] = useState(true);
  
  // Privacy settings
  const [publicProfile, setPublicProfile] = useState(true);
  const [showAuraPoints, setShowAuraPoints] = useState(true);
  const [allowTagging, setAllowTagging] = useState(true);
  
  // Display settings
  const [darkMode, setDarkMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactView, setCompactView] = useState(false);
  
  // Handle disconnect wallet
  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };
  
  // Handle section change
  const handleSectionChange = (section: SettingSection) => {
    setActiveSection(section);
  };
  
  if (!walletAddress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please connect your wallet to access settings.</p>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Settings | GigaAura</title>
        <meta name="description" content="Manage your GigaAura account settings" />
      </Head>
      
      <div className="min-h-screen bg-light">
        <Header />
        
        <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3">
            <Sidebar />
          </div>
          
          <div className="col-span-1 md:col-span-9">
            <div className="bg-white rounded-lg shadow-md">
              <div className="md:flex">
                {/* Settings Navigation */}
                <div className="md:w-64 border-r">
                  <nav className="p-4">
                    <h2 className="text-xl font-bold mb-4">Settings</h2>
                    <ul className="space-y-1">
                      {Object.values(SettingSection).map((section) => (
                        <li key={section}>
                          <button
                            className={`w-full text-left px-4 py-2 rounded-md ${
                              activeSection === section
                                ? 'bg-[#F6B73C] text-white'
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => handleSectionChange(section as SettingSection)}
                          >
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
                
                {/* Settings Content */}
                <div className="flex-1 p-6">
                  {activeSection === SettingSection.ACCOUNT && (
                    <div>
                      <h2 className="text-xl font-bold mb-6">Account Settings</h2>
                      
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Wallet Information</h3>
                          <div className="bg-gray-50 p-4 rounded-md">
                            <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
                            <p className="font-mono">{walletAddress}</p>
                          </div>
                        </div>
                        
                        <div className="border-t pt-6">
                          <h3 className="text-lg font-medium mb-4">Account Actions</h3>
                          <div className="space-y-3">
                            <button
                              onClick={handleDisconnectWallet}
                              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                            >
                              Disconnect Wallet
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeSection === SettingSection.DISPLAY && (
                    <div>
                      <h2 className="text-xl font-bold mb-6">Display Settings</h2>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Dark Mode</h3>
                            <p className="text-sm text-gray-500">Switch to dark theme</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={darkMode}
                              onChange={() => setDarkMode(!darkMode)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-4">
                          <div>
                            <h3 className="font-medium">Reduced Motion</h3>
                            <p className="text-sm text-gray-500">Minimize animations</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={reducedMotion}
                              onChange={() => setReducedMotion(!reducedMotion)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-4">
                          <div>
                            <h3 className="font-medium">Compact View</h3>
                            <p className="text-sm text-gray-500">Show more content with less spacing</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={compactView}
                              onChange={() => setCompactView(!compactView)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeSection === SettingSection.PRIVACY && (
                    <div>
                      <h2 className="text-xl font-bold mb-6">Privacy Settings</h2>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Public Profile</h3>
                            <p className="text-sm text-gray-500">Allow anyone to view your profile</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={publicProfile}
                              onChange={() => setPublicProfile(!publicProfile)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-4">
                          <div>
                            <h3 className="font-medium">Show Aura Points</h3>
                            <p className="text-sm text-gray-500">Display your Aura Points on your profile</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={showAuraPoints}
                              onChange={() => setShowAuraPoints(!showAuraPoints)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-4">
                          <div>
                            <h3 className="font-medium">Allow Tagging</h3>
                            <p className="text-sm text-gray-500">Let others tag you in posts and comments</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={allowTagging}
                              onChange={() => setAllowTagging(!allowTagging)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeSection === SettingSection.NOTIFICATIONS && (
                    <div>
                      <h2 className="text-xl font-bold mb-6">Notification Settings</h2>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Email Notifications</h3>
                            <p className="text-sm text-gray-500">Receive updates via email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={emailNotifications}
                              onChange={() => setEmailNotifications(!emailNotifications)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-4">
                          <div>
                            <h3 className="font-medium">Push Notifications</h3>
                            <p className="text-sm text-gray-500">Receive alerts on your device</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={pushNotifications}
                              onChange={() => setPushNotifications(!pushNotifications)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                          </label>
                        </div>
                        
                        <h3 className="font-medium border-t pt-4">Notify me about:</h3>
                        
                        <div className="ml-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <p>Likes on my posts</p>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={likesNotify}
                                onChange={() => setLikesNotify(!likesNotify)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p>Comments on my posts</p>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={commentsNotify}
                                onChange={() => setCommentsNotify(!commentsNotify)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p>New followers</p>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={followersNotify}
                                onChange={() => setFollowersNotify(!followersNotify)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p>Shares of my posts</p>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={sharesNotify}
                                onChange={() => setSharesNotify(!sharesNotify)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#2C89B7] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2C89B7]"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeSection === SettingSection.WALLET && (
                    <div>
                      <h2 className="text-xl font-bold mb-6">Wallet Settings</h2>
                      
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Connected Wallet</h3>
                          <div className="bg-gray-50 p-4 rounded-md">
                            <p className="text-sm text-gray-500 mb-1">Wallet Address</p>
                            <p className="font-mono break-all">{walletAddress}</p>
                          </div>
                        </div>
                        
                        <div className="border-t pt-6">
                          <h3 className="text-lg font-medium mb-4">Wallet Actions</h3>
                          <div className="space-y-3">
                            <button
                              onClick={handleDisconnectWallet}
                              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                            >
                              Disconnect Wallet
                            </button>
                          </div>
                          <p className="mt-4 text-sm text-gray-500">
                            Disconnecting your wallet will sign you out of GigaAura. You can reconnect at any time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SettingsPage; 