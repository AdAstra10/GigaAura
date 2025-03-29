import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Interface for a single transaction
export interface AuraTransaction {
  id: string;
  amount: number;
  action: 'post_created' | 'like_received' | 'comment_made' | 'comment_received' | 'follower_gained' | 'post_shared';
  timestamp: string;
  counterpartyName?: string;
  counterpartyWallet?: string;
}

// Interface for the state
export interface AuraPointsState {
  totalPoints: number;
  transactions: AuraTransaction[];
}

// Initial state
const initialState: AuraPointsState = {
  totalPoints: 0,
  transactions: [],
};

const loadInitialState = (): AuraPointsState => {
  if (typeof window === 'undefined') return initialState;
  
  // Try to load points from localStorage based on wallet
  const walletAddress = localStorage.getItem('walletAddress');
  if (!walletAddress) return initialState;
  
  // Load points from localStorage
  try {
    const auraPoints = JSON.parse(localStorage.getItem(`auraPoints_${walletAddress}`) || 'null');
    if (auraPoints) return auraPoints;
  } catch (e) {
    console.error('Failed to load aura points:', e);
  }
  
  return initialState;
};

// Create the slice
const auraPointsSlice = createSlice({
  name: 'auraPoints',
  initialState: loadInitialState(),
  reducers: {
    addTransaction: (state, action: PayloadAction<AuraTransaction>) => {
      state.transactions.push(action.payload);
      state.totalPoints += action.payload.amount;
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const walletAddress = localStorage.getItem('walletAddress');
        if (walletAddress) {
          localStorage.setItem(`auraPoints_${walletAddress}`, JSON.stringify(state));
        }
      }
    },
    setTotalPoints: (state, action: PayloadAction<number>) => {
      state.totalPoints = action.payload;
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const walletAddress = localStorage.getItem('walletAddress');
        if (walletAddress) {
          localStorage.setItem(`auraPoints_${walletAddress}`, JSON.stringify(state));
        }
      }
    },
    resetPoints: (state) => {
      state.totalPoints = 0;
      state.transactions = [];
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const walletAddress = localStorage.getItem('walletAddress');
        if (walletAddress) {
          localStorage.setItem(`auraPoints_${walletAddress}`, JSON.stringify(state));
        }
      }
    },
    loadWalletPoints: (state, action: PayloadAction<string>) => {
      const walletAddress = action.payload;
      if (typeof window !== 'undefined' && walletAddress) {
        try {
          const savedPoints = localStorage.getItem(`auraPoints_${walletAddress}`);
          if (savedPoints) {
            const parsed = JSON.parse(savedPoints);
            state.totalPoints = parsed.totalPoints;
            state.transactions = parsed.transactions;
          }
        } catch (e) {
          console.error('Failed to load wallet points:', e);
        }
      }
    }
  },
});

export const { addTransaction, setTotalPoints, resetPoints, loadWalletPoints } = auraPointsSlice.actions;

export default auraPointsSlice.reducer; 