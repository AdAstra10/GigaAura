import React, { useState } from 'react';
import Sidebar from './Sidebar'; // We will create/modify this next
import PostModal from './PostModal'; // We will create this later

interface LayoutProps {
  children: React.ReactNode;
  rightSidebarContent?: React.ReactNode; // Optional prop for right sidebar content
}

const Layout: React.FC<LayoutProps> = ({ children, rightSidebarContent }) => {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const openPostModal = () => setIsPostModalOpen(true);
  const closePostModal = () => setIsPostModalOpen(false);

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Pass the modal opener function to the Sidebar */}
      <Sidebar onOpenPostModal={openPostModal} />

      {/* Main Content Area */}
      <main className="flex-grow max-w-2xl xl:ml-[275px] border-l border-r border-gray-200 dark:border-gray-800">
        {/* Content from page props */}
        {children}
      </main>

      {/* Right Sidebar (Optional) */}
      {rightSidebarContent && (
        <aside className="hidden lg:block w-[350px] pl-8 pr-6 py-4">
          {rightSidebarContent}
        </aside>
      )}

      {/* Post Modal */}
      <PostModal isOpen={isPostModalOpen} onClose={closePostModal} />
    </div>
  );
};

export default Layout; 