import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store'; // Ensure RootState is imported
import { v4 as uuidv4 } from 'uuid';
import { 
  cacheFeed, 
  cacheUserPosts, 
  getCachedFeed, 
  getCachedUserPosts 
} from '../../services/cache';
import db from '../../services/db';

export interface Post {
  id: string;
  content: string;
  authorWallet: string;
  authorUsername?: string | null; // Optional: display name
  authorAvatar?: string | null;   // Optional: avatar URL
  authorName?: string;
  createdAt: string;
  mediaUrl?: string | null;      // Optional: URL for image/video
  mediaType?: 'image' | 'video' | null; // Type of media
  likes: number;
  comments: Comment[]; // Store comments directly
  shares: number;
  // Tracking arrays (wallet addresses)
  likedBy: string[]; 
  sharedBy: string[];
  bookmarkedBy: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorWallet: string;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
}

export interface PostsState {
  feed: Post[];
  userPosts: Post[];
  currentPost: Post | null;
  comments: { [postId: string]: Comment[] };
  loading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  feed: [],
  userPosts: [],
  currentPost: null,
  comments: {},
  loading: false,
  error: null,
};

// --- Async Thunk for Saving New Post --- 
export const saveNewPost = createAsyncThunk(
  'posts/saveNew',
  async (postData: { content: string; mediaUrl?: string | null; mediaType?: 'image' | 'video' | null }, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { walletAddress, username, avatar } = state.user;

    if (!walletAddress) {
      return rejectWithValue('User not authenticated to create post');
    }
    if (!postData.content?.trim()) {
      return rejectWithValue('Post content cannot be empty');
    }

    // Construct the full post object for the API
    const newPostPayload = {
      content: postData.content,
      authorWallet: walletAddress,
      authorUsername: username || null,
      authorAvatar: avatar || null,
      mediaUrl: postData.mediaUrl || null,
      mediaType: postData.mediaType || null,
      // The backend API (/api/posts) will handle setting the ID, createdAt, likes, etc.
    };

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify(newPostPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save new post via API:', errorData);
        return rejectWithValue(errorData.error || 'Failed to save post');
      }

      const savedPost: Post = await response.json(); // API should return the complete saved post
      console.log('New post saved successfully via API:', savedPost);

      // Dispatch the synchronous action to add the *saved* post to the state
      dispatch(postsSlice.actions.addPost(savedPost)); 

      // Optionally update localStorage cache here if desired
      // ... (localStorage update logic similar to saveUserProfile) ...

      return savedPost; // Return the saved post object
    } catch (error) {
      console.error('Network or other error saving new post:', error);
      return rejectWithValue('Network error saving post');
    }
  }
);
// --- End Async Thunk --- 

