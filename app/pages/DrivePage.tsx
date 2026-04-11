import React from 'react'
import { Card, Button, EmptyState, ManagerEditorLayout } from '../ui'
import { useAuth } from '../contexts/AuthContext'
import { useDrive } from '../contexts/DriveContext'

const DrivePage: React.FC = () => {
  const { isSignedIn, userProfile, signIn, isAuthActionInProgress } = useAuth()
  const { files, loading, error, initialLoadComplete, loadFiles } = useDrive()

  const toolbar = isSignedIn ? (
    <Button onClick={() => loadFiles(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
      {loading ? 'Refreshing...' : 'Refresh Files 🔄'}
    </Button>
  ) : null

  return (
    <ManagerEditorLayout title="Google Drive Integration" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">A view of your recent files from your connected Google Drive.</p>

      {!isSignedIn ? (
        <Card title="Google Drive Access Required">
          <EmptyState
            title="Sign in with Google to view your Drive files"
            description="To securely access your Google Drive, please sign in and grant the necessary permissions."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>{isAuthActionInProgress ? 'Signing In...' : 'Sign in with Google 🚀'}</Button>}
          />
        </Card>
      ) : loading && !initialLoadComplete ? (
        <Card title={`Files for ${userProfile?.fullName || 'User'} 📂`}>
          <div className="text-center py-8 text-[var(--color-text-secondary)]">Loading files...</div>
        </Card>
      ) : error ? (
        <Card title={`Files for ${userProfile?.fullName || 'User'} 📂`}>
          <EmptyState
            title="Error loading Drive files"
            description={error}
            action={<Button onClick={() => loadFiles(true)} variant="primary" disabled={loading}>Try Again</Button>}
          />
        </Card>
      ) : initialLoadComplete && files.length === 0 ? (
        <Card title={`Files for ${userProfile?.fullName || 'User'} 📂`}>
          <EmptyState
            title="No recent files found"
            description="We couldn't find any recently modified files in your Google Drive."
          />
        </Card>
      ) : (
        <Card title={`Files for ${userProfile?.fullName || 'User'} 📂`}>
          <div className="space-y-4">
            {files.map((file) => (
              <a
                key={file.id}
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-[var(--color-border-primary)] rounded-[var(--radius-component)] bg-[var(--color-bg-stage)] hover:bg-opacity-80 transition-colors cursor-pointer flex items-center"
                aria-label={`Open file: ${file.name}`}
              >
                {file.iconLink && <img src={file.iconLink} alt="" className="w-5 h-5 mr-3" aria-hidden="true" />}
                <div>
                  <p className="font-bold text-[var(--color-text-primary)] text-sm">{file.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {file.mimeType} {file.modifiedTime ? `(Modified: ${new Date(file.modifiedTime).toLocaleDateString()})` : ''}
                  </p>
                </div>
                <span className="ml-auto text-xl text-[var(--color-text-secondary)]">🔗</span>
              </a>
            ))}
          </div>
        </Card>
      )}
    </ManagerEditorLayout>
  )
}

export default DrivePage