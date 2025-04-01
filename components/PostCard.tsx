import React, { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { Post, Comment, likePost, unlikePost, addComment } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { addNotification } from '../lib/slices/notificationsSlice';
import { useWallet } from '../contexts/WalletContext';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { formatDistance } from 'date-fns';
import { followUser, unfollowUser } from '../lib/slices/userSlice';
import { FaRegComment, FaRegHeart, FaHeart, FaRetweet, FaRegShareSquare, FaEllipsisH } from 'react-icons/fa';
import Image from 'next/image';
import { ChatBubbleLeftIcon, ArrowPathRoundedSquareIcon, HeartIcon, ShareIcon, BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

interface PostCardProps {
  post: Post;
  comments?: Comment[];
  onShare?: () => void;
  onFollow?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, comments = [], onShare, onFollow }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { connectWallet, connected } = useWallet();
  const { walletAddress, username } = useSelector((state: RootState) => state.user as {
    walletAddress: string | null;
    username: string | null;
  });
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  const [isLiked, setIsLiked] = useState(post.likedBy?.includes(walletAddress || '') || false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { following } = useSelector((state: RootState) => state.user);
  
  // Hover states for interaction buttons
  const [commentHover, setCommentHover] = useState(false);
  const [retweetHover, setRetweetHover] = useState(false);
  const [likeHover, setLikeHover] = useState(false);
  const [shareHover, setShareHover] = useState(false);
  
  // Check if the current user is following the post author
  const isFollowing = following.includes(post.authorWallet);

  const [isBookmarked, setIsBookmarked] = useState(false);

  // Load bookmarked state from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && connected && walletAddress) {
      const bookmarksKey = `bookmarks-${walletAddress}`;
      const savedBookmarks = localStorage.getItem(bookmarksKey);
      
      if (savedBookmarks) {
        try {
          const bookmarkedPosts = JSON.parse(savedBookmarks);
          setIsBookmarked(bookmarkedPosts.includes(post.id));
        } catch (error) {
          console.error('Error parsing bookmarks from localStorage:', error);
        }
      }
    }
  }, [post.id, connected, walletAddress]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInHours = diffInSeconds / 3600;
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      // If more than 24 hours, show the date
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };
  
  const handleLike = async () => {
    if (!connected) {
      const confirm = window.confirm('Please connect your wallet to like posts. Would you like to connect now?');
      if (confirm) {
        await connectWallet();
        if (!connected) return;
      } else {
        return;
      }
    }
    
    if (!walletAddress) return;
    
    if (!isLiked) {
      dispatch(likePost({ postId: post.id, walletAddress }));
      setIsLiked(true);
      
      // Only add transaction and notification if the post is not by the current user
      if (post.authorWallet !== walletAddress) {
        // Add Aura Points transaction for the post creator
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for received like
          timestamp: new Date().toISOString(),
          action: 'like_received',
          counterpartyName: username || walletAddress.substring(0, 6),
          counterpartyWallet: walletAddress
        }));
        
        // Add notification for the post creator
        dispatch(addNotification({
          type: 'like',
          message: `${username || walletAddress} liked your post`,
          fromWallet: walletAddress,
          fromUsername: username || undefined,
          postId: post.id,
        }));
      }
    } else {
      dispatch(unlikePost({ postId: post.id, walletAddress }));
      setIsLiked(false);
    }
  };
  
  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    
    if (!connected) {
      const confirm = window.confirm('Please connect your wallet to comment. Would you like to connect now?');
      if (confirm) {
        await connectWallet();
        if (!connected) return;
      } else {
        return;
      }
    }
    
    if (!walletAddress) return;
    
    setIsSubmitting(true);
    
    try {
      dispatch(addComment({
        postId: post.id,
        content: commentText,
        authorWallet: walletAddress,
        authorUsername: username || undefined,
        authorAvatar: undefined // In a real app, this would come from the user state
      }));
      
      // Add notification for the post creator if it's not the user's own post
      if (post.authorWallet !== walletAddress) {
        dispatch(addNotification({
          type: 'comment',
          message: `${username || walletAddress} commented on your post`,
          fromWallet: walletAddress,
          fromUsername: username || undefined,
          postId: post.id,
        }));
        
        // Add Aura Points transaction for commenter
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for making a comment
          timestamp: new Date().toISOString(),
          action: 'comment_made',
          counterpartyName: post.authorUsername || post.authorWallet.substring(0, 6),
          counterpartyWallet: post.authorWallet
        }));
        
        // Add Aura Points transaction for post creator
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for received comment
          timestamp: new Date().toISOString(),
          action: 'comment_received',
          counterpartyName: username || walletAddress.substring(0, 6),
          counterpartyWallet: walletAddress
        }));
      }
      
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get the author's Aura Points
  const getAuthorAuraPoints = () => {
    // In a real app, this would come from a query or state
    // For now, just show a mock value or the points if it's the current user
    return post.authorWallet === walletAddress ? totalPoints : Math.floor(Math.random() * 1000);
  };
  
  const handleFollowToggle = () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to follow users');
      return;
    }
    
    if (post.authorWallet === walletAddress) {
      toast.error('You cannot follow yourself');
      return;
    }
    
    if (!isFollowing) {
      // Follow the user
      dispatch(followUser(post.authorWallet));
      
      // Add Aura Points for following
      dispatch(addTransaction({
        id: uuidv4(),
        amount: 10,
        timestamp: new Date().toISOString(),
        action: 'follower_gained',
        counterpartyName: post.authorUsername || post.authorWallet.substring(0, 6),
        counterpartyWallet: post.authorWallet
      }));
      
      // Add notification
      dispatch(addNotification({
        type: 'follow',
        message: `${username || walletAddress} started following you`,
        fromWallet: walletAddress,
        fromUsername: username || undefined,
        postId: undefined,
      }));
      
      toast.success(`You are now following ${post.authorUsername || post.authorWallet.substring(0, 6)}`);
      
      if (onFollow) {
        onFollow();
      }
    } else {
      // Unfollow the user
      dispatch(unfollowUser(post.authorWallet));
      toast.success(`You have unfollowed ${post.authorUsername || post.authorWallet.substring(0, 6)}`);
    }
  };
  
  const handleViewProfile = () => {
    if (post.authorWallet) {
      router.push(`/profile/${post.authorWallet}`);
    }
  };
  
  const truncateWallet = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };
  
  const handleBookmark = () => {
    if (!connected) {
      const confirm = window.confirm('Please connect your wallet to bookmark posts. Would you like to connect now?');
      if (confirm) {
        connectWallet();
      }
      return;
    }
    
    if (!walletAddress) return;
    
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    
    // Save to localStorage
    const bookmarksKey = `bookmarks-${walletAddress}`;
    const savedBookmarks = localStorage.getItem(bookmarksKey);
    let bookmarkedPosts = [];
    
    if (savedBookmarks) {
      try {
        bookmarkedPosts = JSON.parse(savedBookmarks);
      } catch (error) {
        console.error('Error parsing bookmarks from localStorage:', error);
      }
    }
    
    if (newBookmarkedState) {
      // Add to bookmarks if not already there
      if (!bookmarkedPosts.includes(post.id)) {
        bookmarkedPosts.push(post.id);
      }
      toast.success('Post bookmarked successfully!');
    } else {
      // Remove from bookmarks
      bookmarkedPosts = bookmarkedPosts.filter((id: string) => id !== post.id);
      toast.success('Post removed from bookmarks');
    }
    
    // Save updated bookmarks back to localStorage
    localStorage.setItem(bookmarksKey, JSON.stringify(bookmarkedPosts));
  };
  
  return (
    <div className="border-b border-[var(--border-color)] p-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors cursor-pointer">
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <Image 
              src={post.authorAvatar || ''} 
              alt={post.authorUsername || 'User'} 
              width={48} 
              height={48} 
              className="object-cover"
            />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center">
            <span className="profile-name font-bold">{post.authorUsername || 'Anonymous'}</span>
            {post.authorWallet && (
              <span className="user-handle ml-2">@{truncateWallet(post.authorWallet)}</span>
            )}
            <span className="metadata mx-1">·</span>
            <span className="metadata">{formatDate(post.createdAt)}</span>
          </div>
          
          <div className="mt-1">
            <p className="post-content whitespace-pre-line">{post.content}</p>
          </div>
          
          {post.mediaUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {post.mediaType === 'image' ? (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full h-auto"
                />
              ) : post.mediaType === 'video' ? (
                <video 
                  src={post.mediaUrl} 
                  controls 
                  className="w-full"
                ></video>
              ) : null}
            </div>
          )}
          
          <div className="flex justify-between mt-3 max-w-md">
            <button 
              className="flex items-center group text-gray-500 hover:text-primary"
              onClick={() => setShowComments(!showComments)}
            >
              <ChatBubbleLeftIcon className="h-5 w-5 mr-2 group-hover:text-primary" />
              <span className="text-sm group-hover:text-primary">{post.comments}</span>
            </button>
            <button 
              className="flex items-center group text-gray-500 hover:text-green-500"
              onClick={onShare}
            >
              <ArrowPathRoundedSquareIcon className="h-5 w-5 mr-2 group-hover:text-green-500" />
              <span className="text-sm group-hover:text-green-500">{post.shares}</span>
            </button>
            <button 
              className={`flex items-center group ${isLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}
              onClick={handleLike}
            >
              {isLiked ? (
                <HeartIcon className="h-5 w-5 mr-2 text-pink-500 fill-current" />
              ) : (
                <HeartIcon className="h-5 w-5 mr-2 group-hover:text-pink-500" />
              )}
              <span className={`text-sm ${isLiked ? 'text-pink-500' : 'group-hover:text-pink-500'}`}>
                {post.likes + (isLiked ? 1 : 0)}
              </span>
            </button>
            <div className="flex space-x-3">
              <button 
                className="flex items-center text-gray-500 hover:text-primary"
                onClick={() => onShare && onShare()}
              >
                <ShareIcon className="h-5 w-5" />
              </button>
              <button 
                className={`flex items-center ${isBookmarked ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                onClick={handleBookmark}
              >
                {isBookmarked ? (
                  <BookmarkSolidIcon className="h-5 w-5" />
                ) : (
                  <BookmarkOutlineIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
