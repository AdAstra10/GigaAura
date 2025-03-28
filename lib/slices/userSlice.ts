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
    },
    updateProfile: (state, action: PayloadAction<{ username?: string; avatar?: string; bio?: string }>) => {
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