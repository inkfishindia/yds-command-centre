import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Button, Switch } from '../index'

interface HeaderProps {
  onToggleMobileMenu?: () => void; // New prop for mobile menu toggle
  onToggleChat?: () => void; // New prop for chat toggle
}

const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onToggleChat }) => {
  const { isSignedIn, signOut, userProfile, signIn, isAuthActionInProgress } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-surface)] shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Mobile Menu Button - Visible only on small screens */}
        {onToggleMobileMenu && (
          <Button
            onClick={onToggleMobileMenu}
            variant="secondary"
            size="sm"
            className="lg:hidden !p-2 text-xl" // Responsive: hidden on lg and up, smaller padding
            aria-label="Open navigation menu"
          >
            ☰
          </Button>
        )}
        <h1 className="text-xl font-bold whitespace-nowrap">Your Design Lab</h1>
        <span className="text-[var(--color-text-secondary)] text-sm hidden sm:block whitespace-nowrap">ERP Platform</span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {onToggleChat && (
          <Button 
            onClick={onToggleChat} 
            variant="secondary" 
            size="sm"
            className="flex items-center gap-2"
          >
            <span role="img" aria-label="ai">✨</span>
            <span className="hidden sm:inline">Nexus AI</span>
          </Button>
        )}
        <Switch checked={theme === 'dark'} onChange={toggleTheme} label="Dark Mode" />
        {isSignedIn && userProfile ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-[var(--color-text-secondary)] hidden md:block">{userProfile.fullName}</span>
            {userProfile.picture && (
              <img src={userProfile.picture} alt="User Avatar" className="w-8 h-8 rounded-full" />
            )}
            <Button onClick={signOut} variant="secondary" size="sm">Sign Out</Button>
          </div>
        ) : (
          <Button onClick={signIn} variant="primary" size="sm" disabled={isAuthActionInProgress}>Sign In</Button>
        )}
      </div>
    </header>
  )
}

export default Header