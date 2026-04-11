// pages/StrategicInitiativesPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui'; // Changed Page, Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog
import { useAuth } from '../contexts/AuthContext';
import { StrategicInitiative, StrategicInitiativesPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';

const StrategicInitiativesPage: React.FC<StrategicInitiativesPageProps> = ({ onViewObjectives }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    strategicInitiatives, strategicInitiativeSheetId, setStrategicInitiativeSheetId,
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StrategicInitiative | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StrategicInitiative | null>(null);

  const handleOpenForm = (item: StrategicInitiative | null) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };
  
  const handleSave = useCallback(async (itemData: Partial<StrategicInitiative>) => {
    await saveItem('strategicInitiative', itemData, null);
    handleCloseForm();
  }, [saveItem]);

  const handleConfirmDelete = (item: StrategicInitiative) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setItemToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (itemToDelete) {
      await deleteItem('strategicInitiative', itemToDelete);
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
    'ID', 'Name', 'Status', 'Timeline Start', 'Timeline End', 'Owner', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Strategic Initiatives">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Strategic Initiatives data"
            description="Connect your Google account to manage your strategic initiatives from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Strategic Initiatives">
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

  if (loading && !strategicInitiatives.length) {
    return <ManagerEditorLayout title="Strategic Initiatives"><div className="text-center py-10">Loading strategic initiatives...</div></ManagerEditorLayout>;
  }

  if ((!strategicInitiativeSheetId || error) && !strategicInitiatives.length && !isMockMode) {
    return (
     <ManagerEditorLayout title="Strategic Initiatives">
       <Card title={error ? "Data Load Error" : "Configure Data Source"}>
         <EmptyState
           title={error ? "Failed to load Initiatives" : "No Initiatives Found"}
           description={error || "Enter the Google Sheet ID for your strategic initiatives to get started."}
           action={
             <div className="space-y-4">
               <Input
                 label="Google Spreadsheet ID"
                 value={strategicInitiativeSheetId}
                 onChange={(e) => setStrategicInitiativeSheetId(e.target.value)}
                 placeholder="Enter Google Spreadsheet ID"
                 required
               />
               <Button onClick={() => loadPortfolioData(true)} disabled={!strategicInitiativeSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title="Strategic Initiatives" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage your long-term strategic initiatives.</p>
      {strategicInitiatives.length === 0 ? (
        <EmptyState title="No Strategic Initiatives Found" description="Add a new strategic initiative to get started." />
      ) : (
        <Table headers={tableHeaders}>
          {strategicInitiatives.map(item => (
            <tr key={item.strategicInitiativeId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{item.strategicInitiativeId}</td>
              <td className="px-4 py-3 font-medium text-sm">{item.strategicInitiativeName}</td>
              <td className="px-4 py-3 text-sm">{item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm">{item.timelineStart || 'N/A'}</td>
              <td className="px-4 py-3 text-sm">{item.timelineEnd || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.ownerPersonId || 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => onViewObjectives(item.strategicInitiativeId)}>
                  View Objectives 🎯
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

      <Modal open={isEditModalOpen} onClose={handleCloseForm} title={editingItem ? 'Edit Strategic Initiative' : 'Add New Strategic Initiative'}>
        <PortfolioItemForm
          type="strategicInitiative"
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
        body={`Are you sure you want to clear strategic initiative "${itemToDelete?.strategicInitiativeName}"? This action will clear the row in Google Sheets.`} 
        confirmLabel="Clear Row" 
        tone="danger" 
      />
    </ManagerEditorLayout>
  );
};

export default StrategicInitiativesPage;