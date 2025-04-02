/**
 * Cloud Database Service for GigaAura
 * Uses Firebase Firestore for persistent cloud storage
 */

import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  query, 
  orderBy, 
  getDocs,
  where,
  Timestamp,
  serverTimestamp,
  Firestore,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Post } from '@lib/slices/postsSlice';
import { AuraPointsState, AuraTransaction } from '@lib/slices/auraPointsSlice';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDgvgA9uxsZCIGTGiPsH5ZcUw2AQ9MBHSw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gigaaura-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gigaaura-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gigaaura-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "637403180608",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:637403180608:web:a81343a6d7af4dbe6e7cf5"
};

// Track active listeners for proper cleanup
const activeListeners: Unsubscribe[] = [];

// Track if Firebase is already initialized
let isInitialized = false;

// Initialize Firebase with proper type annotations
let app: FirebaseApp | undefined;
let db: Firestore | undefined;

/**
 * Lazily initialize Firebase only when needed
 */
const initializeFirebase = () => {
  if (isInitialized) return { app, db };
  
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isInitialized = true;
    console.log('Firebase initialized successfully');
    
    // Add event listener to delete Firebase app on page unload
    if (typeof window !== 'undefined') {
      const unloadCallback = () => {
        cleanupFirebase(false); // Pass false to avoid redundant logging during page transitions
      };
      
      window.addEventListener('beforeunload', unloadCallback);
      
      // Also clean up on route changes within Next.js
      if (typeof window !== 'undefined') {
        // Check if Next.js Router is available
        import('next/router').then(({ default: Router }) => {
          Router.events.on('routeChangeStart', unloadCallback);
        }).catch(err => console.error('Could not set up Next.js router event', err));
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
  
  return { app, db };
};

/**
 * Helper function to track listener subscriptions
 */
export const addListener = (unsubscribe: Unsubscribe): void => {
  activeListeners.push(unsubscribe);
  console.log(`Added Firestore listener (total: ${activeListeners.length})`);
};

/**
 * Detach all active listeners
 */
export const cleanupAllListeners = (): void => {
  if (activeListeners.length > 0) {
    console.log(`Cleaning up ${activeListeners.length} Firestore listeners`);
    activeListeners.forEach(unsubscribe => unsubscribe());
    activeListeners.length = 0; // Clear the array
  }
};

/**
 * Delete Firebase app instance and clean up all listeners
 */
export const cleanupFirebase = async (verbose = true): Promise<void> => {
  try {
    // First detach all listeners
    cleanupAllListeners();
    
    // Then delete the app if it exists
    if (app) {
      await deleteApp(app);
      if (verbose) console.log('Firebase app deleted successfully');
      isInitialized = false;
      app = undefined;
      db = undefined;
    }
  } catch (error) {
    console.error('Error deleting Firebase app:', error);
  }
};

/**
 * Save a post to Firestore
 */
export const savePost = async (post: Post): Promise<boolean> => {
  const { db } = initializeFirebase();
  try {
    if (!db) return false;
    
    // Ensure post has all required fields
    if (!post.id || !post.authorWallet) {
      console.error('Invalid post data:', post);
      return false;
    }
    
    // Set a server timestamp for real-time ordering
    const postWithTimestamp = {
      ...post,
      serverTimestamp: serverTimestamp()
    };
    
    // Save to main posts collection
    await setDoc(doc(db, 'posts', post.id), postWithTimestamp);
    
    // Also add to user's posts collection
    await setDoc(doc(db, 'users', post.authorWallet, 'posts', post.id), postWithTimestamp);
    
    console.log('Post saved to Firestore:', post.id);
    return true;
  } catch (error) {
    console.error('Error saving post to Firestore:', error);
    return false;
  }
};

/**
 * Get all posts from Firestore
 */
export const getPosts = async (): Promise<Post[]> => {
  const { db } = initializeFirebase();
  try {
    if (!db) return [];
    
    // Query posts collection ordered by server timestamp (newest first)
    const postsQuery = query(collection(db, 'posts'), orderBy('serverTimestamp', 'desc'));
    const querySnapshot = await getDocs(postsQuery);
    
    const posts: Post[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const postData = docSnapshot.data() as Post;
      posts.push(postData);
    });
    
    console.log('Retrieved posts from Firestore:', posts.length);
    return posts;
  } catch (error) {
    console.error('Error getting posts from Firestore:', error);
    return [];
  }
};

/**
 * Get a user's posts from Firestore
 */
export const getUserPosts = async (walletAddress: string): Promise<Post[]> => {
  const { db } = initializeFirebase();
  try {
    if (!db || !walletAddress) return [];
    
    // Query user's posts subcollection
    const userPostsQuery = query(
      collection(db, 'users', walletAddress, 'posts'), 
      orderBy('serverTimestamp', 'desc')
    );
    const querySnapshot = await getDocs(userPostsQuery);
    
    const posts: Post[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const postData = docSnapshot.data() as Post;
      posts.push(postData);
    });
    
    console.log(`Retrieved ${posts.length} posts for user ${walletAddress}`);
    return posts;
  } catch (error) {
    console.error('Error getting user posts from Firestore:', error);
    return [];
  }
};

/**
 * Update a post in Firestore (for likes, comments, etc.)
 */
