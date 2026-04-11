import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Header from '../organisms/Header'
import { NavMainItem } from '../../navigation'
import Drawer from '../molecules/Drawer' // Import Drawer
import ChatDrawer from '../organisms/ChatDrawer'
import { useChat } from '../../contexts/ChatContext'

interface AppShellProps {
  children: React.ReactNode
  mainNavItems: NavMainItem[]
  activeMainId: string
  onNavigate: (pageId: string) => void
  isSidebarCollapsed: boolean // This now specifically refers to the desktop sidebar state
  onToggleSidebar: () => void // This now specifically refers to the desktop sidebar toggle
}

const AppShell: React.FC<AppShellProps> = ({ children, mainNavItems, activeMainId, onNavigate, isSidebarCollapsed, onToggleSidebar }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isChatOpen, closeChat, toggleChat, messages, sendMessage, clearMessages, isLoading } = useChat();

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleMobileNavigate = (pageId: string) => {
    onNavigate(pageId);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex"> {/* Hidden on small screens */}
        <Sidebar
          mainNavItems={mainNavItems}
          activeMainId={activeMainId}
          onNavigate={onNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggle={onToggleSidebar}
        />
      </div>

      {/* Mobile Drawer (containing Sidebar content) */}
      <Drawer
        open={isMobileMenuOpen}
        onClose={handleToggleMobileMenu}
        side="left"
        width={250} // Adjust width as needed for mobile
        title="Navigation"
      >
        <Sidebar
          mainNavItems={mainNavItems}
          activeMainId={activeMainId}
          onNavigate={handleMobileNavigate} // Use mobile-specific navigation handler
          isCollapsed={false} // Mobile drawer is typically not collapsible within itself
          onToggle={() => {}} // No internal toggle for mobile drawer sidebar
        />
      </Drawer>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleMobileMenu={handleToggleMobileMenu} 
          onToggleChat={toggleChat}
        /> {/* Pass toggle function to Header */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--color-bg-stage)]">
          {children}
        </main>
      </div>

      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={closeChat}
        messages={messages}
        onSendMessage={sendMessage}
        onClearMessages={clearMessages}
        isLoading={isLoading}
      />
    </div>
  )
}

export default AppShell
