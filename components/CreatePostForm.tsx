import { useState, FormEvent, ChangeEvent, useRef, DragEvent } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { Paperclip, Image, Video, XCircle, Smile } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

interface CreatePostFormProps {
  onSubmit: (content: string, mediaFile?: File) => boolean;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSubmit }) => {
  const { connectWallet, walletConnected, walletAddress } = useWallet();
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
    
    // Allow posting with just media and no content
    if (!content.trim() && !mediaFile) return;
    
    if (!walletConnected) {
      const confirm = window.confirm('Please connect your wallet to post. Would you like to connect now?');
      if (confirm) {
        await connectWallet();
        if (!walletConnected) return; // If still not connected after attempt, return
      } else {
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const success = onSubmit(content, mediaFile || undefined);
      
      if (success) {
        // Clear form
        setContent('');
        setMediaFile(null);
        setPreviewUrl(null);
      }
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
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-4">
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
            <div className="w-full">
              <textarea
                className="w-full resize-none focus:outline-none dark:text-white dark:bg-transparent text-lg p-2 placeholder-gray-500"
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                disabled={isLoading}
              ></textarea>
              
              {previewUrl && (
                <div className="mt-2 relative">
                  {mediaFile?.type.includes('image') ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <img src={previewUrl} alt="Media preview" className="max-h-64 w-auto rounded-lg" />
                      <button 
                        type="button" 
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                        onClick={removeMedia}
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden">
                      <video src={previewUrl} controls className="max-h-64 w-auto rounded-lg"></video>
                      <button 
                        type="button" 
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                        onClick={removeMedia}
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-center justify-between border-t dark:border-gray-700 pt-3">
              <div className="flex items-center space-x-2">
                <button 
                  type="button"
                  onClick={triggerFileInput} 
                  className="text-primary hover:bg-primary/10 p-2 rounded-full"
                >
                  <Image size={18} />
                </button>
                <button 
                  type="button" 
                  className="text-primary hover:bg-primary/10 p-2 rounded-full"
                >
                  <Smile size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileInputChange}
                />
              </div>
              
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={(content.trim() === '' && !mediaFile) || isLoading}
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