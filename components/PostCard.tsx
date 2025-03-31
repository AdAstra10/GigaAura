import React, { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { Post, Comment, likePost, unlikePost, addComment } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { addNotification } from '../lib/slices/notificationsSlice';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { formatDistance } from 'date-fns';
import { followUser, unfollowUser } from '../lib/slices/userSlice';
import { FaRegComment, FaRegHeart, FaHeart, FaRetweet, FaRegShareSquare, FaEllipsisH } from 'react-icons/fa';

interface PostCardProps {
  post: Post;
  comments?: Comment[];
  onShare?: () => void;
  onFollow?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, comments = [], onShare, onFollow }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  // Use username from localStorage
  const [currentUser, setCurrentUser] = useState<string>('Guest User');
  
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setCurrentUser(storedUsername);
    }
  }, []);
  
  const [isLiked, setIsLiked] = useState(post.likedBy?.includes(currentUser) || false);
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
  
  const handleLike = () => {
    if (!currentUser || currentUser === 'Guest User') {
      toast.error('Please log in to like posts');
      return;
    }
    
    if (!isLiked) {
      dispatch(likePost({ postId: post.id, walletAddress: currentUser }));
      setIsLiked(true);
      
      // Only add transaction and notification if the post is not by the current user
      if (post.authorWallet !== currentUser) {
        // Add Aura Points transaction for the post creator
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for received like
          timestamp: new Date().toISOString(),
          action: 'like_received',
          counterpartyName: user.username || currentUser,
          counterpartyWallet: currentUser
        }));
        
        // Add notification for the post creator
        dispatch(addNotification({
          type: 'like',
          message: `${user.username || currentUser} liked your post`,
          fromWallet: currentUser,
          fromUsername: user.username || undefined,
          postId: post.id,
        }));
      }
    } else {
      dispatch(unlikePost({ postId: post.id, walletAddress: currentUser }));
      setIsLiked(false);
    }
  };
  
  const handleSubmitComment = (e: FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    
    if (!currentUser || currentUser === 'Guest User') {
      toast.error('Please log in to comment');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      dispatch(addComment({
        postId: post.id,
        content: commentText,
        authorWallet: currentUser,
        authorUsername: user.username || currentUser,
        authorAvatar: user.avatar || undefined // Use avatar from Redux store if available
      }));
      
      // Add notification for the post creator if it's not the user's own post
      if (post.authorWallet !== currentUser) {
        dispatch(addNotification({
          type: 'comment',
          message: `${user.username || currentUser} commented on your post`,
          fromWallet: currentUser,
          fromUsername: user.username || undefined,
          postId: post.id,
        }));
        
        // Add Aura Points transaction for commenter
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for making a comment
          timestamp: new Date().toISOString(),
          action: 'comment_made',
          counterpartyName: post.authorUsername || post.authorWallet,
          counterpartyWallet: post.authorWallet
        }));
        
        // Add Aura Points transaction for post creator
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 10, // 10 points for received comment
          timestamp: new Date().toISOString(),
          action: 'comment_received',
          counterpartyName: user.username || currentUser,
          counterpartyWallet: currentUser
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
    return post.authorWallet === currentUser ? totalPoints : Math.floor(Math.random() * 1000);
  };
  
  const handleFollowToggle = () => {
    if (!currentUser || currentUser === 'Guest User') {
      toast.error('Please log in to follow users');
      return;
    }
    
    if (post.authorWallet === currentUser) {
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
        counterpartyName: post.authorUsername || post.authorWallet,
        counterpartyWallet: post.authorWallet
      }));
      
      // Add notification
      dispatch(addNotification({
        type: 'follow',
        message: `${user.username || currentUser} started following you`,
        fromWallet: currentUser,
        fromUsername: user.username || undefined,
        postId: undefined,
      }));
      
      toast.success(`You are now following ${post.authorUsername || post.authorWallet}`);
      
      if (onFollow) {
        onFollow();
      }
    } else {
      // Unfollow the user
      dispatch(unfollowUser(post.authorWallet));
      toast.success(`You have unfollowed ${post.authorUsername || post.authorWallet}`);
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
  
  return (
    <div className="p-4">
      <div className="flex space-x-3">
        {/* Avatar */}
        <div 
          className="flex-shrink-0 cursor-pointer" 
          onClick={handleViewProfile}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary">
            {post.authorAvatar ? (
              <img 
                src={post.authorAvatar} 
                alt={post.authorUsername || 'User'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                {post.authorUsername 
                  ? post.authorUsername.charAt(0).toUpperCase() 
                  : post.authorWallet.substring(0, 2)}
              </div>
            )}
          </div>
        </div>
      
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center">
            <div className="flex items-center flex-1">
              <div 
                className="font-bold hover:underline cursor-pointer mr-1"
                onClick={handleViewProfile}
              >
                {post.authorUsername || 'Anonymous'}
              </div>
              <span className="text-gray-500">
                @{post.authorUsername || truncateWallet(post.authorWallet)}
              </span>
              <span className="mx-1 text-gray-500">·</span>
              <span className="text-gray-500 hover:underline cursor-pointer">
                {formatDate(post.createdAt)}
              </span>
            </div>
            
            <div className="text-gray-500 hover:text-primary hover:bg-primary/10 p-1 rounded-full cursor-pointer transition-colors">
              <FaEllipsisH size={16} />
            </div>
          </div>
          
          <div className="mt-1">
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{post.content}</p>
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
          
          {/* Action buttons */}
          <div className="flex justify-between mt-3 max-w-md">
            <div 
              className={`flex items-center group cursor-pointer ${commentHover ? 'text-blue-500' : 'text-gray-500'}`}
              onMouseEnter={() => setCommentHover(true)}
              onMouseLeave={() => setCommentHover(false)}
              onClick={() => setShowComments(!showComments)}
            >
              <div className={`p-2 rounded-full ${commentHover ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}>
                <FaRegComment size={18} />
              </div>
              <span className="ml-1 text-sm">{post.comments}</span>
            </div>
            
            <div 
              className={`flex items-center group cursor-pointer ${retweetHover ? 'text-green-500' : 'text-gray-500'}`}
              onMouseEnter={() => setRetweetHover(true)}
              onMouseLeave={() => setRetweetHover(false)}
              onClick={onShare}
            >
              <div className={`p-2 rounded-full ${retweetHover ? 'bg-green-100 dark:bg-green-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}>
                <FaRetweet size={18} />
              </div>
              <span className="ml-1 text-sm">{post.shares}</span>
            </div>
            
            <div 
              className={`flex items-center group cursor-pointer ${isLiked || likeHover ? 'text-pink-500' : 'text-gray-500'}`}
              onMouseEnter={() => setLikeHover(true)}
              onMouseLeave={() => setLikeHover(false)}
              onClick={handleLike}
            >
              <div className={`p-2 rounded-full ${likeHover ? 'bg-pink-100 dark:bg-pink-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}>
                {isLiked ? <FaHeart size={18} /> : <FaRegHeart size={18} />}
              </div>
              <span className="ml-1 text-sm">{post.likes}</span>
            </div>
            
            <div 
              className={`flex items-center group cursor-pointer ${shareHover ? 'text-blue-500' : 'text-gray-500'}`}
              onMouseEnter={() => setShareHover(true)}
              onMouseLeave={() => setShareHover(false)}
            >
              <div className={`p-2 rounded-full ${shareHover ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors`}>
                <FaRegShareSquare size={18} />
              </div>
            </div>
          </div>
          
          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <h3 className="text-lg font-semibold mb-2">Comments</h3>
              
              {/* Comment form */}
              <form onSubmit={handleSubmitComment} className="mb-4">
                <div className="flex space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex-shrink-0">
                    {currentUser && (
                      <>
                        {user.avatar ? (
                          <img 
                            src={user.avatar}
                            alt={user.username || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white">
                            {user.username 
                              ? user.username.charAt(0).toUpperCase()
                              : currentUser.substring(0, 2) || '?'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-full dark:bg-gray-800 dark:text-white"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!commentText.trim() || isSubmitting}
                        className={`px-3 py-1 rounded-full ${
                          !commentText.trim() || isSubmitting
                            ? 'bg-primary/50 text-white cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        {isSubmitting ? 'Posting...' : 'Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Comment list */}
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex-shrink-0">
                        {comment.authorAvatar ? (
                          <img 
                            src={comment.authorAvatar}
                            alt={comment.authorUsername || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white">
                            {comment.authorUsername 
                              ? comment.authorUsername.charAt(0).toUpperCase()
                              : comment.authorWallet.substring(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                          <div className="flex items-center mb-1">
                            <span className="font-semibold dark:text-white mr-2">
                              {comment.authorUsername || truncateWallet(comment.authorWallet)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-2">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
