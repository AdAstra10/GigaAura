import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store'; // Assuming RootState is exported from your store file

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

// --- Async Thunk for Saving Profile --- 
export const saveUserProfile = createAsyncThunk(
  'user/saveProfile',
  async (profileData: Partial<User>, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState; // Get current state to access walletAddress
    const { walletAddress } = state.user;

    if (!walletAddress) {
      return rejectWithValue('User not authenticated');
    }

    // Include walletAddress in the data sent to the API
    const dataToSend = {
      walletAddress: walletAddress,
      ...profileData,
    };

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add any necessary auth headers here
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save profile:', errorData);
        return rejectWithValue(errorData.error || 'Failed to save profile');
      }

      const result = await response.json();
      console.log('Profile saved successfully:', result);

      // Dispatch the synchronous action to update the state locally *after* successful API call
      dispatch(userSlice.actions.updateProfile(profileData)); 

      // --- Optional: Update localStorage here after successful save --- 
      // It might be slightly safer to update localStorage *after* the DB is confirmed updated
      if (typeof window !== 'undefined') {
         try {
           const existingUserJson = localStorage.getItem(`giga-aura-user-${walletAddress}`);
           const existingUser = existingUserJson ? JSON.parse(existingUserJson) : {};
           const updatedUserLocal = { ...existingUser, ...profileData };
           localStorage.setItem(`giga-aura-user-${walletAddress}`, JSON.stringify(updatedUserLocal));
         } catch(e) {
            console.warn("Failed to update localStorage post-save:", e);
         }
      }
      // --- End Optional localStorage update ---

      return result; // Return the API result if needed
    } catch (error) {
      console.error('Network or other error saving profile:', error);
      return rejectWithValue('Network error saving profile');
    }
  }
);
// --- End Async Thunk --- 

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
      
      // Local username uniqueness check (can remain as a pre-check)
      if (username && username !== state.username) {
        if (!isUsernameUnique(username, state.walletAddress)) {
          console.warn('Username might already be taken (local check)');
          // Don't block the state update here; server will be the source of truth
        }
      }
      
      // Update the state
      if (username !== undefined) state.username = username;
      if (avatar !== undefined) state.avatar = avatar;
      if (bio !== undefined) state.bio = bio;
      if (bannerImage !== undefined) state.bannerImage = bannerImage;
      
      // Removed direct localStorage saving from here; moved to the thunk
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
  // Optional: Handle thunk lifecycle actions (pending, rejected) for loading/error states
  extraReducers: (builder) => {
    builder
      .addCase(saveUserProfile.pending, (state) => {
        // Optionally set a loading state, e.g., state.loadingProfile = true;
        console.log('Saving profile...');
      })
      .addCase(saveUserProfile.fulfilled, (state, action) => {
        // Optionally clear loading state, e.g., state.loadingProfile = false;
        console.log('Profile saved successfully (thunk fulfilled).');
        // State is updated via the dispatch within the thunk
      })
      .addCase(saveUserProfile.rejected, (state, action) => {
        // Optionally clear loading state and set error, e.g.:
        // state.loadingProfile = false;
        // state.profileError = action.payload as string;
        console.error('Profile save failed:', action.payload);
      });
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