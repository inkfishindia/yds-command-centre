import React from 'react'

interface DemoModeBannerProps {
  onSignIn?: () => void
}

// Hidden for now — Google OAuth origin isn't configured for production.
// Most pages use the CC API directly and don't need Google sign-in.
const DemoModeBanner: React.FC<DemoModeBannerProps> = () => null

export default DemoModeBanner
