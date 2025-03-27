import { useState, FormEvent, ChangeEvent } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@lib/store';

interface CreatePostFormProps {
  onSubmit: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const { walletAddress, username, avatar } = useSelector((state: RootState) => state.user);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsLoading(true);
    
    try {
      onSubmit(content, mediaUrl || undefined, mediaType || undefined);
      
      // Clear form
      setContent('');
      setMediaUrl('');
      setMediaType(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMediaInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setMediaUrl(url);
    
    // Simple check to determine media type based on URL
    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      setMediaType('image');
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
      setMediaType('video');
    } else {
      setMediaType(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            {avatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden relative">
                <img src={avatar} alt={username || walletAddress || 'User'} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                {username ? username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <textarea
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              disabled={isLoading}
            ></textarea>
            
            <div className="mt-3">
              <input
                type="text"
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add image or video URL (optional)"
                value={mediaUrl}
                onChange={handleMediaInputChange}
                disabled={isLoading}
              />
            </div>
            
            {mediaUrl && mediaType && (
              <div className="mt-2 p-2 bg-light rounded-lg">
                <p className="text-sm text-gray-600">
                  {mediaType === 'image' ? '🖼️ Image' : '🎬 Video'} will be attached
                </p>
              </div>
            )}
            
            <div className="mt-3 flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500">Earn +5 Aura Points by posting</span>
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!content.trim() || isLoading}
              >
                {isLoading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostForm; 