import React, { useState, useRef, FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { useWallet } from '../contexts/WalletContext';
import Image from 'next/image';
import { FaImage, FaRegSmile, FaMapMarkerAlt, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface CreatePostFormProps {
  onSubmit: (content: string, mediaFile?: File) => boolean;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { connected, connectWallet, walletAddress } = useWallet();
  const { username, avatar } = useSelector((state: RootState) => state.user);
  
  // Twitter Blue styling
  const twitterBlue = "text-[#1D9BF0] dark:text-[#1D9BF0]";
  const twitterBlueBg = "bg-[#1D9BF0] hover:bg-[#1A8CD8]";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is an image
      if (!file.type.match('image.*')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !imageFile) {
      toast.error('Please enter some content or attach an image');
      return;
    }
    
    if (!connected) {
      const confirmConnect = window.confirm('You need to connect your wallet to create a post. Connect now?');
      if (confirmConnect) {
        connectWallet();
      }
      return;
    }
    
    setIsSubmitting(true);
    
    // Call the onSubmit function passed from parent
    const success = onSubmit(content, imageFile || undefined);
    
    if (success) {
      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setShowEmojiPicker(false);
    }
    
    setIsSubmitting(false);
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-black p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex">
          {/* User Avatar */}
          <div className="flex-shrink-0 mr-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
              {connected ? (
                avatar ? (
                  <Image 
                    src={avatar} 
                    alt={username || 'User'} 
                    width={40} 
                    height={40} 
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {username?.[0] || walletAddress?.substring(0, 2)}
                  </div>
                )
              ) : (
                <div 
                  className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center cursor-pointer"
                  onClick={connectWallet}
                >
                  <span className="text-gray-500 dark:text-gray-400 text-xs">Connect</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Post Input & Media */}
          <div className="flex-grow">
            {connected && username && (
              <div className="flex items-center mb-2">
                <span className="font-bold text-sm text-black dark:text-white">{username}</span>
                <CheckBadgeIcon className="ml-1 h-4 w-4 text-[#1D9BF0]" />
              </div>
            )}

            <textarea
              placeholder={connected ? "What's happening?" : "Connect wallet to post"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!connected || isSubmitting}
              className="w-full bg-transparent text-black dark:text-white placeholder-gray-500 border-none outline-none resize-none mb-2 min-h-[80px] text-[18px]"
              maxLength={280}
            />
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative mb-4 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded-full"
                >
                  <FaTimes />
                </button>
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={500}
                  height={300}
                  className="w-full max-h-80 object-contain rounded-xl"
                />
              </div>
            )}
            
            {/* Action Bar */}
            <div className="flex justify-between items-center mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex space-x-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer ${twitterBlue}`}
                >
                  <FaImage />
                </label>
                <button
                  type="button"
                  className={`p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 ${twitterBlue}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <FaRegSmile />
                </button>
                <button
                  type="button"
                  className={`p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 ${twitterBlue}`}
                >
                  <FaMapMarkerAlt />
                </button>
              </div>
              
              {/* Character Count & Post Button */}
              <div className="flex items-center">
                {content.length > 0 && (
                  <div className="mr-3 text-sm">
                    <span className={content.length > 260 ? 'text-yellow-500' : 'text-gray-500'}>
                      {content.length}
                    </span>
                    <span className="text-gray-500">/280</span>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={(!content.trim() && !imageFile) || isSubmitting || !connected}
                  className={`px-5 py-2 rounded-full font-bold text-white ${
                    (!content.trim() && !imageFile) || isSubmitting || !connected
                      ? 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                      : `${twitterBlueBg} transition-colors`
                  }`}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostForm; 