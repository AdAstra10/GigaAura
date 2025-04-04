import React, { useState, useRef, ChangeEvent, FormEvent, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { FaCamera, FaVideo, FaRegSmile, FaPoll, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { IoMdImages } from 'react-icons/io';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { PhotoIcon, VideoCameraIcon, FaceSmileIcon, MapPinIcon, GifIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// Import the emoji picker dynamically to avoid SSR issues
import dynamic from 'next/dynamic';
const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const MAX_CONTENT_LENGTH = 280;

interface CreatePostFormProps {
  onSubmit: (post: any) => void;
  placeholder?: string;
}

const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
};

const CreatePostForm: React.FC<CreatePostFormProps> = ({
  onSubmit,
  placeholder = "What's happening?",
}) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Get wallet info
  const { connectWallet, connected } = useWallet();
  const { walletAddress, username, avatar } = useSelector((state: RootState) => state.user);

  const handleTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CONTENT_LENGTH) {
      setContent(value);
      // Auto-resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setContent((prevContent) => prevContent + emojiData.emoji);
    setShowEmojiPicker(false);
    if (contentRef.current) {
      contentRef.current.focus();
    }
  };

  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
    setMediaFile(file);

    // Determine media type
    if (file.type.startsWith('image/')) {
      setMediaType('image');
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
    } else {
      toast.error('Unsupported file type');
      resetMedia();
    }
  };

  const resetMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Check if the user is connected
    if (!connected) {
      const confirm = window.confirm('Please connect your wallet to post. Would you like to connect now?');
      if (confirm) {
        await connectWallet();
        // If still not connected after trying, return
        if (!connected) return;
      } else {
        return;
      }
    }

    // Validate input - either content or media must be present
    const trimmedContent = content.trim();
    if (!trimmedContent && !mediaFile) {
      toast.error('Please enter text or upload media');
      return;
    }

    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Generate a unique ID for the post
      const postId = uuidv4();

      let mediaUrl = '';

      // Handle media upload
      if (mediaFile) {
        // Create a FormData instance for the file upload
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', 'gigaaura_uploads'); // Configure on Cloudinary

        try {
          // Upload to Cloudinary directly
          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${
              process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
            }/${mediaType === 'video' ? 'video' : 'image'}/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.statusText}`);
          }

          const uploadData = await uploadRes.json();
          mediaUrl = uploadData.secure_url;
        } catch (uploadError) {
          console.error('Media upload error:', uploadError);
          toast.error('Failed to upload media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Construct post object
      const newPost = {
        id: postId,
        content: trimmedContent,
        authorWallet: walletAddress,
        authorUsername: username,
        authorAvatar: avatar || '/assets/avatars/default-avatar.png',
        createdAt: new Date().toISOString(),
        mediaUrl: mediaUrl || null,
        mediaType: mediaFile ? mediaType : null,
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
        commentsList: [],
        sharedBy: [],
        bookmarkedBy: [],
      };

      // Call API to save post
      try {
        // Make API call to create post
        const response = await axios.post(`${getApiBaseUrl()}/api/posts`, newPost);
        if (response.status !== 201) {
          throw new Error('Failed to create post');
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        // Continue with local storage fallback if API fails
      }

      // Call onSubmit callback
      onSubmit(newPost);

      // Reset form
      setContent('');
      resetMedia();
      
      // Show success toast
      toast.success('Post created successfully!');
      
      // If textarea was resized, reset it
      if (contentRef.current) {
        contentRef.current.style.height = 'auto';
      }
      
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Character counter color logic
  const getCharCounterColor = () => {
    const charsLeft = MAX_CONTENT_LENGTH - content.length;
    if (charsLeft <= 20) return 'text-red-500';
    if (charsLeft <= 40) return 'text-yellow-500';
    return 'text-gray-400';
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
      <div className="flex">
        {/* User Avatar */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800">
            {connected ? (
              <Image
                src={avatar || '/assets/avatars/default-avatar.png'}
                alt={username || 'User'}
                width={48}
                height={48}
                className="object-cover h-full w-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                ?
              </div>
            )}
          </div>
        </div>

        {/* Post Form */}
        <div className="flex-grow">
          <form onSubmit={handleSubmit}>
            {/* Text Input */}
            <div className="mb-3">
              <textarea
                ref={contentRef}
                placeholder={connected ? placeholder : "Connect wallet to post"}
                value={content}
                onChange={handleTextAreaChange}
                className="w-full border-0 focus:ring-0 text-lg bg-transparent placeholder-gray-400 text-black dark:text-white resize-none min-h-[60px]"
                disabled={!connected || isSubmitting}
                rows={2}
                autoComplete="off"
              />
            </div>

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full z-10 hover:bg-black/90 transition-colors"
                  onClick={resetMedia}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                {mediaType === 'image' ? (
                  <div className="h-64 w-full relative">
                    <Image
                      src={mediaPreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-64 object-contain bg-black"
                  />
                ) : null}
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute z-10 mt-2"
                style={{ transform: 'scale(0.8)', transformOrigin: 'bottom left' }}
              >
                <Picker onEmojiClick={handleEmojiClick} />
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {/* Media Upload */}
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  onChange={handleMediaUpload}
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={!connected || isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!connected || isSubmitting}
                  className="text-[#1D9BF0] p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label="Add media"
                >
                  <PhotoIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="text-[#1D9BF0] p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label="Add GIF"
                  disabled={!connected || isSubmitting}
                >
                  <GifIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="text-[#1D9BF0] p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label="Add poll"
                  disabled={!connected || isSubmitting}
                >
                  <ChartBarIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-[#1D9BF0] p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label="Add emoji"
                  disabled={!connected || isSubmitting}
                >
                  <FaceSmileIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="text-[#1D9BF0] p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label="Add location"
                  disabled={!connected || isSubmitting}
                >
                  <MapPinIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* Character Counter */}
                {content.length > 0 && (
                  <div className={`text-sm ${getCharCounterColor()}`}>
                    {MAX_CONTENT_LENGTH - content.length}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-full font-medium ${
                    (!connected || (!content.trim() && !mediaFile) || isSubmitting)
                      ? 'bg-blue-300 text-white cursor-not-allowed'
                      : 'bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white'
                  }`}
                  disabled={!connected || (!content.trim() && !mediaFile) || isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePostForm; 