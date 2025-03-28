import { useState, FormEvent, ChangeEvent, useRef, DragEvent } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { Paperclip } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useRouter } from 'next/router';

interface CreatePostFormProps {
  onSubmit: (content: string, mediaFile?: File) => void;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSubmit }) => {
  const router = useRouter();
  const { isConnected, walletAddress } = useWallet();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username, avatar } = useSelector((state: RootState) => state.user as { 
    username: string | null, 
    avatar: string | null
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    if (!isConnected) {
      const confirm = window.confirm('Please connect your wallet to post. Would you like to connect now?');
      if (confirm) {
        router.push('/auth');
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      onSubmit(content, mediaFile || undefined);
      
      // Clear form
      setContent('');
      setMediaFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };
  
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };
  
  const processFile = (file: File) => {
    // Check if it's an image or video
    if (file.type.match(/image\/*/) || file.type.match(/video\/*/)) {
      setMediaFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload only images or videos');
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removeMedia = () => {
    setMediaFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
            <div 
              className={`w-full p-3 border ${isDragging ? 'border-primary border-dashed bg-primary/10' : 'border-gray-200 dark:border-gray-600'} rounded-lg focus-within:border-primary focus-within:ring-2 focus-within:ring-primary transition`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <textarea
                className="w-full bg-transparent resize-none focus:outline-none dark:text-white"
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                disabled={isLoading}
              ></textarea>
              
              {previewUrl && (
                <div className="mt-2 relative">
                  {mediaFile?.type.includes('image') ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <img src={previewUrl} alt="Media preview" className="max-h-64 w-auto mx-auto rounded" />
                      <button 
                        type="button" 
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                        onClick={removeMedia}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden">
                      <video src={previewUrl} controls className="max-h-64 w-auto mx-auto rounded"></video>
                      <button 
                        type="button" 
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                        onClick={removeMedia}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-3 flex justify-between items-center">
              <div className="flex items-center">
                <button 
                  type="button"
                  onClick={triggerFileInput} 
                  className="text-primary hover:text-primary/80 p-2"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileInputChange}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Earn +5 Aura Points by posting</span>
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