import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Textarea, EmptyState, Modal, ConfirmDialog, MarkdownOutput, ManagerEditorLayout } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useCompetitor } from '../../contexts/CompetitorContext';
import { Competitor } from '../../types';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

interface CompetitorFormProps {
  competitor?: Competitor | null;
  onSave: (competitorData: Partial<Competitor>) => void;
  onCancel: () => void;
}

const CompetitorForm: React.FC<CompetitorFormProps> = ({ competitor, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Competitor>>(competitor || {});

  const handleInputChange = (field: keyof Competitor, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Competitor Name"
        value={formData.name || ''}
        onChange={e => handleInputChange('name', e.target.value)}
        required
        placeholder="e.g., TechGiant Co."
      />
      <Input
        label="Website URL"
        type="url"
        value={formData.website || ''}
        onChange={e => handleInputChange('website', e.target.value)}
        placeholder="e.g., https://www.techgiant.com"
      />
      <Input
        label="Twitter/X Profile URL"
        type="url"
        value={formData.twitter || ''}
        onChange={e => handleInputChange('twitter', e.target.value)}
        placeholder="e.g., https://twitter.com/TechGiantCo"
      />
      <Input
        label="LinkedIn Profile URL"
        type="url"
        value={formData.linkedin || ''}
        onChange={e => handleInputChange('linkedin', e.target.value)}
        placeholder="e.g., https://linkedin.com/company/techgiant-co"
      />
      <Textarea
        label="Notes"
        value={formData.notes || ''}
        onChange={e => handleInputChange('notes', e.target.value)}
        rows={2}
        placeholder="Any additional notes about the competitor..."
      />
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save Competitor</Button>
      </div>
    </form>
  );
};


const CompetitorHubPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    competitors, loading, error, loadCompetitors, addCompetitor, updateCompetitor, deleteCompetitor,
    searchSocialMedia, isSearchingSocial, socialSearchResult, clearSocialSearchResult,
    saveCompetitorToDrive, isSavingToDrive,
  } = useCompetitor();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [competitorToDelete, setCompetitorToDelete] = useState<Competitor | null>(null);
  const [selectedCompetitorForSocial, setSelectedCompetitorForSocial] = useState<Competitor | null>(null);
  const [isSocialSearchModalOpen, setIsSocialSearchModalOpen] = useState(false);

  const handleOpenForm = (competitor: Competitor | null) => {
    setEditingCompetitor(competitor);
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setEditingCompetitor(null);
  };

  const handleSaveCompetitor = useCallback(async (competitorData: Partial<Competitor>) => {
    if (editingCompetitor) {
      await updateCompetitor({ ...editingCompetitor, ...competitorData });
    } else {
      await addCompetitor(competitorData);
    }
    handleCloseForm();
  }, [editingCompetitor, updateCompetitor, addCompetitor, handleCloseForm]);

  const handleConfirmDelete = (competitor: Competitor) => {
    setCompetitorToDelete(competitor);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setCompetitorToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (competitorToDelete) {
      await deleteCompetitor(competitorToDelete.id);
      handleCancelDelete();
    }
  }, [competitorToDelete, deleteCompetitor, handleCancelDelete]);

  const handleOpenSocialSearch = useCallback((competitor: Competitor) => {
    setSelectedCompetitorForSocial(competitor);
    setIsSocialSearchModalOpen(true);
    clearSocialSearchResult(); // Clear previous results
  }, [clearSocialSearchResult]);

  const handleCloseSocialSearch = useCallback(() => {
    setIsSocialSearchModalOpen(false);
    setSelectedCompetitorForSocial(null);
    clearSocialSearchResult();
  }, [clearSocialSearchResult]);

  const handleInitiateSocialSearch = useCallback(async () => {
    if (selectedCompetitorForSocial) {
      await searchSocialMedia(selectedCompetitorForSocial.name);
    }
  }, [selectedCompetitorForSocial, searchSocialMedia]);

  const handleSaveSocialResultToDrive = useCallback(async () => {
    if (selectedCompetitorForSocial && socialSearchResult) {
      await saveCompetitorToDrive(selectedCompetitorForSocial, socialSearchResult);
    }
  }, [selectedCompetitorForSocial, socialSearchResult, saveCompetitorToDrive]);


  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadCompetitors(true)} disabled={loading} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Competitors 🔄'}
      </Button>
      <Button onClick={() => handleOpenForm(null)} variant="accent">
        <span role="img" aria-label="plus" className="mr-2">➕</span>Add Competitor
      </Button>
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Competitor Hub">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to manage Competitor Profiles"
            description="Competitor profiles are stored locally in your browser. Sign in to continue and use AI features."
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

  if (loading && competitors.length === 0) {
    return <ManagerEditorLayout title="Competitor Hub"><div className="text-center py-10 text-[var(--color-text-secondary)]">Loading competitors...</div></ManagerEditorLayout>;
  }

  if (error) {
    return (
      <ManagerEditorLayout title="Competitor Hub">
        <Card title="Error Loading Competitors">
          <EmptyState
            title="Failed to load competitor profiles"
            description={error}
            action={<Button onClick={() => loadCompetitors(true)}>Retry</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Competitor Hub" toolbar={toolbar}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Manage your competitor profiles. Use AI to listen to their social media activity and save insights.
      </p>

      {competitors.length === 0 ? (
        <EmptyState
          title="No Competitor Profiles Found"
          description="Start by adding your first competitor profile to begin monitoring their activity."
          action={<Button variant="primary" onClick={() => handleOpenForm(null)}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Competitor</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map(competitor => (
            <Card key={competitor.id} className="relative group hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border-primary)]">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{competitor.name}</h3>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenForm(competitor)} title="Edit Competitor"><span role="img" aria-label="edit">✏️</span></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(competitor)} title="Delete Competitor"><span role="img" aria-label="trash">🗑️</span></Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <h4 className="font-semibold text-[var(--color-brand-primary)]">Website:</h4>
                  <p className="text-[var(--color-text-secondary)] line-clamp-1">
                    {competitor.website ? <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{competitor.website}</a> : 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-brand-primary)]">Twitter/X:</h4>
                  <p className="text-[var(--color-text-secondary)] line-clamp-1">
                    {competitor.twitter ? <a href={competitor.twitter} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{competitor.twitter}</a> : 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-brand-primary)]">LinkedIn:</h4>
                  <p className="text-[var(--color-text-secondary)] line-clamp-1">
                    {competitor.linkedin ? <a href={competitor.linkedin} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{competitor.linkedin}</a> : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)]">
                <Button variant="secondary" size="sm" onClick={() => handleOpenSocialSearch(competitor)} disabled={isSearchingSocial || !isSignedIn && !isMockMode}>
                  <span role="img" aria-label="sparkles" className="mr-2">✨</span> {isSearchingSocial ? 'Searching...' : 'Listen to Socials'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={isFormModalOpen}
        onClose={handleCloseForm}
        title={editingCompetitor ? 'Edit Competitor Profile' : 'Add New Competitor Profile'}
        className="max-w-xl"
      >
        <CompetitorForm competitor={editingCompetitor} onSave={handleSaveCompetitor} onCancel={handleCloseForm} />
      </Modal>

      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleExecuteDelete}
        title="Confirm Competitor Deletion"
        body={`Are you sure you want to delete the competitor "${competitorToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Competitor"
        tone="danger"
      />

      <Modal
        open={isSocialSearchModalOpen}
        onClose={handleCloseSocialSearch}
        title={`Social Media Listening: ${selectedCompetitorForSocial?.name || 'N/A'}`}
        className="max-w-3xl h-[80vh] flex flex-col"
        footer={
          <div className="flex justify-between items-center">
            <Button variant="secondary" onClick={handleCloseSocialSearch}>Close</Button>
            <Button variant="primary" onClick={handleSaveSocialResultToDrive} disabled={!socialSearchResult || isSavingToDrive || !isSignedIn}>
              {isSavingToDrive ? 'Saving to Drive...' : '💾 Save to Drive'}
            </Button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Button onClick={handleInitiateSocialSearch} disabled={isSearchingSocial || !isSignedIn && !isMockMode}>
            {isSearchingSocial ? 'Searching...' : <><span role="img" aria-label="sparkles" className="mr-2">✨</span> Search Social Media</>}
          </Button>
          {isSearchingSocial && <div className="text-center py-4 text-[var(--color-text-secondary)]">Analyzing recent social activity...</div>}
          {socialSearchResult && (
            <Card title="AI Analysis Result">
              <MarkdownOutput content={socialSearchResult} />
            </Card>
          )}
          {!socialSearchResult && !isSearchingSocial && (
            <EmptyState title="No Search Result" description="Initiate a search to see recent social media activity for this competitor." />
          )}
        </div>
      </Modal>
    </ManagerEditorLayout>
  );
};

export default CompetitorHubPage;