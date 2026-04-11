// pages/ai_studio/LookerStudioPage.tsx
import React, { useState, useCallback } from 'react';
import { Card, Button, Input, EmptyState, ManagerEditorLayout } from '../../ui'; // Changed Page, Card, Button, Input, EmptyState
import { useAuth } from '../../contexts/AuthContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

const LookerStudioPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const [embedUrl, setEmbedUrl] = useState('');
  const [displayedUrl, setDisplayedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLoadReport = useCallback(() => {
    if (!embedUrl.trim()) {
      setError('Please enter a Looker Studio embed URL.');
      setDisplayedUrl('');
      return;
    }
    // Basic validation for embed URL format
    if (!embedUrl.startsWith('https://lookerstudio.google.com/embed/reporting/')) {
      setError('Invalid Looker Studio embed URL. Must start with "https://lookerstudio.google.com/embed/reporting/".');
      setDisplayedUrl('');
      return;
    }
    setDisplayedUrl(embedUrl);
    setError(null);
  }, [embedUrl]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Looker Studio Hub">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to view Looker Studio Reports"
            description="Connect your Google account to embed and view your Looker Studio reports."
            action={
              <Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>
                {isAuthActionInProgress ? 'Loading...' : 'Sign in with Google 🚀'}
              </Button>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Looker Studio Hub">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Embed and view your Google Looker Studio reports directly within the application.
      </p>

      <div className="grid grid-cols-1 gap-6">
        <Card title="Load Report">
          <div className="space-y-4">
            <Input
              label="Looker Studio Embed URL"
              type="url"
              value={embedUrl}
              onChange={e => setEmbedUrl(e.target.value)}
              placeholder="e.g., https://lookerstudio.google.com/embed/reporting/..."
              helperText="Paste the full embed URL from your Looker Studio report."
              required
              error={error || undefined}
            />
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleLoadReport}>
                Load Report 📊
              </Button>
            </div>
          </div>
        </Card>

        {displayedUrl ? (
          <Card title="Embedded Report" bodyClassName="p-0 h-[70vh]">
            <iframe
              src={displayedUrl}
              allowFullScreen
              seamless
              frameBorder="0"
              style={{ border: 0, width: '100%', height: '100%' }}
              title="Looker Studio Report"
              aria-label="Embedded Looker Studio Report"
            ></iframe>
          </Card>
        ) : (
          <EmptyState
            title="No Report Loaded"
            description="Enter a valid Looker Studio embed URL and click 'Load Report' to view it here."
          />
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default LookerStudioPage;