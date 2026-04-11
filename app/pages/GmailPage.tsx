import React from 'react'
import { Card, Button, EmptyState, ManagerEditorLayout } from '../ui'
import { useAuth } from '../contexts/AuthContext'
import { useGmail } from '../contexts/GmailContext'

const GmailPage: React.FC = () => {
  const { isSignedIn, userProfile, signIn, isAuthActionInProgress } = useAuth()
  const { emails, loading, error, initialLoadComplete, loadEmails } = useGmail()

  const toolbar = isSignedIn ? (
    <Button onClick={() => loadEmails(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
      {loading ? 'Refreshing...' : 'Refresh Emails 🔄'}
    </Button>
  ) : null


  return (
    <ManagerEditorLayout title="Gmail Integration" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">A view of your recent emails from your connected Google account.</p>

      {!isSignedIn ? (
        <Card title="Gmail Access Required">
          <EmptyState
            title="Sign in with Google to view your emails"
            description="To securely access your Gmail, please sign in and grant the necessary permissions."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>{isAuthActionInProgress ? 'Signing In...' : 'Sign in with Google 🚀'}</Button>}
          />
        </Card>
      ) : loading && !initialLoadComplete ? (
        <Card title={`Inbox for ${userProfile?.fullName || 'User'} ✉️`}>
          <div className="text-center py-8 text-[var(--color-text-secondary)]">Loading emails...</div>
        </Card>
      ) : error ? (
        <Card title={`Inbox for ${userProfile?.fullName || 'User'} ✉️`}>
          <EmptyState
            title="Error loading emails"
            description={error}
            action={<Button onClick={() => loadEmails(true)} variant="primary" disabled={loading}>Try Again</Button>}
          />
        </Card>
      ) : initialLoadComplete && emails.length === 0 ? (
        <Card title={`Inbox for ${userProfile?.fullName || 'User'} ✉️`}>
          <EmptyState
            title="No emails found"
            description="Your inbox appears to be empty or we couldn't fetch any messages."
          />
        </Card>
      ) : (
        <Card title={`Inbox for ${userProfile?.fullName || 'User'} ✉️`}>
          <div className="space-y-4">
            {emails.map((email) => (
              <div key={email.id} className="p-4 border border-[var(--color-border-primary)] rounded-[var(--radius-component)] bg-[var(--color-bg-stage)] hover:bg-opacity-80 transition-colors cursor-pointer"
                aria-label={`Email from ${email.sender} with subject ${email.subject}`}>
                <p className="text-xs text-[var(--color-text-secondary)]">{email.date ? new Date(email.date).toLocaleString() : ''}</p>
                <p className="font-semibold text-[var(--color-brand-primary)] text-sm">{email.sender}</p>
                <p className="font-bold text-[var(--color-text-primary)] mb-1">{email.subject}</p>
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{email.snippet}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </ManagerEditorLayout>
  )
}

export default GmailPage