export const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setFeed: (state, action: PayloadAction<Post[]>) => {
      state.feed = action.payload.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Cache the feed when it's updated
      cacheFeed(action.payload);
      
      // No need to sync to Firestore here as this is typically
      // used when loading FROM Firestore
    },
    setUserPosts: (state, action: PayloadAction<Post[]>) => {
      state.userPosts = action.payload;
      
      // Cache user posts when they're updated
      cacheUserPosts(action.payload);
      
      // No need to sync to Firestore here as this is typically
      // used when loading FROM Firestore
    },
    addPost: (state, action: PayloadAction<Post>) => {
      // Avoid duplicates and add to the start
      if (!state.feed.some(post => post.id === action.payload.id)) {
        state.feed.unshift(action.payload);
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Also directly save to localStorage with the key used by Feed component
      if (typeof window !== 'undefined') {
        try {
          // Get existing posts from localStorage
          const existingPostsJSON = localStorage.getItem('giga-aura-posts');
          let existingPosts = [];
          
          if (existingPostsJSON) {
            existingPosts = JSON.parse(existingPostsJSON);
          }
          
          // Add new post to the beginning of the array
          const updatedPosts = [action.payload, ...existingPosts];
          
          // Save updated array back to localStorage
          localStorage.setItem('giga-aura-posts', JSON.stringify(updatedPosts));
          console.log('Post saved to localStorage with key giga-aura-posts');
        } catch (error) {
          console.error('Error saving post to localStorage:', error);
        }
      }
      
      // Sync to Firestore
      db.savePost(action.payload)
        .then(success => {
          console.log(`Post ${success ? 'saved to' : 'failed to save to'} Firestore`);
        })
        .catch(error => {
          console.error('Error syncing post to Firestore:', error);
        });
    },
    updatePost: (state, action: PayloadAction<Partial<Post> & { id: string }>) => {
      const index = state.feed.findIndex(post => post.id === action.payload.id);
      if (index !== -1) {
        state.feed[index] = { ...state.feed[index], ...action.payload };
      }
      // Also update userPosts if needed
      const userIndex = state.userPosts.findIndex(post => post.id === action.payload.id);
      if (userIndex !== -1) {
        state.userPosts[userIndex] = { ...state.userPosts[userIndex], ...action.payload };
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
    },
    likePost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      const updateLike = (post: Post) => {
        if (post.id === postId) {
          // Ensure likedBy is an array
          post.likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
          
          // Add walletAddress if not already present
          if (!post.likedBy.includes(walletAddress)) {
            post.likedBy.push(walletAddress);
            post.likes = post.likedBy.length; // Update likes count
          }
        }
        return post;
      };
      
      state.feed = state.feed.map(updateLike);
      state.userPosts = state.userPosts.map(updateLike);
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost = updateLike({ ...state.currentPost });
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Sync to Firestore (consider moving this to a thunk?)
      const postToUpdate = state.feed.find(p => p.id === postId);
      if (postToUpdate) {
        db.updatePost(postToUpdate).then(success => {
          console.log(`Post like update ${success ? 'synced' : 'failed to sync'} to Firestore`);
        });
      }
    },
    unlikePost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      const updateUnlike = (post: Post) => {
        if (post.id === postId) {
           // Ensure likedBy is an array
          post.likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
          
          // Filter out walletAddress
          const initialLength = post.likedBy.length;
          post.likedBy = post.likedBy.filter(id => id !== walletAddress);
          
          // Update likes count only if an address was actually removed
          if (post.likedBy.length < initialLength) {
             post.likes = post.likedBy.length;
          }
        }
        return post;
      };
      
      state.feed = state.feed.map(updateUnlike);
      state.userPosts = state.userPosts.map(updateUnlike);
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost = updateUnlike({ ...state.currentPost });
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Sync to Firestore (consider moving this to a thunk?)
      const postToUpdate = state.feed.find(p => p.id === postId);
      if (postToUpdate) {
        db.updatePost(postToUpdate).then(success => {
          console.log(`Post unlike update ${success ? 'synced' : 'failed to sync'} to Firestore`);
        });
      }
    },
    sharePost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      
      const updatePost = (post: Post) => {
        if (post.id === postId) {
          // Initialize sharedBy array if it doesn't exist
          if (!post.sharedBy) {
            post.sharedBy = [];
          }
          
          // Only increment share count if this user hasn't shared before
          if (!post.sharedBy.includes(walletAddress)) {
            post.shares += 1;
            post.sharedBy.push(walletAddress);
          }
        }
        return post;
      };
      
      state.feed = state.feed.map(updatePost);
      state.userPosts = state.userPosts.map(updatePost);
      
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost = updatePost({ ...state.currentPost });
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Sync the updated post to Firestore
      const updatedPost = state.feed.find(post => post.id === postId);
      if (updatedPost) {
        db.updatePost(updatedPost)
          .then(success => {
            console.log(`Share ${success ? 'saved to' : 'failed to save to'} Firestore`);
          })
          .catch(error => {
            console.error('Error syncing share to Firestore:', error);
          });
      }
    },
    bookmarkPost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      
      const updatePost = (post: Post) => {
        if (post.id === postId) {
          // Initialize bookmarkedBy array if it doesn't exist
          if (!post.bookmarkedBy) {
            post.bookmarkedBy = [];
          }
          
          // Add wallet to bookmarkedBy if not already there
          if (!post.bookmarkedBy.includes(walletAddress)) {
            post.bookmarkedBy.push(walletAddress);
          }
        }
        return post;
      };
      
      state.feed = state.feed.map(updatePost);
      state.userPosts = state.userPosts.map(updatePost);
      
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost = updatePost({ ...state.currentPost });
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Sync the updated post to Firestore
      const updatedPost = state.feed.find(post => post.id === postId);
      if (updatedPost) {
        db.updatePost(updatedPost)
          .then(success => {
            console.log(`Bookmark ${success ? 'saved to' : 'failed to save to'} database`);
          })
          .catch(error => {
            console.error('Error syncing bookmark to database:', error);
          });
      }
    },
    unbookmarkPost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      
      const updatePost = (post: Post) => {
        if (post.id === postId && post.bookmarkedBy) {
          // Remove wallet from bookmarkedBy
          post.bookmarkedBy = post.bookmarkedBy.filter(wallet => wallet !== walletAddress);
        }
        return post;
      };
      
      state.feed = state.feed.map(updatePost);
      state.userPosts = state.userPosts.map(updatePost);
      
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost = updatePost({ ...state.currentPost });
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Sync the updated post to Firestore
      const updatedPost = state.feed.find(post => post.id === postId);
      if (updatedPost) {
        db.updatePost(updatedPost)
          .then(success => {
            console.log(`Unbookmark ${success ? 'saved to' : 'failed to save to'} database`);
          })
          .catch(error => {
            console.error('Error syncing unbookmark to database:', error);
          });
      }
    },
    setCurrentPost: (state, action: PayloadAction<Post>) => {
      state.currentPost = action.payload;
    },
    setComments: (state, action: PayloadAction<{ postId: string; comments: Comment[] }>) => {
      state.comments[action.payload.postId] = action.payload.comments;
    },
    addComment: (state, action: PayloadAction<Comment>) => {
      const { postId } = action.payload;
      if (!state.comments[postId]) {
        state.comments[postId] = [];
      }
      // Avoid adding duplicate comments
      if (!state.comments[postId].some(c => c.id === action.payload.id)) {
          state.comments[postId].push(action.payload);
      }
      // Also update the comment list within the post object in the feed
      const postIndex = state.feed.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
         if (!state.feed[postIndex].comments.some(c => c.id === action.payload.id)) {
            state.feed[postIndex].comments.push(action.payload);
         }
      }
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    // New action to load data from cache
    loadFromCache: (state, action: PayloadAction<Post[]>) => {
      state.feed = action.payload;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveNewPost.pending, (state) => {
        // Optionally set loading state for posting
        state.loading = true; 
      })
      .addCase(saveNewPost.fulfilled, (state, action) => {
        state.loading = false;
        // State is updated via the dispatch within the thunk
        // The addPost reducer already adds the post to the feed
        console.log('saveNewPost fulfilled, post added to state.');
      })
      .addCase(saveNewPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('saveNewPost rejected:', action.payload);
      });
      // Add handlers for other thunks if needed
  },
});

export const {
  setFeed,
  setUserPosts,
  addPost,
  updatePost,
  likePost,
  unlikePost,
  sharePost,
  bookmarkPost,
  unbookmarkPost,
  setCurrentPost,
  setComments,
  addComment,
  setLoading,
  setError,
  loadFromCache,
} = postsSlice.actions;

export default postsSlice.reducer; 