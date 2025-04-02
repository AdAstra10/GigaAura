import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { cacheWalletAuraPoints, getWalletAuraPoints } from '../../services/cache';

// Interface for a single transaction
export interface AuraTransaction {
  id: string;
  amount: number;
  action: 'post_created' | 'like_received' | 'comment_made' | 'comment_received' | 'follower_gained' | 'post_shared' | 'follow_given';
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
  totalPoints: 100, // Default starting points
  transactions: [],
};

// Helper to save auraPoints to localStorage - Updated to use cache service
const saveAuraPointsToStorage = (walletAddress: string | null, state: AuraPointsState) => {
  if (!walletAddress || typeof window === 'undefined') return;
  
  try {
    // Use our improved caching function
    console.log(`Saving aura points for ${walletAddress}:`, state);
    cacheWalletAuraPoints(walletAddress, state);
    
    // For debugging - also save directly to localStorage with a different key
    localStorage.setItem(`aura_debug_${walletAddress}`, JSON.stringify({
      totalPoints: state.totalPoints,
      transactionCount: state.transactions.length,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`Saved aura points for ${walletAddress}:`, state.totalPoints);
  } catch (e) {
    console.error('Failed to save aura points:', e);
  }
};

const loadInitialState = (): AuraPointsState => {
  if (typeof window === 'undefined') return initialState;
  
  // Try to load points from localStorage based on wallet
  const walletAddress = localStorage.getItem('walletAddress');
  if (!walletAddress) return initialState;
  
  try {
    // Use our improved cache retrieval function
    const auraPoints = getWalletAuraPoints(walletAddress);
    
    if (auraPoints && typeof auraPoints === 'object') {
      console.log(`Loaded aura points for ${walletAddress}:`, auraPoints);
      // Make sure the object has the expected structure
      return {
        totalPoints: auraPoints.totalPoints ?? initialState.totalPoints,
        transactions: Array.isArray(auraPoints.transactions) ? auraPoints.transactions : []
      };
    }
    
    // Try legacy format as fallback
    const auraPointsStr = localStorage.getItem(`auraPoints_${walletAddress}`);
    if (auraPointsStr) {
      try {
        const legacyAuraPoints = JSON.parse(auraPointsStr);
        console.log(`Loaded legacy aura points for ${walletAddress}:`, legacyAuraPoints);
        if (legacyAuraPoints && typeof legacyAuraPoints === 'object') {
          // Save it in the new format for next time
          const result = {
            totalPoints: legacyAuraPoints.totalPoints ?? initialState.totalPoints,
            transactions: Array.isArray(legacyAuraPoints.transactions) ? legacyAuraPoints.transactions : []
          };
          cacheWalletAuraPoints(walletAddress, result);
          return result;
        }
      } catch (e) {
        console.error('Failed to parse legacy aura points:', e);
      }
    }
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
      const walletAddress = localStorage.getItem('walletAddress');
      console.log('Adding transaction, current Aura points:', state.totalPoints);
      saveAuraPointsToStorage(walletAddress, state);
      
      // Verify the data was saved correctly by reading it back immediately
      setTimeout(() => {
        try {
          const walletAddress = localStorage.getItem('walletAddress');
          if (walletAddress) {
            const key = `gigaaura_wallet_aura_points_${walletAddress.toLowerCase()}`;
            const savedData = localStorage.getItem(key);
            console.log('Verification - saved Aura points data:', savedData);
            
            if (savedData) {
              const parsedData = JSON.parse(savedData);
              console.log('Verification - parsed Aura points:', parsedData.totalPoints);
            }
          }
        } catch (e) {
          console.error('Error verifying saved aura points:', e);
        }
      }, 100);
    },
    setTotalPoints: (state, action: PayloadAction<number>) => {
      state.totalPoints = action.payload;
      
      // Save to localStorage
      const walletAddress = localStorage.getItem('walletAddress');
      saveAuraPointsToStorage(walletAddress, state);
    },
    resetPoints: (state) => {
      state.totalPoints = initialState.totalPoints;
      state.transactions = [];
      
      // Save to localStorage
      const walletAddress = localStorage.getItem('walletAddress');
      saveAuraPointsToStorage(walletAddress, state);
    },
    loadWalletPoints: (state, action: PayloadAction<number | AuraPointsState>) => {
      if (typeof action.payload === 'number') {
        // If passing a number directly, just set the total points
        state.totalPoints = action.payload;
      } else if (typeof action.payload === 'object') {
        // If passing a full state object, replace the entire state
        state.totalPoints = action.payload.totalPoints;
        state.transactions = action.payload.transactions;
      }
      
      // Save to localStorage if we have a wallet address
      const walletAddress = localStorage.getItem('walletAddress');
      saveAuraPointsToStorage(walletAddress, state);
    }
  },
});

export const { addTransaction, setTotalPoints, resetPoints, loadWalletPoints } = auraPointsSlice.actions;

export default auraPointsSlice.reducer; 