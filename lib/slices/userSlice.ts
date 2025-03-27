import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  walletAddress: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  isAuthenticated: boolean;
  followers: number;
  following: number;
}

const initialState: UserState = {
  walletAddress: null,
  username: null,
  avatar: null,
  bio: null,
  isAuthenticated: false,
  followers: 0,
  following: 0,
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
    logout: (state) => {
      return initialState;
    },
  },
});

export const { 
  setUser, 
  setAuthenticated, 
  setWalletAddress, 
  updateProfile, 
  logout 
} = userSlice.actions;

export default userSlice.reducer; 