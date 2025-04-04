import React from 'react';

const PostCardSkeleton: React.FC = () => {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black p-4 animate-pulse">
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
        
        <div className="flex-grow">
          {/* Author Header */}
          <div className="flex items-center mb-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="mx-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          
          {/* Username */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
          
          {/* Post Content */}
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
          
          {/* Media Placeholder */}
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3"></div>
          
          {/* Interaction Buttons */}
          <div className="flex justify-between mt-3">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCardSkeleton; 