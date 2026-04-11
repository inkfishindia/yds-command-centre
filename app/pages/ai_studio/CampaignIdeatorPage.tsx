// pages/ai_studio/CampaignIdeatorPage.tsx
import React, { useState, useCallback } from 'react';
import { Card, Button, Textarea, EmptyState, ManagerEditorLayout } from '../../ui'; // Changed Page, Card, Button, EmptyState
import { useAuth } from '../../contexts/AuthContext';
import { useAITools } from '../../contexts/AIToolsContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';
import { CampaignChannel } from '../../types';

const CampaignIdeatorPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    campaignIdeas, loadingTextAI, textAIError,
    generateCampaignIdeas, clearTextAIResults,
  } = useAITools();

  const [productServiceDescription, setProductServiceDescription] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!productServiceDescription.trim()) {
      alert('Please enter a product or service description.');
      return;
    }
    await generateCampaignIdeas(productServiceDescription);
  }, [productServiceDescription, generateCampaignIdeas]);

  const getChannelEmoji = (channel: CampaignChannel) => {
    switch (channel) {
      case CampaignChannel.SOCIAL_MEDIA: return '📱';
      case CampaignChannel.EMAIL_MARKETING: return '✉️';
      case CampaignChannel.PAID_ADS: return '💸';
      case CampaignChannel.CONTENT_MARKETING: return '✍️';
      case CampaignChannel.PR: return '📰';
      case CampaignChannel.EVENTS: return '🎉';
      default: return '🌐';
    }
  };

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Campaign Ideator">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to use the AI Campaign Ideator"
            description="Connect your Google account to brainstorm innovative marketing campaign ideas."
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
    <ManagerEditorLayout title="Campaign Ideator">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Brainstorm innovative marketing campaign ideas for your products or services.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input/Controls Card */}
        <Card title="Inputs" className="h-fit">
          <div className="space-y-4">
            <Textarea
              label="Product or Service Description"
              value={productServiceDescription}
              onChange={e => setProductServiceDescription(e.target.value)}
              placeholder="e.g., A new line of sustainable, organic skincare products."
              rows={6}
              required
            />
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={clearTextAIResults} disabled={loadingTextAI}>Clear Results</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loadingTextAI || !productServiceDescription.trim()}
              >
                {loadingTextAI ? 'Generating...' : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Generate Ideas</>}
              </Button>
            </div>
          </div>
        </Card>

        {/* Output Card */}
        <Card title="AI Generated Campaign Ideas" className="h-full">
          {loadingTextAI && <div className="text-center py-10 text-[var(--color-text-secondary)]">Brainstorming campaign ideas...</div>}
          {textAIError && <EmptyState title="Error" description={textAIError} action={<Button onClick={handleGenerate}>Retry</Button>} />}
          {campaignIdeas && campaignIdeas.length > 0 ? (
            <div className="space-y-8">
              {campaignIdeas.map((idea) => (
                <div key={idea.id} className="p-4 bg-[var(--color-bg-stage)] rounded-md shadow-sm">
                  <h3 className="text-xl font-bold text-[var(--color-brand-primary)] mb-2">{idea.name}</h3>
                  <p className="text-[var(--color-text-primary)] mb-3">{idea.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {idea.channels.map((channel, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-tag-blue-bg)] text-[var(--color-tag-blue-text)]">
                        {getChannelEmoji(channel)} {channel}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loadingTextAI && !textAIError && <EmptyState title="No Results Yet" description="Enter a product or service description, then click 'Generate Ideas'." />
          )}
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default CampaignIdeatorPage;