import React, { useState, useRef } from 'react';
import { FaRegSmile, FaImage, FaTimes } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import toast from 'react-hot-toast';

// Import the emoji picker dynamically to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

// Define prop types for better type safety
interface CreatePostFormProps {
  onSubmit: (content: string, mediaFile?: File) => boolean;
  placeholder?: string;
  buttonText?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function CreatePostForm({
  onSubmit,
  placeholder = "What's on your mind?",
  buttonText = "Post",
  autoFocus = false,
  className = "",
}: CreatePostFormProps) {
  const { walletAddress, username, avatar } = useSelector((state: RootState) => state.user);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow empty posts
    if (!content.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }
    
    // Don't allow posts if not connected
    if (!walletAddress) {
      toast.error('Please connect your wallet to create a post');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Call the onSubmit prop function with the content and image
      const success = onSubmit(content, image || undefined);
      
      if (success) {
        // Reset form on success
        setContent('');
        setImage(null);
        setImagePreview(null);
        setShowEmojiPicker(false);
        
        // Focus the textarea
        textAreaRef.current?.focus();
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      toast.error('Error creating post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObject: any) => {
    setContent((prevContent) => prevContent + emojiObject.emoji);
    // Focus back to textarea after selecting emoji
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }, 0);
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle removing the image
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-start mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
            <Image
              src={avatar || '/assets/avatars/default.png'}
              alt="User Avatar"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          
          <textarea
            ref={textAreaRef}
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white resize-none"
            placeholder={placeholder}
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus={autoFocus}
          />
        </div>
        
        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-3 w-full">
            <div className="max-h-60 w-full rounded-lg overflow-hidden">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white rounded-full p-1"
            >
              <FaTimes />
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FaImage />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FaRegSmile />
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-10">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting || !walletAddress}
            className={`px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? 'opacity-70' : ''}`}
          >
            {isSubmitting ? 'Posting...' : buttonText}
          </button>
        </div>
      </form>
    </div>
  );
} 