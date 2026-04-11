import React, { useState } from 'react';
import DashboardContent from '../../components/dashboard/DashboardContent'; // Corrected to default import
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import { Button, Drawer } from '../index'; // Updated import to include Drawer

interface DashboardLayoutProps {
  // No specific props needed for this layout itself, content is fixed
}

const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed for mobile-first

  return (
    <div className="flex h-full w-full relative"> {/* Relative for absolute positioning of toggle */}
      {/* Main content area */}
      <div className={`flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 ${isSidebarOpen ? 'lg:pr-0' : ''}`}> {/* Adjusted padding for main content */}
        <DashboardContent />
      </div>

      {/* Desktop Sidebar (inline, visible on lg and up) */}
      <div
        id="dashboard-sidebar-desktop"
        className={`hidden lg:block h-full overflow-hidden shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80 pl-6' : 'w-0'}`}
        aria-hidden={!isSidebarOpen}
      >
        <DashboardSidebar isOpen={isSidebarOpen} />
      </div>

      {/* Mobile Sidebar (Drawer, visible below lg) */}
      <Drawer
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        side="right"
        width="85vw" // Takes 85% of viewport width on mobile
        title="Dashboard Insights"
        disableOverlay={false}
      >
        <DashboardSidebar isOpen={true} /> {/* Always render content inside the open drawer */}
      </Drawer>

      {/* Toggle button - floating on mobile, fixed-to-content on desktop */}
      <Button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`
          fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg
          lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-0 lg:p-1 lg:rounded-full
          bg-[var(--color-brand-primary)] text-[var(--color-brand-primary-fg)]
          hover:bg-opacity-90 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'lg:right-0 lg:rotate-180' : 'lg:right-0'}
        `}
        variant="primary" // Ensure good visibility on mobile
        title={isSidebarOpen ? 'Close Dashboard Sidebar' : 'Open Dashboard Sidebar'}
        aria-controls={isSidebarOpen ? 'dashboard-sidebar-mobile' : 'dashboard-sidebar-desktop'}
        aria-expanded={isSidebarOpen}
      >
        {isSidebarOpen ? '→' : '←'}
      </Button>
    </div>
  );
};

export default DashboardLayout;