import React, { useState, FormEvent } from 'react';
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

interface PostCardProps {
  post: Post;
  comments?: Comment[];
  onShare?: () => void;
  onFollow?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, comments = [], onShare, onFollow }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { connect, isConnected } = useWallet();
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
  
  const promptConnect = async () => {
    const confirm = window.confirm('Please connect your wallet to interact. Would you like to connect now?');
    if (confirm) {
      await connect();
      return isConnected; // Return the updated connection state
    }
    return false;
  };
  
  const handleLike = async () => {
    if (!isConnected) {
      const connected = await promptConnect();
      if (!connected) return;
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
    
    if (!isConnected) {
      const connected = await promptConnect();
      if (!connected) return;
    }
    
    if (!commentText.trim() || !walletAddress) return;
    
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
      dispatch(
        addTransaction({
          id: uuidv4(),
          amount: 10,
          timestamp: new Date().toISOString(),
          action: 'follower_gained',
          counterpartyName: post.authorUsername || post.authorWallet.substring(0, 6),
          counterpartyWallet: post.authorWallet
        })
      );
      
      toast.success(`You are now following ${post.authorUsername || post.authorWallet.substring(0, 6)}! +10 Aura Points`);
    } else {
      // Unfollow the user
      dispatch(unfollowUser(post.authorWallet));
      toast.success(`You unfollowed ${post.authorUsername || post.authorWallet.substring(0, 6)}`);
    }
    
    // Call the onFollow callback if provided (for Feed component updates)
    if (onFollow) {
      onFollow();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow card-outline p-4 mb-4">
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <Link href={`/profile/${post.authorWallet}`}>
            <div className="cursor-pointer">
              {post.authorAvatar ? (
                <div className="w-10 h-10 rounded-full overflow-hidden relative">
                  <img
                    src={post.authorAvatar} 
                    alt={post.authorUsername || post.authorWallet}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-300 text-sm">{post.authorWallet.substring(0, 2)}</span>
                </div>
              )}
            </div>
          </Link>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center">
            <Link href={`/profile/${post.authorWallet}`}>
              <div className="font-medium text-dark dark:text-white hover:text-primary cursor-pointer hover-effect">
                {post.authorUsername || 'Anon'}
              </div>
            </Link>
            <span className="text-gray-400 mx-1">|</span>
            <span className="text-sm text-primary">{getAuthorAuraPoints()} AP</span>
            <span className="text-gray-400 mx-1">·</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(post.createdAt)}</span>
            
            {post.authorWallet !== walletAddress && (
              <button 
                onClick={handleFollowToggle}
                className={`ml-auto text-xs font-medium rounded-full px-3 py-1 hover-effect ${
                  isFollowing 
                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          
          <p className="mt-2 mb-3 text-gray-900 dark:text-gray-200">{post.content}</p>
          
          {post.mediaUrl && (
            <div className="mt-2 mb-3 rounded-lg overflow-hidden">
              {post.mediaType === 'image' ? (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full post-image"
                />
              ) : (
                <video 
                  src={post.mediaUrl} 
                  controls 
                  className="w-full post-video"
                ></video>
              )}
            </div>
          )}
          
          <div className="flex justify-between mt-3">
            <div className="flex space-x-4">
              <button 
                onClick={handleLike}
                className={`flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover-effect ${isLiked ? 'text-red-500 dark:text-red-400' : ''}`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill={isLiked ? "currentColor" : "none"} 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={isLiked ? 0 : 1.5} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                  />
                </svg>
                <span>{post.likes}</span>
              </button>
              
              <button 
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover-effect"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{post.comments}</span>
              </button>
              
              <button 
                onClick={onShare}
                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover-effect"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>{post.shares}</span>
              </button>
            </div>
          </div>
          
          {showComments && (
            <div className="mt-4">
              <form onSubmit={handleSubmitComment} className="mb-4">
                <div className="flex">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 p-2 text-sm border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="Write a comment..."
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentText.trim()}
                    className={`px-4 py-2 rounded-r-md text-white font-medium hover-effect ${
                      isSubmitting || !commentText.trim()
                        ? 'bg-primary/60 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
              
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500 dark:text-gray-300 text-xs">
                            {comment.authorWallet.substring(0, 2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium dark:text-white">
                            {comment.authorUsername || comment.authorWallet.substring(0, 6)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm dark:text-gray-300 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-2">
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
