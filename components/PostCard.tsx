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
import { ChatBubbleLeftIcon, ArrowPathRoundedSquareIcon, HeartIcon, ShareIcon, BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

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
      
      // Ensure isLiked state matches the post data
      setIsLiked(post.likedBy?.includes(walletAddress) || false);
    }
  }, [post.id, post.sharedBy, post.bookmarkedBy, post.likedBy, connected, walletAddress]);

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
      
      // Call the onFollow callback if provided
      if (onFollow) {
        onFollow();
      }
      
      // Show success message
      toast.success(`You are now following ${post.authorUsername || truncateWallet(post.authorWallet)}`);
      
      // Add notification for the user being followed
      dispatch(addNotification({
        type: 'follow',
        message: `${username || truncateWallet(walletAddress)} started following you`,
        fromWallet: walletAddress,
        fromUsername: username || undefined
      }));
      
      // Add Aura Points transaction for the follower
      dispatch(addTransaction({
        id: uuidv4(),
        amount: 20, // 20 points for following someone
        timestamp: new Date().toISOString(),
        action: 'follow_user',
        counterpartyName: post.authorUsername || truncateWallet(post.authorWallet),
        counterpartyWallet: post.authorWallet
      }));
    } else {
      // Unfollow the user
      dispatch(unfollowUser(post.authorWallet));
      
      // Show message
      toast.success(`You unfollowed ${post.authorUsername || truncateWallet(post.authorWallet)}`);
    }
  };
  
  const handleViewProfile = () => {
    if (post.authorWallet) {
      router.push(`/profile/${post.authorWallet}`);
    }
  };
  
  const truncateWallet = (address: string) => {
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
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
    
    // Only allow sharing if not already shared
    if (!hasShared) {
      dispatch(sharePost({ postId: post.id, walletAddress }));
      setHasShared(true);
      
      // Call the onShare callback if provided
      if (onShare) {
        onShare();
      }
      
      // Only add Aura Points transaction and notification if the post is not by the current user
      if (post.authorWallet !== walletAddress) {
        // Add Aura Points transaction for the sharer
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 5, // 5 points for sharing a post
          timestamp: new Date().toISOString(),
          action: 'share_post',
          counterpartyName: post.authorUsername || truncateWallet(post.authorWallet),
          counterpartyWallet: post.authorWallet
        }));
        
        // Add Aura Points transaction for the post creator (getting their post shared)
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 15, // 15 points for having your post shared
          timestamp: new Date().toISOString(),
          action: 'post_shared',
          counterpartyName: username || truncateWallet(walletAddress),
          counterpartyWallet: walletAddress
        }));
        
        // Add notification for the post creator
        dispatch(addNotification({
          type: 'share',
          message: `${username || truncateWallet(walletAddress)} shared your post`,
          fromWallet: walletAddress,
          fromUsername: username || undefined,
          postId: post.id
        }));
      }
      
      // Show success message
      toast.success('Post shared successfully!');
    } else {
      toast.success("You've already shared this post");
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
    
    // Toggle bookmark status
    if (!isBookmarked) {
      dispatch(bookmarkPost({ postId: post.id, walletAddress }));
      setIsBookmarked(true);
      
      // Store in localStorage for persistence
      try {
        const bookmarksKey = `bookmarks-${walletAddress}`;
        const savedBookmarks = localStorage.getItem(bookmarksKey);
        let bookmarkedPosts: string[] = [];
        
        if (savedBookmarks) {
          bookmarkedPosts = JSON.parse(savedBookmarks);
        }
        
        if (!bookmarkedPosts.includes(post.id)) {
          bookmarkedPosts.push(post.id);
          localStorage.setItem(bookmarksKey, JSON.stringify(bookmarkedPosts));
        }
      } catch (error) {
        console.error('Error saving bookmark to localStorage:', error);
      }
      
      // Show success message
      toast.success('Post bookmarked!');
      
      // Only add Aura Points transaction if the post is not by the current user
      if (post.authorWallet !== walletAddress) {
        // Add Aura Points transaction for bookmarking
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 5, // 5 points for bookmarking a post
          timestamp: new Date().toISOString(),
          action: 'bookmark_post',
          counterpartyName: post.authorUsername || truncateWallet(post.authorWallet),
          counterpartyWallet: post.authorWallet
        }));
      }
    } else {
      dispatch(unbookmarkPost({ postId: post.id, walletAddress }));
      setIsBookmarked(false);
      
      // Remove from localStorage
      try {
        const bookmarksKey = `bookmarks-${walletAddress}`;
        const savedBookmarks = localStorage.getItem(bookmarksKey);
        
        if (savedBookmarks) {
          let bookmarkedPosts = JSON.parse(savedBookmarks);
          bookmarkedPosts = bookmarkedPosts.filter((id: string) => id !== post.id);
          localStorage.setItem(bookmarksKey, JSON.stringify(bookmarkedPosts));
        }
      } catch (error) {
        console.error('Error removing bookmark from localStorage:', error);
      }
      
      // Show message
      toast.success('Bookmark removed');
    }
  };
  
  const handleToggleComments = () => {
    setShowComments(!showComments);
  };
  
  // Ensure that we have a safe way to access possibly missing values
  const safeString = (value: string | null | undefined): string => {
    return value || '';
  };

  return (
    <article className="w-full border-b border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
      {/* Post Header - Author info */}
      <div className="flex">
        {/* Author Avatar */}
        <div className="flex-shrink-0 mr-3">
          <Link 
            href={`/profile/${post.authorWallet}`}
            className="block rounded-full overflow-hidden w-10 h-10 hover:opacity-90 transition-opacity"
          >
            {post.authorAvatar ? (
              <Image 
                src={post.authorAvatar} 
                width={40} 
                height={40} 
                alt={post.authorUsername || ''} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                {(post.authorUsername?.[0] || post.authorWallet?.[0] || '?').toUpperCase()}
              </div>
            )}
          </Link>
        </div>
        
        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Author + Date */}
          <div className="flex items-center text-sm mb-2">
            <span 
              className="font-bold text-black dark:text-white cursor-pointer hover:underline"
              onClick={handleViewProfile}
            >
              {post.authorUsername || truncateWallet(post.authorWallet)}
            </span>
            
            {/* Verified icon if needed */}
            {post.authorUsername && post.authorUsername.includes('Founder') && (
              <span className="ml-1 text-blue-400">
                <CheckBadgeIcon className="h-4 w-4 text-primary" />
              </span>
            )}
            
            <span className="mx-1 text-gray-500 dark:text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">{formatDate(post.createdAt)}</span>
            
            {/* More options button */}
            <button className="ml-auto text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <FaEllipsisH className="h-4 w-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="text-black dark:text-white mb-3 whitespace-pre-wrap">
            {post.content}
          </div>
          
          {/* Media if present */}
          {post.mediaUrl && (
            <div className="mb-3 rounded-lg overflow-hidden">
              {post.mediaType === 'image' ? (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full h-auto max-h-96 object-cover rounded-lg"
                />
              ) : post.mediaType === 'video' ? (
                <video 
                  controls 
                  className="w-full h-auto max-h-96 object-cover rounded-lg"
                >
                  <source src={post.mediaUrl} />
                  Your browser does not support the video tag.
                </video>
              ) : null}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-between mt-3 text-gray-500 dark:text-gray-400 max-w-md">
            {/* Comment */}
            <button 
              className="flex items-center group"
              onMouseEnter={() => setCommentHover(true)}
              onMouseLeave={() => setCommentHover(false)}
              onClick={handleToggleComments}
            >
              <div className={`p-2 rounded-full transition-colors ${commentHover ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : ''}`}>
                <ChatBubbleLeftIcon className="h-5 w-5" />
              </div>
              <span className={`ml-1 text-sm ${commentHover ? 'text-blue-500' : ''}`}>
                {post.comments || 0}
              </span>
            </button>
            
            {/* Repost */}
            <button 
              className="flex items-center group"
              onMouseEnter={() => setRetweetHover(true)}
              onMouseLeave={() => setRetweetHover(false)}
              onClick={handleSharePost}
              disabled={hasShared}
            >
              <div className={`p-2 rounded-full transition-colors ${retweetHover ? 'bg-green-50 dark:bg-green-900/30 text-green-500' : ''} ${hasShared ? 'text-green-500' : ''}`}>
                <ArrowPathRoundedSquareIcon className="h-5 w-5" />
              </div>
              <span className={`ml-1 text-sm ${retweetHover ? 'text-green-500' : ''} ${hasShared ? 'text-green-500' : ''}`}>
                {post.shares || 0}
              </span>
            </button>
            
            {/* Like */}
            <button 
              className="flex items-center group"
              onMouseEnter={() => setLikeHover(true)}
              onMouseLeave={() => setLikeHover(false)}
              onClick={handleLike}
            >
              <div className={`p-2 rounded-full transition-colors ${likeHover ? 'bg-red-50 dark:bg-red-900/30' : ''} ${isLiked ? 'text-red-500' : ''}`}>
                {isLiked ? (
                  <HeartIcon className="h-5 w-5 fill-current" />
                ) : (
                  <HeartIcon className="h-5 w-5" />
                )}
              </div>
              <span className={`ml-1 text-sm ${likeHover ? 'text-red-500' : ''} ${isLiked ? 'text-red-500' : ''}`}>
                {post.likes || 0}
              </span>
            </button>
            
            {/* Bookmark */}
            <button 
              className="flex items-center group"
              onMouseEnter={() => setShareHover(true)}
              onMouseLeave={() => setShareHover(false)}
              onClick={handleBookmark}
            >
              <div className={`p-2 rounded-full transition-colors ${shareHover ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                {isBookmarked ? (
                  <BookmarkSolidIcon className="h-5 w-5 text-blue-500" />
                ) : (
                  <BookmarkOutlineIcon className="h-5 w-5" />
                )}
              </div>
            </button>
          </div>
          
          {/* Comments section */}
          {showComments && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {/* Comment form */}
              <form onSubmit={handleSubmitComment} className="mb-4">
                <div className="flex">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt={username || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                          {username ? username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <textarea
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Write a comment..."
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        className="px-4 py-1 bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50"
                        disabled={!commentText.trim() || isSubmitting}
                      >
                        {isSubmitting ? 'Posting...' : 'Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Comment list */}
              <div className="space-y-4">
                {comments.filter(c => c.postId === post.id).map((comment) => (
                  <div key={comment.id} className="flex">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        {comment.authorAvatar ? (
                          <img 
                            src={comment.authorAvatar} 
                            alt={comment.authorUsername || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                            {comment.authorUsername ? comment.authorUsername.charAt(0).toUpperCase() : comment.authorWallet.substring(0, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center text-sm mb-1">
                        <span className="font-bold text-black dark:text-white">
                          {comment.authorUsername || truncateWallet(comment.authorWallet)}
                        </span>
                        <span className="mx-1 text-gray-500 dark:text-gray-400">·</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="text-black dark:text-white">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}
                
                {comments.filter(c => c.postId === post.id).length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No comments yet. Be the first to comment!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;