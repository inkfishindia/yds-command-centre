// pages/QuarterlyInitiativesPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui'; // Changed Page, Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog
import { useAuth } from '../contexts/AuthContext';
import { QuarterlyInitiative, QuarterlyInitiativesPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';

const QuarterlyInitiativesPage: React.FC<QuarterlyInitiativesPageProps> = ({ goalId }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    quarterlyInitiatives, quarterlyInitiativeSheetId, setQuarterlyInitiativeSheetId,
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuarterlyInitiative | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<QuarterlyInitiative | null>(null);

  const filteredInitiatives = useMemo(() =>
    goalId ? quarterlyInitiatives.filter(i => i.parentGoalIds?.includes(goalId)) : quarterlyInitiatives,
  [quarterlyInitiatives, goalId]);

  const handleOpenForm = (item: QuarterlyInitiative | null) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };
  
  const handleSave = useCallback(async (itemData: Partial<QuarterlyInitiative>) => {
    await saveItem('quarterlyInitiative', itemData, goalId);
    handleCloseForm();
  }, [saveItem, goalId]);

  const handleConfirmDelete = (item: QuarterlyInitiative) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setItemToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (itemToDelete) {
      await deleteItem('quarterlyInitiative', itemToDelete);
      handleCancelDelete();
    }
  }, [itemToDelete, deleteItem, handleCancelDelete]);

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Initiatives 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Initiative
        </Button>
      )}
    </div>
  );

  const tableHeaders = useMemo(() => [
    'ID', 'Name', 'Quarter', 'Status', 'Owner', 'Budget', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Quarterly Initiatives">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Quarterly Initiatives"
            description="Connect your Google account to manage your quarterly initiatives from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Quarterly Initiatives">
        <Card title="Permissions Needed">
          <EmptyState
            title="Grant Google Sheets access"
            description={error || "Permission is needed to read data from your Google Sheet."}
            action={<Button variant="accent" onClick={handleGrantSheetsAccess}>Grant Access 📄</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (loading && !quarterlyInitiatives.length) {
    return <ManagerEditorLayout title="Quarterly Initiatives"><div className="text-center py-10">Loading quarterly initiatives...</div></ManagerEditorLayout>;
  }

  if ((!quarterlyInitiativeSheetId || error) && !quarterlyInitiatives.length && !isMockMode) {
     return (
      <ManagerEditorLayout title="Quarterly Initiatives">
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Initiatives" : "No Initiatives Found"}
            description={error || "Enter the Google Sheet ID for your quarterly initiatives to get started."}
            action={
              <div className="space-y-4">
                <Input
                  label="Google Spreadsheet ID"
                  value={quarterlyInitiativeSheetId}
                  onChange={(e) => setQuarterlyInitiativeSheetId(e.target.value)}
                  placeholder="Enter Google Spreadsheet ID"
                  required
                />
                <Button onClick={() => loadPortfolioData(true)} disabled={!quarterlyInitiativeSheetId || loading} variant="primary">
                  {loading ? 'Loading...' : 'Load from Sheet 📄'}
                </Button>
              </div>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title={goalId ? `Initiatives for Goal ${goalId}` : "All Quarterly Initiatives"} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage your quarterly initiatives. {goalId && `Filtered by Goal: ${goalId}`}</p>
      {filteredInitiatives.length === 0 ? (
        <EmptyState title={goalId ? "No Initiatives for this Goal" : "No Quarterly Initiatives Found"} description={goalId ? "Add a new initiative to this goal." : "There are no quarterly initiatives in your data source."}/>
      ) : (
        <Table headers={tableHeaders}>
          {filteredInitiatives.map(item => (
            <tr key={item.initiativeId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{item.initiativeId}</td>
              <td className="px-4 py-3 font-medium text-sm">{item.initiativeName}</td>
              <td className="px-4 py-3 text-sm">{item.quarter || 'N/A'}</td>
              <td className="px-4 py-3 text-sm">{item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.ownerPersonId || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{item.budget || 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                {!isMockMode && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenForm(item)}><span role="img" aria-label="edit">✏️</span></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(item)}><span role="img" aria-label="trash">🗑️</span></Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={isEditModalOpen} onClose={handleCloseForm} title={editingItem ? 'Edit Quarterly Initiative' : 'Add New Quarterly Initiative'}>
        <PortfolioItemForm
          type="quarterlyInitiative"
          item={editingItem || { parentGoalIds: goalId || '' }}
          onSave={handleSave}
          onCancel={handleCloseForm}
          goalId={goalId}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog 
        open={isConfirmDeleteOpen} 
        onCancel={handleCancelDelete} 
        onConfirm={handleExecuteDelete} 
        title="Confirm Deletion" 
        body={`Are you sure you want to clear quarterly initiative "${itemToDelete?.initiativeName}"? This action will clear the row in Google Sheets.`} 
        confirmLabel="Clear Row" 
        tone="danger" 
      />
    </ManagerEditorLayout>
  );
};

export default QuarterlyInitiativesPage;