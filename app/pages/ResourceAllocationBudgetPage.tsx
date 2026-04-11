// pages/ResourceAllocationBudgetPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui'; // Changed Page, Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog
import { useAuth } from '../contexts/AuthContext';
import { ResourceAllocationBudget, ResourceAllocationBudgetPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';

const ResourceAllocationBudgetPage: React.FC<ResourceAllocationBudgetPageProps> = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    resourceAllocationBudgets, resourceAllocationBudgetSheetId, setResourceAllocationBudgetSheetId,
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceAllocationBudget | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ResourceAllocationBudget | null>(null);

  const handleOpenForm = (item: ResourceAllocationBudget | null) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };
  
  const handleSave = useCallback(async (itemData: Partial<ResourceAllocationBudget>) => {
    await saveItem('resourceAllocationBudget', itemData, null);
    handleCloseForm();
  }, [saveItem]);

  const handleConfirmDelete = (item: ResourceAllocationBudget) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setItemToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (itemToDelete) {
      await deleteItem('resourceAllocationBudget', itemToDelete);
      handleCancelDelete();
    }
  }, [itemToDelete, deleteItem, handleCancelDelete]);

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Budget 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Budget
        </Button>
      )}
    </div>
  );

  const tableHeaders = useMemo(() => [
    'Category', 'Sub Category', 'Budget Amount (FY26)', '% of Total', 'Owner', 'Status', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Resource Allocation Budget">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Budget data"
            description="Connect your Google account to manage your budget allocations from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Resource Allocation Budget">
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

  if (loading && !resourceAllocationBudgets.length) {
    return <ManagerEditorLayout title="Resource Allocation Budget"><div className="text-center py-10">Loading resource allocation budgets...</div></ManagerEditorLayout>;
  }

  if ((!resourceAllocationBudgetSheetId || error) && !resourceAllocationBudgets.length && !isMockMode) {
     return (
      <ManagerEditorLayout title="Resource Allocation Budget">
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Budgets" : "No Budgets Found"}
            description={error || "Enter the Google Sheet ID for your budgets to get started."}
            action={
              <div className="space-y-4">
                <Input
                  label="Google Spreadsheet ID"
                  value={resourceAllocationBudgetSheetId}
                  onChange={(e) => setResourceAllocationBudgetSheetId(e.target.value)}
                  placeholder="Enter Google Spreadsheet ID"
                  required
                />
                <Button onClick={() => loadPortfolioData(true)} disabled={!resourceAllocationBudgetSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title="Resource Allocation Budget" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Overview of resource and budget allocations.</p>
      {resourceAllocationBudgets.length === 0 ? (
        <EmptyState title="No Budgets Found" description="Add a new budget category to get started." />
      ) : (
        <Table headers={tableHeaders}>
          {resourceAllocationBudgets.map(item => (
            <tr key={item.budgetCategoryId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-medium text-sm">{item.budgetCategory}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{item.subCategory || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{item.budgetAmountFy26 || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{item.pctOfTotal || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.ownerPersonId || 'N/A'}</td>
              <td className="px-4 py-3 text-sm">{item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}</td>
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

      <Modal open={isEditModalOpen} onClose={handleCloseForm} title={editingItem ? 'Edit Budget Allocation' : 'Add New Budget Allocation'}>
        <PortfolioItemForm
          type="resourceAllocationBudget"
          item={editingItem}
          onSave={handleSave}
          onCancel={handleCloseForm}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog 
        open={isConfirmDeleteOpen} 
        onCancel={handleCancelDelete} 
        onConfirm={handleExecuteDelete} 
        title="Confirm Deletion" 
        body={`Are you sure you want to clear resource allocation budget "${itemToDelete?.budgetCategory}"? This action will clear the row in Google Sheets.`} 
        confirmLabel="Clear Row" 
        tone="danger" 
      />
    </ManagerEditorLayout>
  );
};

export default ResourceAllocationBudgetPage;