export const updatePost = async (post: Post): Promise<boolean> => {
  const { db } = initializeFirebase();
  try {
    if (!db) return false;
    
    // Update in main posts collection
    await updateDoc(doc(db, 'posts', post.id), {
      ...post,
      lastUpdated: serverTimestamp()
    });
    
    // Also update in user's posts subcollection
    await updateDoc(doc(db, 'users', post.authorWallet, 'posts', post.id), {
      ...post,
      lastUpdated: serverTimestamp()
    });
    
    console.log('Post updated in Firestore:', post.id);
    return true;
  } catch (error) {
    console.error('Error updating post in Firestore:', error);
    return false;
  }
};

/**
 * Save or update Aura Points for a wallet
 */
export const saveAuraPoints = async (walletAddress: string, auraPoints: AuraPointsState): Promise<boolean> => {
  const { db } = initializeFirebase();
  try {
    if (!db || !walletAddress) return false;
    
    // Save to users collection
    await setDoc(doc(db, 'users', walletAddress), {
      auraPoints: auraPoints.totalPoints,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Also save detailed transactions in a subcollection
    if (auraPoints.transactions && auraPoints.transactions.length > 0) {
      // Get the latest transaction
      const latestTransaction = auraPoints.transactions[auraPoints.transactions.length - 1];
      
      if (latestTransaction && latestTransaction.id) {
        await setDoc(doc(db, 'users', walletAddress, 'transactions', latestTransaction.id), {
          ...latestTransaction,
          timestamp: Timestamp.fromDate(new Date(latestTransaction.timestamp))
        });
      }
    }
    
    console.log(`Aura points saved for ${walletAddress}: ${auraPoints.totalPoints}`);
    return true;
  } catch (error) {
    console.error('Error saving aura points to Firestore:', error);
    return false;
  }
};

/**
 * Get Aura Points for a wallet
 */
export const getAuraPoints = async (walletAddress: string): Promise<AuraPointsState | null> => {
  const { db } = initializeFirebase();
  try {
    if (!db || !walletAddress) return null;
    
    // Get user document
    const userDoc = await getDoc(doc(db, 'users', walletAddress));
    
    if (!userDoc.exists()) {
      console.log(`No data found for user ${walletAddress}`);
      return null;
    }
    
    const userData = userDoc.data();
    const auraPoints = userData.auraPoints || 100; // Default to 100 if not found
    
    // Get transactions from subcollection
    const transactionsQuery = query(
      collection(db, 'users', walletAddress, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactions: AuraTransaction[] = [];
    
    transactionsSnapshot.forEach((docSnapshot) => {
      const transactionData = docSnapshot.data();
      const timestamp = transactionData.timestamp?.toDate?.() 
        ? transactionData.timestamp.toDate().toISOString() 
        : new Date().toISOString();
      
      transactions.push({
        ...transactionData,
        timestamp,
      } as AuraTransaction);
    });
    
    console.log(`Retrieved aura points for ${walletAddress}: ${auraPoints}, transactions: ${transactions.length}`);
    
    return {
      totalPoints: auraPoints,
      transactions
    };
  } catch (error) {
    console.error('Error getting aura points from Firestore:', error);
    return null;
  }
};

/**
 * Add a transaction for a wallet
 */
export const addTransaction = async (walletAddress: string, transaction: AuraTransaction): Promise<boolean> => {
  const { db } = initializeFirebase();
  try {
    if (!db || !walletAddress) return false;
    
    // Add transaction to user's transactions subcollection
    await setDoc(doc(db, 'users', walletAddress, 'transactions', transaction.id), {
      ...transaction,
      timestamp: Timestamp.fromDate(new Date(transaction.timestamp))
    });
    
    // Update total aura points in user document
    const userDocRef = doc(db, 'users', walletAddress);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentPoints = userData.auraPoints || 100;
      await updateDoc(userDocRef, {
        auraPoints: currentPoints + transaction.amount,
        lastUpdated: serverTimestamp()
      });
    } else {
      // Create user document if it doesn't exist
      await setDoc(userDocRef, {
        auraPoints: 100 + transaction.amount, // Default 100 + transaction amount
        lastUpdated: serverTimestamp()
      });
    }
    
    console.log(`Transaction added for ${walletAddress}: ${transaction.amount} points`);
    return true;
  } catch (error) {
    console.error('Error adding transaction to Firestore:', error);
    return false;
  }
};

/**
 * Listen to post updates in real-time using onSnapshot
 * Returns an unsubscribe function to stop listening
 */
export const listenToPosts = (callback: (posts: Post[]) => void): Unsubscribe => {
  const { db } = initializeFirebase();
  if (!db) {
    console.error('Firebase not initialized');
    return () => {}; // Return empty function
  }
  
  try {
    // Create a query for the posts collection
    const postsQuery = query(collection(db, 'posts'), orderBy('serverTimestamp', 'desc'));
    
    // Set up the listener
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts: Post[] = [];
      snapshot.forEach((doc) => {
        posts.push(doc.data() as Post);
      });
      callback(posts);
    }, (error) => {
      console.error('Error in Firestore listener:', error);
    });
    
    // Track this listener
    addListener(unsubscribe);
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up posts listener:', error);
    return () => {}; // Return empty function
  }
};

export default {
  savePost,
  getPosts,
  getUserPosts,
  updatePost,
  saveAuraPoints,
  getAuraPoints,
  addTransaction,
  listenToPosts
}; 