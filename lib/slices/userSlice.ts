import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  walletAddress: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  bannerImage: string | null;
  following: string[]; // Array of wallet addresses the user is following
  followers: string[]; // Array of wallet addresses following the user
  isAuthenticated: boolean;
  darkMode: boolean;
}

const initialState: User = {
  walletAddress: null,
  username: null,
  avatar: null,
  bio: null,
  bannerImage: null,
  following: [],
  followers: [],
  isAuthenticated: false,
  darkMode: false,
};

// Helper to check if username is unique
const isUsernameUnique = (username: string, currentWallet: string | null): boolean => {
  if (typeof window === 'undefined') return true;
  
  // Get all registered usernames from localStorage
  const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
  
  // Find if username already exists for another wallet
  for (const [wallet, name] of Object.entries(usernames)) {
    if (name === username && wallet !== currentWallet) {
      return false;
    }
  }
  
  return true;
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<User>>) => {
      return { ...state, ...action.payload };
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setWalletAddress: (state, action: PayloadAction<string>) => {
      state.walletAddress = action.payload;
      state.isAuthenticated = true;
      
      // For demo, set a default username if none exists
      if (!state.username) {
        state.username = `User_${action.payload.substring(0, 4)}`;
      }
      
      // For demo, set a default avatar
      if (!state.avatar) {
        // Random avatar based on wallet address
        const avatarId = parseInt(action.payload.substring(0, 4), 16) % 100;
        state.avatar = `https://i.pravatar.cc/300?img=${avatarId}`;
      }
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      const { username, avatar, bio, bannerImage } = action.payload;
      
      // Check if username is being updated and is not unique
      if (username && username !== state.username) {
        if (!isUsernameUnique(username, state.walletAddress)) {
          console.error('This username is already taken');
          return state;
        }
      }
      
      // Always update the state with the new data
      if (username) state.username = username;
      if (avatar) state.avatar = avatar;
      if (bio) state.bio = bio;
      if (bannerImage) state.bannerImage = bannerImage;
      
      // Save user data to localStorage (for username persistence)
      if (typeof window !== 'undefined' && state.walletAddress) {
        try {
          // Save username
          if (username) {
            const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
            usernames[state.walletAddress] = username;
            localStorage.setItem('usernames', JSON.stringify(usernames));
          }
          
          // Save avatar
          if (avatar) {
            const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
            profilePictures[state.walletAddress] = avatar;
            localStorage.setItem('profilePictures', JSON.stringify(profilePictures));
          }
          
          // Save bio
          if (bio) {
            const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
            bios[state.walletAddress] = bio;
            localStorage.setItem('userBios', JSON.stringify(bios));
          }
          
          // Save banner image
          if (bannerImage) {
            const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
            bannerImages[state.walletAddress] = bannerImage;
            localStorage.setItem('bannerImages', JSON.stringify(bannerImages));
          }
        } catch (error) {
          console.error('Error saving profile data to localStorage:', error);
        }
      }
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    logout: (state) => {
      state.walletAddress = null;
      state.isAuthenticated = false;
      // Keep darkMode preference but clear user data on logout
      const { darkMode } = state;
      return { ...initialState, darkMode };
    },
    followUser: (state, action: PayloadAction<string>) => {
      const walletToFollow = action.payload;
      
      // Don't follow if already following or trying to follow self
      if (state.following.includes(walletToFollow) || walletToFollow === state.walletAddress) {
        return;
      }
      
      state.following.push(walletToFollow);
    },
    unfollowUser: (state, action: PayloadAction<string>) => {
      const walletToUnfollow = action.payload;
      state.following = state.following.filter(w => w !== walletToUnfollow);
    },
    addFollower: (state, action: PayloadAction<string>) => {
      const followerWallet = action.payload;
      
      // Don't add if already a follower or trying to follow self
      if (state.followers.includes(followerWallet) || followerWallet === state.walletAddress) {
        return;
      }
      
      state.followers.push(followerWallet);
    },
    removeFollower: (state, action: PayloadAction<string>) => {
      const followerWallet = action.payload;
      state.followers = state.followers.filter(w => w !== followerWallet);
    }
  },
});

export const { 
  setUser, 
  setAuthenticated, 
  setWalletAddress, 
  updateProfile, 
  toggleDarkMode,
  setDarkMode,
  logout,
  followUser,
  unfollowUser,
  addFollower,
  removeFollower
} = userSlice.actions;

export default userSlice.reducer; 