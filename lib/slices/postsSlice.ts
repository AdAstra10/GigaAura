import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  authorUsername?: string;
  authorAvatar?: string;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: number;
  comments: number;
  shares: number;
  likedBy: string[];
  isLiked?: boolean;
  sharedBy?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorWallet: string;
  authorUsername?: string;
  authorAvatar?: string;
  createdAt: string;
  likes: number;
}

export interface PostsState {
  feed: Post[];
  userPosts: Post[];
  currentPost: Post | null;
  comments: Comment[];
  loading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  feed: [],
  userPosts: [],
  currentPost: null,
  comments: [],
  loading: false,
  error: null,
};

export const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setFeed: (state, action: PayloadAction<Post[]>) => {
      state.feed = action.payload;
      
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
    addPost: (state, action: PayloadAction<Omit<Post, 'id' | 'createdAt' | 'likes' | 'comments' | 'shares' | 'likedBy'>>) => {
      const newPost: Post = {
        ...action.payload,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
      };
      state.feed = [newPost, ...state.feed];
      state.userPosts = [newPost, ...state.userPosts];
      
      // Cache updated lists
      cacheFeed(state.feed);
      cacheUserPosts(state.userPosts);
      
      // Sync to Firestore
      db.savePost(newPost)
        .then(success => {
          console.log(`Post ${success ? 'saved to' : 'failed to save to'} Firestore`);
        })
        .catch(error => {
          console.error('Error syncing post to Firestore:', error);
        });
    },
    likePost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      
      const updatePost = (post: Post) => {
        if (post.id === postId) {
          if (!post.likedBy.includes(walletAddress)) {
            post.likes += 1;
            post.likedBy.push(walletAddress);
            post.isLiked = true;
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
            console.log(`Like ${success ? 'saved to' : 'failed to save to'} Firestore`);
          })
          .catch(error => {
            console.error('Error syncing like to Firestore:', error);
          });
      }
    },
    unlikePost: (state, action: PayloadAction<{ postId: string; walletAddress: string }>) => {
      const { postId, walletAddress } = action.payload;
      
      const updatePost = (post: Post) => {
        if (post.id === postId) {
          if (post.likedBy.includes(walletAddress)) {
            post.likes -= 1;
            post.likedBy = post.likedBy.filter(wallet => wallet !== walletAddress);
            post.isLiked = false;
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
            console.log(`Unlike ${success ? 'saved to' : 'failed to save to'} Firestore`);
          })
          .catch(error => {
            console.error('Error syncing unlike to Firestore:', error);
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
    setCurrentPost: (state, action: PayloadAction<Post>) => {
      state.currentPost = action.payload;
    },
    setComments: (state, action: PayloadAction<Comment[]>) => {
      state.comments = action.payload;
    },
    addComment: (state, action: PayloadAction<Omit<Comment, 'id' | 'createdAt' | 'likes'>>) => {
      const newComment: Comment = {
        ...action.payload,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        likes: 0,
      };
      state.comments = [newComment, ...state.comments];
      
      // Increment comment count on the post
      const updatePost = (post: Post) => {
        if (post.id === newComment.postId) {
          post.comments += 1;
        }
        return post;
      };
      
      state.feed = state.feed.map(updatePost);
      state.userPosts = state.userPosts.map(updatePost);
      
      if (state.currentPost && state.currentPost.id === newComment.postId) {
        state.currentPost = updatePost({ ...state.currentPost });
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
    },
    // New action to load data from cache
    loadFromCache: (state) => {
      try {
        console.log('Loading posts from cache...');
        // Get cached data with safety checks
        const cachedFeed = getCachedFeed();
        const cachedUserPosts = getCachedUserPosts();
        
        console.log('Cached feed:', cachedFeed);
        console.log('Cached user posts:', cachedUserPosts);
        
        // Only set feed if valid array
        if (cachedFeed && Array.isArray(cachedFeed)) {
          // Additional safety: filter out any invalid posts
          const validPosts = cachedFeed.filter(post => 
            post && typeof post === 'object' && post.id
          );
          
          console.log('Valid posts found in cache:', validPosts.length);
          state.feed = validPosts;
        } else {
          console.log('No valid cached feed found');
        }
        
        // Only set user posts if valid array
        if (cachedUserPosts && Array.isArray(cachedUserPosts)) {
          // Additional safety: filter out any invalid posts
          const validUserPosts = cachedUserPosts.filter(post => 
            post && typeof post === 'object' && post.id
          );
          
          console.log('Valid user posts found in cache:', validUserPosts.length);
          state.userPosts = validUserPosts;
        } else {
          console.log('No valid cached user posts found');
        }
      } catch (error) {
        console.error('Error loading from cache:', error);
        // If there's an error, don't modify state
      }
    },
  },
});

export const {
  setFeed,
  setUserPosts,
  addPost,
  likePost,
  unlikePost,
  sharePost,
  setCurrentPost,
  setComments,
  addComment,
  setLoading,
  setError,
  loadFromCache,
} = postsSlice.actions;

export default postsSlice.reducer; 