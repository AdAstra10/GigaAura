import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

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
    },
    setUserPosts: (state, action: PayloadAction<Post[]>) => {
      state.userPosts = action.payload;
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
  setFeed,
  setUserPosts,
  addPost,
  likePost,
  unlikePost,
  setCurrentPost,
  setComments,
  addComment,
  setLoading,
  setError,
} = postsSlice.actions;

export default postsSlice.reducer; 