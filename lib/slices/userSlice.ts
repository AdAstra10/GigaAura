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
const isUsernameUnique = (username: string): boolean => {
  if (typeof window === 'undefined') return true;
  
  // Get all registered usernames from localStorage
  const usernameRegistry = JSON.parse(localStorage.getItem('usernameRegistry') || '{}');
  
  // Check if username exists and is associated with a different wallet
  return !Object.values(usernameRegistry).includes(username);
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
      const { username, avatar, bio } = action.payload;
      
      // If username is being updated and is not unique, don't update it
      if (username && username !== state.username) {
        if (!isUsernameUnique(username)) {
          // In a real app, you would throw an error or handle this case
          console.error('This username is already taken');
          return state;
        }
        
        // Update username registry if valid
        if (typeof window !== 'undefined' && state.walletAddress) {
          const usernameRegistry = JSON.parse(localStorage.getItem('usernameRegistry') || '{}');
          usernameRegistry[state.walletAddress] = username;
          localStorage.setItem('usernameRegistry', JSON.stringify(usernameRegistry));
        }
      }
      
      return { ...state, ...action.payload };
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
      // Keep darkMode preference and username/avatar/bio even after logout
      const { darkMode, username, avatar, bio } = state;
      return { ...initialState, darkMode, username, avatar, bio };
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