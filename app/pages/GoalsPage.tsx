// pages/GoalsPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui'; // Changed Page, Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog
import { useAuth } from '../contexts/AuthContext';
import { Goal, GoalsPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';

const GoalsPage: React.FC<GoalsPageProps> = ({ strategicObjectiveId, onViewQuarterlyInitiatives }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    goals, goalSheetId, setGoalSheetId,
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Goal | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Goal | null>(null);

  const filteredGoals = useMemo(() =>
    strategicObjectiveId ? goals.filter(g => g.parentObjectiveId === strategicObjectiveId) : goals,
  [goals, strategicObjectiveId]);

  const handleOpenForm = (item: Goal | null) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = useCallback(async (itemData: Partial<Goal>) => {
    await saveItem('goal', itemData, strategicObjectiveId);
    handleCloseForm();
  }, [saveItem, strategicObjectiveId]);

  const handleConfirmDelete = (item: Goal) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setItemToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (itemToDelete) {
      await deleteItem('goal', itemToDelete);
      handleCancelDelete();
    }
  }, [itemToDelete, deleteItem, handleCancelDelete]);

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Goals 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Goal
        </Button>
      )}
    </div>
  );

  const tableHeaders = useMemo(() => [
    'ID', 'Name', 'Status', 'Target Metric', 'Current Baseline', 'Owner', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Goals">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Goals data"
            description="Connect your Google account to manage your goals from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Goals">
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

  if (loading && !goals.length) {
    return <ManagerEditorLayout title="Goals"><div className="text-center py-10">Loading goals...</div></ManagerEditorLayout>;
  }

  if ((!goalSheetId || error) && !goals.length && !isMockMode) {
     return (
      <ManagerEditorLayout title="Goals">
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Goals" : "No Goals Found"}
            description={error || "Enter the Google Sheet ID for your goals to get started."}
            action={
              <div className="space-y-4">
                <Input
                  label="Google Spreadsheet ID"
                  value={goalSheetId}
                  onChange={(e) => setGoalSheetId(e.target.value)}
                  placeholder="Enter Google Spreadsheet ID"
                  required
                />
                <Button onClick={() => loadPortfolioData(true)} disabled={!goalSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title={strategicObjectiveId ? `Goals for Objective ${strategicObjectiveId}` : "All Goals"} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage your strategic goals. {strategicObjectiveId && `Filtered by Objective: ${strategicObjectiveId}`}</p>
      {filteredGoals.length === 0 ? (
        <EmptyState title={strategicObjectiveId ? "No Goals for this Objective" : "No Goals Found"} description={strategicObjectiveId ? "Add a new goal to this objective." : "There are no goals in your data source."}/>
      ) : (
        <Table headers={tableHeaders}>
          {filteredGoals.map(item => (
            <tr key={item.goalId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{item.goalId}</td>
              <td className="px-4 py-3 font-medium text-sm">{item.goalName}</td>
              <td className="px-4 py-3 text-sm">{item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{item.targetMetricMar2026 || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.currentBaselineOct2024 || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.ownerPersonId || 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => onViewQuarterlyInitiatives(item.goalId)}>
                  View Q Initiatives 🗓️
                </Button>
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

      <Modal open={isEditModalOpen} onClose={handleCloseForm} title={editingItem ? 'Edit Goal' : 'Add New Goal'}>
        <PortfolioItemForm
          type="goal"
          item={editingItem || { parentObjectiveId: strategicObjectiveId || '' }}
          onSave={handleSave}
          onCancel={handleCloseForm}
          strategicObjectiveId={strategicObjectiveId}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog 
        open={isConfirmDeleteOpen} 
        onCancel={handleCancelDelete} 
        onConfirm={handleExecuteDelete} 
        title="Confirm Deletion" 
        body={`Are you sure you want to clear goal "${itemToDelete?.goalName}"? This action will clear the row in Google Sheets.`} 
        confirmLabel="Clear Row" 
        tone="danger" 
      />
    </ManagerEditorLayout>
  );
};

export default GoalsPage;