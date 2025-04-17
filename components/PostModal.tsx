import React from 'react';
import CreatePostForm from './CreatePostForm';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PostModal: React.FC<PostModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-lg relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-2xl"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Create Post</h2>
        <CreatePostForm onSubmit={(content, mediaFile) => {
          console.log('Submitting post from modal...', content, mediaFile);
          // TODO: Add actual submission logic reuse here if needed, 
          // CreatePostForm might handle it via Redux dispatch already
          // Ensure it closes the modal on success
          onClose(); // Close modal for now
          return true; // Return true for form reset
        }} />
      </div>
    </div>
  );
};

export default PostModal; 