import React from 'react'

interface ComingSoonPageProps {
  title: string
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title }) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--color-brand-primary)] mb-4">{title}</h1>
        <p className="text-xl text-[var(--color-text-primary)]">This feature is currently under construction.</p>
        <p className="text-[var(--color-text-secondary)] mt-2">Check back soon for updates!</p>
      </div>
    </div>
  )
}

export default ComingSoonPage
