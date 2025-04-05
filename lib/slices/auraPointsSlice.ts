import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { cacheWalletAuraPoints, getWalletAuraPoints } from '../../services/cache';
import db from '../../services/db';

// Interface for a single transaction
export interface AuraTransaction {
  id: string;
  amount: number;
  action: 'post_created' | 'like_received' | 'comment_made' | 'comment_received' | 
         'follower_gained' | 'post_shared' | 'follow_given' | 'follow_user' | 
         'share_post' | 'bookmark_post';
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

// Helper to save auraPoints to localStorage
const saveAuraPointsToStorage = (walletAddress: string | null, state: AuraPointsState) => {
  if (!walletAddress || typeof window === 'undefined') return;
  
  try {
    console.log(`Saving aura points for ${walletAddress}:`, state);
    
    // Save to localStorage as primary source
    cacheWalletAuraPoints(walletAddress, state);
    
    // Save direct backup with timestamp
    localStorage.setItem(`aura_debug_${walletAddress}`, JSON.stringify({
      totalPoints: state.totalPoints,
      transactionCount: state.transactions.length,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`Aura points saved for ${walletAddress}:`, state.totalPoints);
    
    // Use the database service as fallback (which now uses localStorage)
    db.saveAuraPoints(walletAddress, state)
      .then(success => {
        console.log(`Aura points ${success ? 'saved to' : 'failed to save to'} storage`);
      })
      .catch(error => {
        console.error('Error saving aura points to storage:', error);
      });
  } catch (e) {
    console.error('Failed to save aura points:', e);
  }
};

// Load initial state from localStorage
const loadInitialState = (): AuraPointsState => {
  if (typeof window === 'undefined') return initialState;
  
  // Try to load points from localStorage based on wallet
  const walletAddress = localStorage.getItem('walletAddress');
  if (!walletAddress) return initialState;
  
  try {
    // Use our improved cache retrieval function for now
    const auraPoints = getWalletAuraPoints(walletAddress);
    
    if (auraPoints && typeof auraPoints === 'object') {
      console.log(`Loaded aura points from localStorage for ${walletAddress}:`, auraPoints);
      return {
        totalPoints: auraPoints.totalPoints ?? initialState.totalPoints,
        transactions: Array.isArray(auraPoints.transactions) ? auraPoints.transactions : []
      };
    }
  } catch (e) {
    console.error('Failed to load initial aura points:', e);
  }
  
  return initialState;
};

// Create the slice
const auraPointsSlice = createSlice({
  name: 'auraPoints',
  initialState: loadInitialState(),
  reducers: {
    addTransaction: (state, action: PayloadAction<AuraTransaction>) => {
      // Push transaction and update total
      state.transactions.push(action.payload);
      state.totalPoints += action.payload.amount;
      
      // Get current wallet address
      const walletAddress = localStorage.getItem('walletAddress');
      console.log('ADDING TRANSACTION, current Aura points:', state.totalPoints);
      
      try {
        if (walletAddress) {
          // Save current state to localStorage
          saveAuraPointsToStorage(walletAddress, state);
          
          // Save direct backup (just in case)
          const directBackupKey = `aura_direct_${walletAddress.toLowerCase()}`;
          localStorage.setItem(directBackupKey, JSON.stringify({
            totalPoints: state.totalPoints,
            transactions: state.transactions
          }));
          
          // Save simple total for quick access
          localStorage.setItem(`aura_total_${walletAddress.toLowerCase()}`, state.totalPoints.toString());
          
          // Save to database (which now uses localStorage)
          db.addTransaction(walletAddress, action.payload)
            .then(success => {
              console.log(`Transaction ${success ? 'saved to' : 'failed to save to'} storage`);
            })
            .catch(error => {
              console.error('Error saving transaction to storage:', error);
            });
        }
      } catch (e) {
        console.error('Error in addTransaction:', e);
        
        // Emergency fallback: save directly if there was an error
        if (walletAddress) {
          try {
            localStorage.setItem(`emergency_aura_${walletAddress}`, state.totalPoints.toString());
            console.log('EMERGENCY SAVE: Saved aura points via emergency fallback');
          } catch (e2) {
            console.error('Emergency fallback also failed:', e2);
          }
        }
      }
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
      
      // Save to localStorage
      const walletAddress = localStorage.getItem('walletAddress');
      saveAuraPointsToStorage(walletAddress, state);
    },
    loadFromStorage: (state, action: PayloadAction<AuraPointsState>) => {
      // Update state with localStorage data
      state.totalPoints = action.payload.totalPoints;
      state.transactions = action.payload.transactions;
      
      console.log('Updated state with data from localStorage');
    }
  },
});

export const { 
  addTransaction, 
  setTotalPoints, 
  resetPoints, 
  loadWalletPoints,
  loadFromStorage 
} = auraPointsSlice.actions;

export default auraPointsSlice.reducer; 