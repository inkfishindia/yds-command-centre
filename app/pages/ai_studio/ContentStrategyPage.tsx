
import React, { useState, useCallback } from 'react';
import { Card, Button, Textarea, EmptyState, ManagerEditorLayout, MarkdownOutput } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useAITools } from '../../contexts/AIToolsContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

const ContentStrategyPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    contentStrategy, loadingTextAI, textAIError,
    generateContentStrategy, clearTextAIResults,
  } = useAITools();

  const [campaignBrief, setCampaignBrief] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!campaignBrief.trim() || !targetAudience.trim()) {
      alert('Please fill in both the campaign brief and target audience.');
      return;
    }
    await generateContentStrategy(campaignBrief, targetAudience);
  }, [campaignBrief, targetAudience, generateContentStrategy]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Content Strategy Generator">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to use the AI Content Strategy Generator"
            description="Connect your Google account to leverage AI for comprehensive content planning."
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
    <ManagerEditorLayout title="Content Strategy Generator">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Develop comprehensive content strategies, including social ideas, editorial themes, and multi-channel plans.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input/Controls Card */}
        <Card title="Strategy Inputs" className="h-fit">
          <div className="space-y-4">
            <Textarea
              label="Campaign Brief"
              value={campaignBrief}
              onChange={e => setCampaignBrief(e.target.value)}
              placeholder="Describe the campaign goal, key products, and core offer..."
              rows={6}
              required
            />
            <Textarea
              label="Target Audience Description"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="Who are we talking to? List demographics, pain points, and interests..."
              rows={4}
              required
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" onClick={clearTextAIResults} disabled={loadingTextAI}>Clear Results</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loadingTextAI || !campaignBrief.trim() || !targetAudience.trim()}
              >
                {loadingTextAI ? 'Generating...' : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Generate Full Strategy</>}
              </Button>
            </div>
          </div>
        </Card>

        {/* Output Card */}
        <Card title="AI Intelligence Output" className="h-full">
          {loadingTextAI && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[var(--color-text-secondary)] font-medium">Architecting your content ecosystem...</p>
            </div>
          )}
          
          {textAIError && (
            <EmptyState 
              title="Generation Failed" 
              description={textAIError} 
              action={<Button onClick={handleGenerate}>Retry</Button>} 
            />
          )}

          {contentStrategy ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📱</span>
                  <h3 className="text-lg font-bold text-[var(--color-brand-primary)] uppercase tracking-tight">Social Posting Ideas</h3>
                </div>
                {contentStrategy.socialPostingIdeas.length > 0 ? (
                  <ul className="space-y-2">
                    {contentStrategy.socialPostingIdeas.map((idea, index) => (
                      <li key={index} className="p-3 bg-[var(--color-bg-stage)] rounded-md border-l-4 border-[var(--color-brand-accent)] text-sm font-medium">
                        {idea}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--color-text-secondary)] italic text-sm">No specific social ideas found.</p>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🗓️</span>
                  <h3 className="text-lg font-bold text-[var(--color-brand-primary)] uppercase tracking-tight">Editorial Themes</h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {contentStrategy.editorialCalendarThemes.map((theme, index) => (
                    <div key={index} className="px-3 py-2 bg-[var(--color-tag-blue-bg)] text-[var(--color-tag-blue-text)] rounded text-sm font-bold">
                      {theme}
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-[var(--color-border-primary)] pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📡</span>
                  <h3 className="text-lg font-bold text-[var(--color-brand-primary)] uppercase tracking-tight">Multi-channel Distribution</h3>
                </div>
                <div className="bg-[var(--color-bg-stage)] p-4 rounded-lg">
                  <MarkdownOutput content={contentStrategy.multiChannelStrategy} />
                </div>
              </section>

              <section className="border-t border-[var(--color-border-primary)] pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📖</span>
                  <h3 className="text-lg font-bold text-[var(--color-brand-primary)] uppercase tracking-tight">Core Brand Storytelling</h3>
                </div>
                <div className="bg-[var(--color-bg-stage)] p-4 rounded-lg border border-[var(--color-brand-accent)]/20">
                  <MarkdownOutput content={contentStrategy.coreBrandStorytelling} />
                </div>
              </section>
            </div>
          ) : (
            !loadingTextAI && !textAIError && (
              <EmptyState 
                title="Strategy Pending" 
                description="Your generated strategy, including channel mapping and brand narratives, will appear here." 
              />
            )
          )}
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default ContentStrategyPage;
