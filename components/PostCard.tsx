import { useState } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@lib/store';
import { Post, likePost, unlikePost } from '@lib/slices/postsSlice';
import { addTransaction } from '@lib/slices/auraPointsSlice';
import { addNotification } from '@lib/slices/notificationsSlice';
import { v4 as uuidv4 } from 'uuid';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const dispatch = useDispatch();
  const { walletAddress, username } = useSelector((state: RootState) => state.user);
  const [isLiked, setIsLiked] = useState(post.likedBy?.includes(walletAddress || '') || false);
  const [showComments, setShowComments] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const handleLike = () => {
    if (!walletAddress) return;
    
    if (!isLiked) {
      dispatch(likePost({ postId: post.id, walletAddress }));
      setIsLiked(true);
      
      // Only add transaction and notification if the post is not by the current user
      if (post.authorWallet !== walletAddress) {
        // Add Aura Points transaction for the post creator
        dispatch(addTransaction({
          id: uuidv4(),
          walletAddress: post.authorWallet, // Points go to the post creator
          action: 'like_received',
          points: 1, // 1 point for received like
          timestamp: new Date().toISOString(),
          metadata: {
            postId: post.id,
          },
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
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <Link href={`/profile/${post.authorWallet}`}>
            {post.authorAvatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden relative">
                <img
                  src={post.authorAvatar} 
                  alt={post.authorUsername || post.authorWallet}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-sm">{post.authorWallet.substring(0, 2)}</span>
              </div>
            )}
          </Link>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Link href={`/profile/${post.authorWallet}`}>
              <span className="font-medium text-dark hover:text-primary cursor-pointer">
                {post.authorUsername || post.authorWallet}
              </span>
            </Link>
            <span className="text-xs text-gray-500">{formatDate(post.createdAt)}</span>
          </div>
          
          <p className="mt-2 text-gray-800">{post.content}</p>
          
          {post.mediaUrl && (
            <div className="mt-3 rounded-lg overflow-hidden">
              {post.mediaType === 'image' ? (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media"
                  className="w-full h-auto rounded"
                />
              ) : post.mediaType === 'video' ? (
                <video 
                  src={post.mediaUrl} 
                  controls 
                  className="w-full rounded"
                />
              ) : null}
            </div>
          )}
          
          <div className="mt-4 flex space-x-6 text-sm">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1 ${isLiked ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill={isLiked ? "currentColor" : "none"} 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{post.likes}</span>
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 text-gray-500 hover:text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.comments}</span>
            </button>
            
            <button className="flex items-center space-x-1 text-gray-500 hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>{post.shares}</span>
            </button>
          </div>
        </div>
      </div>
      
      {showComments && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500">Comments coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default PostCard; 