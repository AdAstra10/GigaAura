import React from 'react';

const RightSidebar: React.FC = () => {
  return (
    <div className="p-4">
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 mb-4">
        <h3 className="font-bold text-lg mb-2">Trending</h3>
        <div className="space-y-3">
          <div className="text-sm">
            <p className="text-gray-500">Cryptocurrency</p>
            <p className="font-medium">#Bitcoin</p>
            <p className="text-gray-500">42.8K posts</p>
          </div>
          <div className="text-sm">
            <p className="text-gray-500">Technology</p>
            <p className="font-medium">#Web3</p>
            <p className="text-gray-500">18.2K posts</p>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
        <h3 className="font-bold text-lg mb-2">Who to follow</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-400 rounded-full mr-3"></div>
            <div className="flex-grow">
              <p className="font-medium">GigaAura Official</p>
              <p className="text-gray-500 text-sm">@gigaAura</p>
            </div>
            <button className="bg-black dark:bg-white text-white dark:text-black px-4 py-1 rounded-full text-sm font-bold">
              Follow
            </button>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-400 rounded-full mr-3"></div>
            <div className="flex-grow">
              <p className="font-medium">Web3 News</p>
              <p className="text-gray-500 text-sm">@web3news</p>
            </div>
            <button className="bg-black dark:bg-white text-white dark:text-black px-4 py-1 rounded-full text-sm font-bold">
              Follow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar; 