import React from 'react'
import { Button } from '../../ui'

interface DemoModeBannerProps {
  onSignIn: () => void
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onSignIn }) => {
  return (
    <div
      className="bg-[var(--color-brand-accent)]/20 border-l-4 border-[var(--color-brand-accent)] text-[var(--color-brand-accent-fg)] p-4 rounded-md mb-6 flex flex-col sm:flex-row justify-between items-center"
      role="alert"
    >
      <div className="text-center sm:text-left mb-3 sm:mb-0">
        <p className="font-bold">👀 Viewing in Demo Mode</p>
        <p className="text-sm">The data you see is for demonstration purposes. Your changes will not be saved.</p>
      </div>
      <Button onClick={onSignIn} variant="accent" size="sm" className="shrink-0">
        Sign In to Use Your Data 🚀
      </Button>
    </div>
  )
}

export default DemoModeBanner
