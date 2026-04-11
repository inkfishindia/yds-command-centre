import React from 'react';
import { ManagerEditorLayout, Card, Button, EmptyState, Table } from '../ui'; // FIX: Updated imports to use ui barrel
import { useAuth } from '../contexts/AuthContext';
import DemoModeBanner from '../components/layout/DemoModeBanner';

interface MockPageProps {
  title: string;
}

const MockPage: React.FC<MockPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sign-in Required">
          <EmptyState
            title={`Please sign in to view ${title}`}
            description={`Connect your Google account to access this feature.`}
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
    <ManagerEditorLayout title={title}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        This is a mock-up view for the "{title}" module. Full functionality is currently under development.
      </p>
      <Card title="Sample Data">
        <Table headers={['ID', 'Name', 'Status', 'Last Updated']}>
          <tr>
            <td className="px-6 py-3">MOCK-001</td>
            <td className="px-6 py-3">Sample Item One</td>
            <td className="px-6 py-3">Active</td>
            <td className="px-6 py-3">{new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <td className="px-6 py-3">MOCK-002</td>
            <td className="px-6 py-3">Sample Item Two</td>
            <td className="px-6 py-3">Pending</td>
            <td className="px-6 py-3">{new Date(Date.now() - 86400000).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td className="px-6 py-3">MOCK-003</td>
            <td className="px-6 py-3">Sample Item Three</td>
            <td className="px-6 py-3">Archived</td>
            <td className="px-6 py-3">{new Date(Date.now() - 86400000 * 2).toLocaleDateString()}</td>
          </tr>
        </Table>
        <div className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          This table contains placeholder data to illustrate the feature's appearance.
        </div>
      </Card>
    </ManagerEditorLayout>
  );
};

export default MockPage;