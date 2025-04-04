import React, { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { Post, Comment, likePost, unlikePost, addComment, sharePost, bookmarkPost, unbookmarkPost } from '../lib/slices/postsSlice';
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
  const { walletAddress, username, avatar } = useSelector((state: RootState) => state.user as {
    walletAddress: string | null;
    username: string | null;
    avatar: string | null;
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
  const [hasShared, setHasShared] = useState(false);

  // Load bookmarked state from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && connected && walletAddress) {
      // Check bookmarks
      const isBookmarkedInArray = post.bookmarkedBy?.includes(walletAddress) || false;
      
      // Fall back to localStorage if not in the post's bookmarkedBy array
      if (!isBookmarkedInArray) {
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
      } else {
        setIsBookmarked(true);
      }
      
      // Check if already shared
      setHasShared(post.sharedBy?.includes(walletAddress) || false);
    }
  }, [post.id, post.sharedBy, post.bookmarkedBy, connected, walletAddress]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds / 3600 < 24) {
      return `${Math.floor(diffInSeconds / 3600)}h`;
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
      // Create a comment object that matches what the addComment action expects
      const commentPayload = {
        postId: post.id,
        content: commentText,
        authorWallet: walletAddress,
        authorUsername: username || undefined,
        authorAvatar: avatar || 'https://i.pravatar.cc/150?img=1'
      };
      
      // Dispatch the comment to Redux
      dispatch(addComment(commentPayload));
      
      // Set showComments to true to make sure comments are visible
      if (!showComments) {
        setShowComments(true);
      }
      
      // Add notification for the post creator if it's not the user's own post
      if (post.authorWallet !== walletAddress) {
        dispatch(addNotification({
          type: 'comment',
          message: `${username || truncateWallet(walletAddress)} commented on your post: "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`,
          fromWallet: walletAddress,
          fromUsername: username || undefined,
          postId: post.id
        }));
        
        // Add Aura Points transaction for commenter
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for making a comment
          timestamp: new Date().toISOString(),
          action: 'comment_made',
          counterpartyName: post.authorUsername || truncateWallet(post.authorWallet),
          counterpartyWallet: post.authorWallet
        }));
        
        // Add Aura Points transaction for post creator
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for received comment
          timestamp: new Date().toISOString(),
          action: 'comment_received',
          counterpartyName: username || truncateWallet(walletAddress),
          counterpartyWallet: walletAddress
        }));
        
        // Show toast notification
        toast.success('Comment posted successfully!');
      } else {
        toast.success('Comment added to your post!');
      }
      
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to post comment. Please try again.');
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
      
      // Call the onFollow prop if provided
      if (onFollow) {
        onFollow();
      }
      
      // Add notification for the user being followed
      dispatch(addNotification({
        type: 'follow',
        message: `${username || truncateWallet(walletAddress)} started following you`,
        fromWallet: walletAddress,
        fromUsername: username || undefined
      }));
      
      // Add Aura Points transaction
      dispatch(addTransaction({
        id: uuidv4(),
        amount: 10, // Points for following someone
        timestamp: new Date().toISOString(),
        action: 'follow_given',
        counterpartyName: post.authorUsername || truncateWallet(post.authorWallet),
        counterpartyWallet: post.authorWallet
      }));
      
      toast.success(`You are now following ${post.authorUsername || truncateWallet(post.authorWallet)}`);
    } else {
      // Unfollow the user
      dispatch(unfollowUser(post.authorWallet));
      toast.success(`You unfollowed ${post.authorUsername || truncateWallet(post.authorWallet)}`);
    }
  };
  
  const handleViewProfile = () => {
    router.push(`/profile/${post.authorWallet}`);
  };
  
  const truncateWallet = (address: string) => {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
  };
  
  const handleSharePost = async () => {
    if (!connected) {
      const confirm = window.confirm('Please connect your wallet to share posts. Would you like to connect now?');
      if (confirm) {
        await connectWallet();
        if (!connected) return;
      } else {
        return;
      }
    }
    
    if (!walletAddress) return;
    
    try {
      // Update share count in Redux
      dispatch(sharePost({ postId: post.id, walletAddress }));
      
      // Update local state
      setHasShared(true);
      
      // Call the onShare prop if provided
      if (onShare) {
        onShare();
      }
      
      // Add notification for the post creator if it's not the current user
      if (post.authorWallet !== walletAddress) {
        dispatch(addNotification({
          type: 'share',
          message: `${username || truncateWallet(walletAddress)} shared your post`,
          fromWallet: walletAddress,
          fromUsername: username || undefined,
          postId: post.id
        }));
        
        // Add Aura Points transaction for post owner
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 15, // 15 points for having your post shared
          timestamp: new Date().toISOString(),
          action: 'post_shared',
          counterpartyName: username || truncateWallet(walletAddress),
          counterpartyWallet: walletAddress
        }));
      }
      
      toast.success('Post shared successfully!');
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post. Please try again.');
    }
  };
  
  const handleBookmark = async () => {
    if (!connected) {
      const confirm = window.confirm('Please connect your wallet to bookmark posts. Would you like to connect now?');
      if (confirm) {
        await connectWallet();
        if (!connected) return;
      } else {
        return;
      }
    }
    
    if (!walletAddress) return;
    
    // Toggle bookmarked state
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    
    // Save to localStorage for backup
    const bookmarksKey = `bookmarks-${walletAddress}`;
    const savedBookmarks = localStorage.getItem(bookmarksKey);
    let bookmarkedPosts = [];
    
    if (savedBookmarks) {
      try {
        bookmarkedPosts = JSON.parse(savedBookmarks);
        if (!Array.isArray(bookmarkedPosts)) {
          bookmarkedPosts = [];
        }
      } catch (error) {
        console.error('Error parsing bookmarks from localStorage:', error);
        bookmarkedPosts = [];
      }
    }
    
    if (newBookmarkedState) {
      // Add to bookmarks if not already there
      if (!bookmarkedPosts.includes(post.id)) {
        bookmarkedPosts.push(post.id);
        
        // Use Redux action to update post in the store and database
        dispatch(bookmarkPost({ postId: post.id, walletAddress }));
        
        // Add notification for post creator
        if (post.authorWallet !== walletAddress) {
          dispatch(addNotification({
            type: 'system',
            message: `${username || truncateWallet(walletAddress)} bookmarked your post`,
            fromWallet: walletAddress,
            fromUsername: username || undefined,
            postId: post.id
          }));
          
          // Award Aura Points to the post creator for engagement
          dispatch(addTransaction({
            id: uuidv4(),
            amount: 5, // 5 points for received bookmark
            timestamp: new Date().toISOString(),
            action: 'like_received', // Using 'like_received' as a generic engagement reward
            counterpartyName: username || truncateWallet(walletAddress),
            counterpartyWallet: walletAddress
          }));
        }
      }
      toast.success('Post bookmarked successfully!');
    } else {
      // Remove from bookmarks
      bookmarkedPosts = bookmarkedPosts.filter((id: string) => id !== post.id);
      
      // Use Redux action to update post in the store and database
      dispatch(unbookmarkPost({ postId: post.id, walletAddress }));
      
      toast.success('Post removed from bookmarks');
    }
    
    // Save updated bookmarks back to localStorage as backup
    localStorage.setItem(bookmarksKey, JSON.stringify(bookmarkedPosts));
  };
  
  const handleToggleComments = () => {
    setShowComments(!showComments);
  };
  
  // Add null/undefined checks for any string operations in the PostCard component
  // Example fix for the substring operation issue:

  // When rendering author information
  const displayName = post.authorUsername 
    ? (post.authorUsername.length > 20 ? post.authorUsername.substring(0, 17) + '...' : post.authorUsername)
    : 'Anonymous';

  // And for wallet address
  const displayWallet = post.authorWallet
    ? `${post.authorWallet.substring(0, 4)}...${post.authorWallet.substring(post.authorWallet.length - 4)}`
    : '';

  // Safe accessor for any string attribute that might be accessed with string methods
  const safeString = (value: string | null | undefined): string => {
    return value || '';
  };

  return (
    <div className="border border-[var(--border-color)] rounded-lg bg-white dark:bg-gray-900 p-4 mb-4 overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex">
        <div className="flex-shrink-0 mr-4">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            {post.authorAvatar ? (
              <Image 
                src={post.authorAvatar} 
                alt={post.authorUsername || 'User'} 
                width={48} 
                height={48} 
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                {post.authorUsername?.[0] || post.authorWallet.substring(0, 2)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-grow">
          {/* Author Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <button 
                onClick={handleViewProfile}
                className="font-bold hover:underline text-black dark:text-white"
              >
                {displayName}
              </button>
              
              {post.authorWallet !== walletAddress && (
                <button 
                  onClick={handleFollowToggle}
                  className={`ml-2 text-xs py-1 px-2 rounded-full ${
                    isFollowing 
                      ? 'bg-[#F6B73C]/10 text-[#F6B73C] hover:bg-[#F6B73C]/20' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              
              <span className="mx-2 text-gray-500">•</span>
              <span className="text-gray-500 text-sm">
                {formatDate(post.createdAt)}
              </span>
            </div>
            
            <div className="text-gray-500">
              <button 
                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1"
                aria-label="More options"
              >
                <FaEllipsisH />
              </button>
            </div>
          </div>
          
          {/* Post Content */}
          <div className="mb-3 text-black dark:text-white whitespace-pre-wrap break-words">
            {post.content}
          </div>
          
          {/* Media */}
          {post.mediaUrl && (
            <div className="mb-3 rounded-lg overflow-hidden">
              {post.mediaType === 'image' ? (
                <Image 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  width={500} 
                  height={300} 
                  className="w-full object-cover max-h-96"
                />
              ) : post.mediaType === 'video' ? (
                <video 
                  src={post.mediaUrl} 
                  controls 
                  className="w-full max-h-96"
                />
              ) : null}
            </div>
          )}
          
          {/* Interaction Buttons */}
          <div className="flex justify-between mt-4">
            <div className="flex items-center group">
              <button 
                onClick={handleToggleComments}
                aria-label="Comment"
                className="p-2 rounded-full text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10"
              >
                <ChatBubbleLeftIcon className="h-5 w-5" />
              </button>
              {post.comments > 0 && (
                <span className="text-sm text-gray-500 group-hover:text-blue-500">
                  {post.comments}
                </span>
              )}
            </div>
            
            <div className="flex items-center group">
              <button 
                onClick={handleSharePost}
                aria-label="Repost"
                className={`p-2 rounded-full ${
                  hasShared 
                    ? 'text-green-500' 
                    : 'text-gray-500 group-hover:text-green-500 group-hover:bg-green-50 dark:group-hover:bg-green-900/10'
                }`}
              >
                <ArrowPathRoundedSquareIcon className="h-5 w-5" />
              </button>
              {post.shares > 0 && (
                <span className={`text-sm ${hasShared ? 'text-green-500' : 'text-gray-500 group-hover:text-green-500'}`}>
                  {post.shares}
                </span>
              )}
            </div>
            
            <div className="flex items-center group">
              <button 
                onClick={handleLike}
                aria-label="Like"
                className={`p-2 rounded-full ${
                  isLiked 
                    ? 'text-pink-500' 
                    : 'text-gray-500 group-hover:text-pink-500 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/10'
                }`}
              >
                {isLiked ? (
                  <HeartIcon className="h-5 w-5 fill-pink-500" />
                ) : (
                  <HeartIcon className="h-5 w-5" />
                )}
              </button>
              {post.likes > 0 && (
                <span className={`text-sm ${isLiked ? 'text-pink-500' : 'text-gray-500 group-hover:text-pink-500'}`}>
                  {post.likes + (isLiked ? 1 : 0)}
                </span>
              )}
            </div>
            
            <div className="flex items-center group">
              <button 
                onClick={handleBookmark}
                aria-label="Bookmark"
                className={`p-2 rounded-full ${
                  isBookmarked 
                    ? 'text-blue-500' 
                    : 'text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10'
                }`}
              >
                {isBookmarked ? (
                  <BookmarkSolidIcon className="h-5 w-5" />
                ) : (
                  <BookmarkOutlineIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            
            <div className="flex items-center group">
              <button 
                onClick={() => {
                  const postUrl = `${window.location.origin}/post/${post.id}`;
                  navigator.clipboard.writeText(postUrl)
                    .then(() => toast.success('Post link copied to clipboard!'))
                    .catch(() => toast.error('Failed to copy link'));
                }}
                aria-label="Share"
                className="p-2 rounded-full text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Comment Section */}
          {showComments && (
            <div className="mt-4 border-t border-[var(--border-color)] pt-4">
              {/* Comment Form */}
              <form onSubmit={handleSubmitComment} className="mb-4">
                <div className="flex">
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {connected ? (
                        <Image 
                          src={avatar || 'https://i.pravatar.cc/150?img=1'} 
                          alt={username || 'User'} 
                          width={32} 
                          height={32} 
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          ?
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <textarea
                      className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-black dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={connected ? "Post your reply" : "Connect wallet to comment"}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={!connected || isSubmitting}
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        className={`px-4 py-2 rounded-full font-medium ${
                          connected && commentText.trim() && !isSubmitting
                            ? 'bg-primary hover:bg-primary-hover text-white'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!connected || !commentText.trim() || isSubmitting}
                      >
                        {isSubmitting ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Comments List */}
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0 mr-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <Image 
                            src={comment.authorAvatar || 'https://i.pravatar.cc/150?img=1'} 
                            alt={comment.authorUsername || 'User'} 
                            width={32} 
                            height={32} 
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="flex items-center mb-1">
                            <span className="font-bold text-black dark:text-white mr-2">
                              {comment.authorUsername || 'Anonymous'}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {formatDate(comment.createdAt || new Date().toISOString())}
                            </span>
                          </div>
                          <p className="text-black dark:text-white">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;