import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuraTransaction {
  id: string;
  walletAddress: string;
  action: 'post_created' | 'like_received' | 'comment_made' | 'comment_received' | 'follower_gained' | 'post_shared' | 'follow_given';
  points: number;
  timestamp: string;
  metadata?: {
    postId?: string;
    commentId?: string;
    followerWallet?: string;
  };
}

export interface AuraPointsState {
  totalPoints: number;
  transactions: AuraTransaction[];
  loading: boolean;
  error: string | null;
}

const initialState: AuraPointsState = {
  totalPoints: 0,
  transactions: [],
  loading: false,
  error: null,
};

export const auraPointsSlice = createSlice({
  name: 'auraPoints',
  initialState,
  reducers: {
    setTotalPoints: (state, action: PayloadAction<number>) => {
      state.totalPoints = action.payload;
    },
    addPoints: (state, action: PayloadAction<number>) => {
      state.totalPoints += action.payload;
    },
    setTransactions: (state, action: PayloadAction<AuraTransaction[]>) => {
      state.transactions = action.payload;
    },
    addTransaction: (state, action: PayloadAction<AuraTransaction>) => {
      state.transactions = [action.payload, ...state.transactions];
      state.totalPoints += action.payload.points;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setTotalPoints,
  addPoints,
  setTransactions,
  addTransaction,
  setLoading,
  setError,
} = auraPointsSlice.actions;

export default auraPointsSlice.reducer; 