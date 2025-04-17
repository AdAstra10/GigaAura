import React, { useState, useRef, FormEvent, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { useWallet } from '../contexts/WalletContext';
import Image from 'next/image';
import { PhotoIcon, FaceSmileIcon, MapPinIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamic import for Emoji Picker
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface CreatePostFormProps {
  onSubmit: (content: string, mediaFile?: File) => Promise<boolean> | boolean; // Allow async onSubmit
  className?: string; // Allow passing additional classes
  isModal?: boolean; // Indicate if used in modal for slight style changes
}

interface EmojiData {
   emoji: string;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSubmit, className = '', isModal = false }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false); // Track focus state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for textarea
  const emojiPickerRef = useRef<HTMLDivElement>(null); // Ref for emoji picker container
  const { connected, connectWallet, walletAddress } = useWallet();
  const { username, avatar } = useSelector((state: RootState) => state.user);
  
  // Twitter Blue styling
  const twitterBlue = "text-[#1D9BF0] dark:text-[#1D9BF0]";
  const twitterBlueBg = "bg-[#1D9BF0] hover:bg-[#1A8CD8]";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      // Clear the input value so the same file can be selected again
      e.target.value = ''; 
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) {
      toast.error('Post cannot be empty');
      return;
    }
    if (!connected) {
      toast.error('Connect wallet to post');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(content, imageFile || undefined);
      if (success) {
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setShowEmojiPicker(false);
        if (textAreaRef.current) { // Reset textarea height
          textAreaRef.current.style.height = 'auto'; 
         }
       }
     } catch (error) {
       console.error("Error submitting post:", error);
       // Toast error handled in onSubmit usually
     } finally {
       setIsSubmitting(false);
     }
   };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  const handleEmojiClick = (emojiData: EmojiData) => {
     if (textAreaRef.current) {
       const { selectionStart, selectionEnd } = textAreaRef.current;
       setContent(
         content.substring(0, selectionStart) + emojiData.emoji + content.substring(selectionEnd)
       );
       // Move cursor after inserted emoji
       // Use setTimeout to ensure state update is processed before setting cursor
       setTimeout(() => {
         if (textAreaRef.current) {
           textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = selectionStart + emojiData.emoji.length;
           textAreaRef.current.focus();
         }
       }, 0);
     }
     setShowEmojiPicker(false); // Close picker after selection
   };

   // Auto-resize textarea
   useEffect(() => {
     if (textAreaRef.current) {
       textAreaRef.current.style.height = 'auto'; // Reset height
       textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
     }
   }, [content]);

   // Close emoji picker when clicking outside
   useEffect(() => {
     function handleClickOutside(event: MouseEvent) {
       if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
         setShowEmojiPicker(false);
       }
     }
     document.addEventListener('mousedown', handleClickOutside);
     return () => {
       document.removeEventListener('mousedown', handleClickOutside);
     };
   }, [emojiPickerRef]);

   const characterLimit = 280;
   const charactersLeft = characterLimit - content.length;
   const progress = (content.length / characterLimit) * 100;
   const progressColor = charactersLeft < 0 ? '#ef4444' : (charactersLeft < 20 ? '#f59e0b' : '#3b82f6');

   return (
     <div className={`flex space-x-3 p-3 ${!isModal ? 'border-b border-gray-200 dark:border-gray-800' : ''} ${className}`}>
       {/* User Avatar */} 
       <div className="flex-shrink-0">
         {connected ? (
           <Image 
             src={avatar || '/default-avatar.png'} 
             alt={username || 'User Avatar'} 
             width={40} 
             height={40} 
             className="rounded-full object-cover"
           />
         ) : (
           <div 
             className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center cursor-pointer hover:opacity-80"
             onClick={connectWallet}
             title="Connect Wallet"
           >
             <span className="text-gray-500 dark:text-gray-400 text-2xl">?</span>
           </div>
         )}
       </div>

      {/* Form Content */} 
      <div className="flex-1">
        <form onSubmit={handleSubmit}>
          <textarea
            ref={textAreaRef}
            placeholder={connected ? "What's happening?!" : "Connect wallet to post"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            // onBlur={() => setIsFocused(false)} // Keep actions visible while emoji picker is open
            disabled={!connected || isSubmitting}
            className="w-full bg-transparent text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-600 outline-none resize-none text-lg overflow-hidden min-h-[28px] mt-1"
            rows={1} // Start with 1 row, auto-expands
            maxLength={characterLimit + 20} // Allow slight overtyping to show error
          />

          {imagePreview && (
            <div className="relative mt-2 mb-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-h-80">
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1.5 right-1.5 bg-black bg-opacity-60 text-white p-1 rounded-full z-10 hover:bg-opacity-80"
                aria-label="Remove image"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              <Image
                src={imagePreview}
                alt="Selected media preview"
                width={500} // Intrinsic width for layout calculation
                height={300} // Intrinsic height
                style={{ width: '100%', height: 'auto', maxHeight: '320px' }} // Responsive styling
                className="object-contain"
              />
            </div>
          )}

          {/* Action Bar (Divider, Icons, Button) */} 
          {isFocused || content || imagePreview ? ( // Show actions when focused or has content
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1 text-primary relative"> 
                {/* Image Upload */}
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleImageUpload}
                   ref={fileInputRef}
                   className="hidden"
                   id={`image-upload-${isModal ? 'modal' : 'feed'}`}
                   disabled={isSubmitting || !connected}
                 />
                 <label
                   htmlFor={`image-upload-${isModal ? 'modal' : 'feed'}`}
                   className={`p-1.5 rounded-full hover:bg-primary/10 cursor-pointer ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                   title="Media"
                 >
                   <PhotoIcon className="h-5 w-5" />
                 </label>
                 {/* Emoji Button */}
                 <button
                   type="button"
                   onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                   className={`p-1.5 rounded-full hover:bg-primary/10 ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                   disabled={isSubmitting || !connected}
                   title="Emoji"
                 >
                   <FaceSmileIcon className="h-5 w-5" />
                 </button>
                 {/* Other Icons (Placeholder) */}
                 <button type="button" className="p-1.5 rounded-full hover:bg-primary/10 opacity-50 cursor-not-allowed" title="Location (coming soon)" disabled>
                   <MapPinIcon className="h-5 w-5" />
                 </button>
                 <button type="button" className="p-1.5 rounded-full hover:bg-primary/10 opacity-50 cursor-not-allowed" title="Schedule (coming soon)" disabled>
                   <CalendarIcon className="h-5 w-5" />
                 </button>

                {/* Emoji Picker Popover */} 
                 {showEmojiPicker && (
                   <div ref={emojiPickerRef} className="absolute top-full left-0 mt-1 z-20">
                     <EmojiPicker 
                       onEmojiClick={handleEmojiClick} 
                       height={350}
                       width={300}
                       // theme={isDarkMode ? 'dark' : 'light'} // Needs useDarkMode context if applied here
                      />
                   </div>
                 )}
               </div>

              {/* Character Count & Submit Button */} 
              <div className="flex items-center space-x-2">
                 {/* Circular Progress for Character Count */}
                 {content.length > 0 && (
                   <div className="relative w-6 h-6">
                     <svg className="w-full h-full" viewBox="0 0 36 36">
                       <path
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke="#e5e7eb" // Light gray background circle
                         strokeWidth="2"
                       />
                       <path
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke={progressColor} // Dynamic progress color
                         strokeWidth="2"
                         strokeDasharray={`${progress}, 100`}
                         transform="rotate(-90 18 18)"
                       />
                     </svg>
                     {charactersLeft < 20 && (
                       <span className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${charactersLeft < 0 ? 'text-red-500' : 'text-yellow-500'}`}>
                         {charactersLeft < 0 ? `-${Math.abs(charactersLeft)}` : charactersLeft}
                       </span>
                     )}
                   </div>
                 )}

                <button
                  type="submit"
                  disabled={(!content.trim() && !imageFile) || isSubmitting || !connected}
                  className="px-4 py-1.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          ) : null} 
        </form>
       </div>
     </div>
   );
};

export default CreatePostForm; 