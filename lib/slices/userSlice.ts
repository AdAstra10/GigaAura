import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  walletAddress: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  isAuthenticated: boolean;
  followers: number;
  following: number;
  darkMode: boolean;
}

const initialState: UserState = {
  walletAddress: null,
  username: null,
  avatar: null,
  bio: null,
  isAuthenticated: false,
  followers: 0,
  following: 0,
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

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<UserState>>) => {
      return { ...state, ...action.payload };
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setWalletAddress: (state, action: PayloadAction<string>) => {
      state.walletAddress = action.payload;
      state.isAuthenticated = !!action.payload;
      
      // Load username if it exists for this wallet
      if (typeof window !== 'undefined') {
        const usernameRegistry = JSON.parse(localStorage.getItem('usernameRegistry') || '{}');
        if (usernameRegistry[action.payload]) {
          state.username = usernameRegistry[action.payload];
        } else {
          state.username = 'Anon'; // Default to 'Anon' instead of null
        }
      }
    },
    updateProfile: (state, action: PayloadAction<{ username?: string; avatar?: string; bio?: string }>) => {
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
      // Keep darkMode preference even after logout
      const { darkMode } = state;
      return { ...initialState, darkMode };
    },
  },
});

export const { 
  setUser, 
  setAuthenticated, 
  setWalletAddress, 
  updateProfile, 
  toggleDarkMode,
  setDarkMode,
  logout 
} = userSlice.actions;

export default userSlice.reducer; 