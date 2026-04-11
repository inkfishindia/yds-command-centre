import React, { useState, useCallback } from 'react';
import { Card, Button, EmptyState, Modal, ConfirmDialog, Input, Textarea, ManagerEditorLayout } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { BrandProfile } from '../../types';
import DemoModeBanner from '../../components/layout/DemoModeBanner';

interface BrandFormProps {
  brand?: BrandProfile | null;
  onSave: (brandData: Partial<BrandProfile>) => void;
  onCancel: () => void;
}

const BrandForm: React.FC<BrandFormProps> = ({ brand, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<BrandProfile>>(brand || {});

  const handleInputChange = (field: keyof BrandProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Brand Name"
        value={formData.name || ''}
        onChange={e => handleInputChange('name', e.target.value)}
        required
        placeholder="e.g., InnovateX"
      />
      <Input
        label="Brand Voice"
        value={formData.voice || ''}
        onChange={e => handleInputChange('voice', e.target.value)}
        placeholder="e.g., Modern, Bold, Visionary"
      />
      <Textarea
        label="Brand Mission"
        value={formData.mission || ''}
        onChange={e => handleInputChange('mission', e.target.value)}
        rows={3}
        placeholder="e.g., Empowering the next generation of creators..."
      />
      <Textarea
        label="Target Audience"
        value={formData.targetAudience || ''}
        onChange={e => handleInputChange('targetAudience', e.target.value)}
        rows={2}
        placeholder="e.g., Tech enthusiasts, startups, digital artists"
      />
      <Textarea
        label="Key Messages"
        value={formData.keyMessages || ''}
        onChange={e => handleInputChange('keyMessages', e.target.value)}
        rows={3}
        placeholder="e.g., Innovation for everyone; Create without limits;"
      />
      <Textarea
        label="Notes"
        value={formData.notes || ''}
        onChange={e => handleInputChange('notes', e.target.value)}
        rows={2}
        placeholder="Any additional notes about the brand..."
      />
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save Brand</Button>
      </div>
    </form>
  );
};


const BrandHubPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { brands, loading, error, loadBrands, addBrand, updateBrand, deleteBrand } = useBrand();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandProfile | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandProfile | null>(null);

  const handleOpenForm = (brand: BrandProfile | null) => {
    setEditingBrand(brand);
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setEditingBrand(null);
  };

  const handleSaveBrand = useCallback(async (brandData: Partial<BrandProfile>) => {
    if (editingBrand) {
      await updateBrand({ ...editingBrand, ...brandData });
    } else {
      await addBrand(brandData);
    }
    handleCloseForm();
  }, [editingBrand, updateBrand, addBrand, handleCloseForm]);

  const handleConfirmDelete = (brand: BrandProfile) => {
    setBrandToDelete(brand);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setBrandToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (brandToDelete) {
      await deleteBrand(brandToDelete.id);
      handleCancelDelete();
    }
  }, [brandToDelete, deleteBrand, handleCancelDelete]);

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadBrands(true)} disabled={loading} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Brands 🔄'}
      </Button>
      <Button onClick={() => handleOpenForm(null)} variant="accent">
        <span role="img" aria-label="plus" className="mr-2">➕</span>Add Brand
      </Button>
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Brand Hub">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to manage Brand Profiles"
            description="Brand profiles are stored locally in your browser. Sign in to continue."
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

  if (loading && brands.length === 0) {
    return <ManagerEditorLayout title="Brand Hub"><div className="text-center py-10 text-[var(--color-text-secondary)]">Loading brands...</div></ManagerEditorLayout>;
  }

  if (error) {
    return (
      <ManagerEditorLayout title="Brand Hub">
        <Card title="Error Loading Brands">
          <EmptyState
            title="Failed to load brand profiles"
            description={error}
            action={<Button onClick={() => loadBrands(true)}>Retry</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Brand Hub" toolbar={toolbar}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Manage your brand profiles here. These profiles can be used by AI generative tools to align content with your brand identity.
        Data is stored locally in your browser.
      </p>

      {brands.length === 0 ? (
        <EmptyState
          title="No Brand Profiles Found"
          description="Start by adding your first brand profile to define your brand identity."
          action={<Button variant="primary" onClick={() => handleOpenForm(null)}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Brand</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map(brand => (
            <Card key={brand.id} className="relative group hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border-primary)]">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{brand.name}</h3>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenForm(brand)} title="Edit Brand"><span role="img" aria-label="edit">✏️</span></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(brand)} title="Delete Brand"><span role="img" aria-label="trash">🗑️</span></Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <h4 className="font-semibold text-[var(--color-brand-primary)]">Voice:</h4>
                  <p className="text-[var(--color-text-secondary)]">{brand.voice || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-brand-primary)]">Mission:</h4>
                  <p className="text-[var(--color-text-secondary)] line-clamp-2">{brand.mission || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-brand-primary)]">Target Audience:</h4>
                  <p className="text-[var(--color-text-secondary)] line-clamp-2">{brand.targetAudience || 'N/A'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={isFormModalOpen}
        onClose={handleCloseForm}
        title={editingBrand ? 'Edit Brand Profile' : 'Add New Brand Profile'}
        className="max-w-xl"
      >
        <BrandForm brand={editingBrand} onSave={handleSaveBrand} onCancel={handleCloseForm} />
      </Modal>

      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleExecuteDelete}
        title="Confirm Brand Deletion"
        body={`Are you sure you want to delete the brand "${brandToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Brand"
        tone="danger"
      />
    </ManagerEditorLayout>
  );
};

export default BrandHubPage;