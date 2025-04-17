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

        {/* Main Content Grid */}
        <div className="flex flex-grow max-w-6xl mx-auto w-full">
            {/* Main Content Column (Takes children) */}
           <main className="flex-grow w-full max-w-2xl border-l border-r border-gray-200 dark:border-gray-800">
             {/* Add padding-top to account for header height (h-14 = 3.5rem) */}
             {/* <div className="pt-14"> Removed pt here, header sits above this now */}
               {children}
             {/* </div> */}
           </main>

          {/* Right Sidebar (Optional) */}
          {rightSidebarContent && (
            <aside className="hidden lg:block w-[350px] pl-8 pr-6 py-4">
              {/* Add padding-top to account for header height */} 
              {/* <div className="pt-14"> Removed pt here, header sits above this now */}
                {rightSidebarContent}
              {/* </div> */}
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