import React, { useState } from 'react';
import Sidebar from './Sidebar';
import PostModal from './PostModal';
import Header from './Header'; // Import the updated Header
import MobileSidebar from './MobileSidebar'; // Import the new MobileSidebar

interface LayoutProps {
  children: React.ReactNode;
  rightSidebarContent?: React.ReactNode; // Optional prop for right sidebar content
}

const Layout: React.FC<LayoutProps> = ({ children, rightSidebarContent }) => {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // State for mobile sidebar

  const openPostModal = () => setIsPostModalOpen(true);
  const closePostModal = () => setIsPostModalOpen(false);

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Desktop Sidebar */}
      <Sidebar onOpenPostModal={openPostModal} />

      {/* Mobile Sidebar (conditionally rendered based on state) */}
      <MobileSidebar isOpen={isMobileSidebarOpen} onClose={closeMobileSidebar} />

      {/* Main Content Area Wrapper (includes Header and Page Content) */}
      <div className="flex flex-col flex-grow">
        {/* Sticky Header */}
        <Header onToggleMobileSidebar={toggleMobileSidebar} />

        {/* Main Content Grid - Add padding-top here to account for header height (h-14) */}
        <div className="flex flex-grow max-w-6xl mx-auto w-full pt-14">
            {/* Main Content Column (Takes children) */}
           <main className="flex-grow w-full max-w-2xl border-l border-r border-gray-200 dark:border-gray-800">
               {children}
           </main>

          {/* Right Sidebar (Optional) */}
          {rightSidebarContent && (
            <aside className="hidden lg:block w-[350px] pl-8 pr-6 py-4">
                {rightSidebarContent}
            </aside>
          )}
        </div>
      </div>

      {/* Post Modal */}
      <PostModal isOpen={isPostModalOpen} onClose={closePostModal} />
    </div>
  );
};

export default Layout; 