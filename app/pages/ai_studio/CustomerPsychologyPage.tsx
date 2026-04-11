import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Select, Textarea, EmptyState, ManagerEditorLayout, MarkdownOutput } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { useAITools } from '../../contexts/AIToolsContext';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

const CustomerPsychologyPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { brands, loading: loadingBrands, error: brandsError } = useBrand();
  const {
    customerPsychology, loadingTextAI, textAIError,
    generateCustomerPsychology, clearTextAIResults,
  } = useAITools();

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [marketingGoal, setMarketingGoal] = useState('');

  const brandOptions = useMemo(() => brands.map(brand => ({
    value: brand.id,
    label: brand.name,
  })), [brands]);

  const selectedBrand = useMemo(() => brands.find(b => b.id === selectedBrandId), [brands, selectedBrandId]);

  const handleGenerate = useCallback(async () => {
    if (!selectedBrand) {
      // This case should be prevented by UI disabling
      return;
    }
    if (!marketingGoal.trim()) {
      alert('Please enter a marketing goal.');
      return;
    }
    await generateCustomerPsychology(selectedBrand, marketingGoal);
  }, [selectedBrand, marketingGoal, generateCustomerPsychology]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Customer Psychology Generator">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to use the AI Customer Psychology Generator"
            description="Connect your Google account to leverage AI for deep customer insights."
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
    <ManagerEditorLayout title="Customer Psychology Generator">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Define your target audience persona and understand their psychological drivers for effective marketing.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input/Controls Card */}
        <Card title="Inputs" className="h-fit">
          <div className="space-y-4">
            {loadingBrands ? (
              <div className="text-center text-[var(--color-text-secondary)]">Loading brands...</div>
            ) : brandsError ? (
              <p className="text-red-500">{brandsError}</p>
            ) : brandOptions.length === 0 ? (
              <EmptyState title="No Brands Found" description="Please add brands in the Brand Hub first." />
            ) : (
              <Select
                label="Select Brand Profile"
                options={brandOptions}
                value={selectedBrandId || ''}
                onChange={setSelectedBrandId}
                placeholder="Choose a brand"
                required
              />
            )}
            <Textarea
              label="Marketing Goal"
              value={marketingGoal}
              onChange={e => setMarketingGoal(e.target.value)}
              placeholder="e.g., Increase sign-ups for our new design software."
              rows={4}
              required
            />
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={clearTextAIResults} disabled={loadingTextAI}>Clear Results</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loadingTextAI || !selectedBrandId || !marketingGoal.trim()}
              >
                {loadingTextAI ? 'Generating...' : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Generate Psychology</>}
              </Button>
            </div>
          </div>
        </Card>

        {/* Output Card */}
        <Card title="AI Generated Psychology" className="h-full">
          {loadingTextAI && <div className="text-center py-10 text-[var(--color-text-secondary)]">Generating customer psychology profile...</div>}
          {textAIError && <EmptyState title="Error" description={textAIError} action={<Button onClick={handleGenerate}>Retry</Button>} />}
          {customerPsychology ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Persona Summary</h3>
                <MarkdownOutput content={customerPsychology.personaSummary} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Customer Journey Map</h3>
                <MarkdownOutput content={customerPsychology.customerJourneyMap} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Behavioral Triggers</h3>
                <MarkdownOutput content={customerPsychology.behavioralTriggers} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Conversion Psychology</h3>
                <MarkdownOutput content={customerPsychology.conversionPsychology} />
              </div>
            </div>
          ) : (
            !loadingTextAI && !textAIError && <EmptyState title="No Results Yet" description="Enter your brand and a marketing goal, then click 'Generate Psychology'." />
          )}
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default CustomerPsychologyPage;