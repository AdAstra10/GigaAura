import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { cacheWalletAuraPoints, getWalletAuraPoints } from '../../services/cache';
import db from '../../services/db';

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

// Helper to save auraPoints to cloud and localStorage as backup
const saveAuraPointsToStorage = (walletAddress: string | null, state: AuraPointsState) => {
  if (!walletAddress || typeof window === 'undefined') return;
  
  try {
    console.log(`Saving aura points for ${walletAddress}:`, state);
    
    // 1. FIRST, SAVE TO CLOUD DATABASE (primary source)
    db.saveAuraPoints(walletAddress, state)
      .then(success => {
        console.log(`Aura points ${success ? 'saved to' : 'failed to save to'} cloud database`);
      })
      .catch(error => {
        console.error('Error saving aura points to cloud:', error);
      });
    
    // 2. SAVE TO LOCAL STORAGE AS BACKUP
    cacheWalletAuraPoints(walletAddress, state);
    
    // 3. SAVE DIRECT BACKUP WITH TIMESTAMP
    localStorage.setItem(`aura_debug_${walletAddress}`, JSON.stringify({
      totalPoints: state.totalPoints,
      transactionCount: state.transactions.length,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`Aura points saved for ${walletAddress}:`, state.totalPoints);
  } catch (e) {
    console.error('Failed to save aura points:', e);
  }
};

// Load initial state with cloud-first approach
const loadInitialState = (): AuraPointsState => {
  if (typeof window === 'undefined') return initialState;
  
  // Try to load points from localStorage based on wallet
  const walletAddress = localStorage.getItem('walletAddress');
  if (!walletAddress) return initialState;
  
  // We'll use the stored localStorage value initially, but we'll also
  // dispatch an async action to load from the cloud later in the component
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
        // CLOUD FIRST: Save to cloud database and localStorage
        if (walletAddress) {
          // 1. SAVE TO CLOUD DIRECTLY
          db.addTransaction(walletAddress, action.payload)
            .then(success => {
              console.log(`Transaction ${success ? 'saved to' : 'failed to save to'} cloud database`);
            })
            .catch(error => {
              console.error('Error saving transaction to cloud:', error);
            });
          
          // 2. SAVE CURRENT STATE TO CLOUD AND LOCAL
          saveAuraPointsToStorage(walletAddress, state);
          
          // 3. DIRECT BACKUP (just in case)
          const directBackupKey = `aura_direct_${walletAddress.toLowerCase()}`;
          localStorage.setItem(directBackupKey, JSON.stringify({
            totalPoints: state.totalPoints,
            transactions: state.transactions
          }));
          
          // 4. SAVE SIMPLE TOTAL FOR QUICK ACCESS
          localStorage.setItem(`aura_total_${walletAddress.toLowerCase()}`, state.totalPoints.toString());
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
      
      // Save to cloud and localStorage
      const walletAddress = localStorage.getItem('walletAddress');
      saveAuraPointsToStorage(walletAddress, state);
    },
    resetPoints: (state) => {
      state.totalPoints = initialState.totalPoints;
      state.transactions = [];
      
      // Save to cloud and localStorage
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
      
      // Save to cloud and localStorage
      const walletAddress = localStorage.getItem('walletAddress');
      saveAuraPointsToStorage(walletAddress, state);
    },
    loadFromCloud: (state, action: PayloadAction<AuraPointsState>) => {
      // Update state with cloud data
      state.totalPoints = action.payload.totalPoints;
      state.transactions = action.payload.transactions;
      
      console.log('Updated state with data from cloud database');
    }
  },
});

export const { 
  addTransaction, 
  setTotalPoints, 
  resetPoints, 
  loadWalletPoints,
  loadFromCloud 
} = auraPointsSlice.actions;

export default auraPointsSlice.reducer; 