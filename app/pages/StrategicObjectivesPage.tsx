// pages/StrategicObjectivesPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui'; // Changed Page, Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog
import { useAuth } from '../contexts/AuthContext';
import { StrategicObjective, StrategicObjectivesPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';

const StrategicObjectivesPage: React.FC<StrategicObjectivesPageProps> = ({ strategicInitiativeId, onViewGoals }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    strategicObjectives, strategicObjectiveSheetId, setStrategicObjectiveSheetId,
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StrategicObjective | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StrategicObjective | null>(null);

  const filteredObjectives = useMemo(() =>
    strategicInitiativeId ? strategicObjectives.filter(o => o.parentStrategicInitiativeId === strategicInitiativeId) : strategicObjectives,
  [strategicObjectives, strategicInitiativeId]);

  const handleOpenForm = (item: StrategicObjective | null) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };
  
  const handleSave = useCallback(async (itemData: Partial<StrategicObjective>) => {
    await saveItem('strategicObjective', itemData, strategicInitiativeId);
    handleCloseForm();
  }, [saveItem, strategicInitiativeId]);


  const handleConfirmDelete = (item: StrategicObjective) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setItemToDelete(null);
  };

  const handleExecuteDelete = useCallback(async () => {
    if (itemToDelete) {
      await deleteItem('strategicObjective', itemToDelete);
      handleCancelDelete();
    }
  }, [itemToDelete, deleteItem, handleCancelDelete]);

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Objectives 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Objective
        </Button>
      )}
    </div>
  );

  const tableHeaders = useMemo(() => [
    'ID', 'Name', 'Status', 'Criticality', 'Owner', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Strategic Objectives">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Strategic Objectives data"
            description="Connect your Google account to manage your strategic objectives from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Strategic Objectives">
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

  if (loading && !strategicObjectives.length) {
    return <ManagerEditorLayout title="Strategic Objectives"><div className="text-center py-10">Loading strategic objectives...</div></ManagerEditorLayout>;
  }

  if ((!strategicObjectiveSheetId || error) && !strategicObjectives.length && !isMockMode) {
    return (
     <ManagerEditorLayout title="Strategic Objectives">
       <Card title={error ? "Data Load Error" : "Configure Data Source"}>
         <EmptyState
           title={error ? "Failed to load Objectives" : "No Objectives Found"}
           description={error || "Enter the Google Sheet ID for your strategic objectives to get started."}
           action={
             <div className="space-y-4">
               <Input
                 label="Google Spreadsheet ID"
                 value={strategicObjectiveSheetId}
                 onChange={(e) => setStrategicObjectiveSheetId(e.target.value)}
                 placeholder="Enter Google Spreadsheet ID"
                 required
               />
               <Button onClick={() => loadPortfolioData(true)} disabled={!strategicObjectiveSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title={strategicInitiativeId ? `Objectives for Initiative ${strategicInitiativeId}` : "All Strategic Objectives"} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage your strategic objectives. {strategicInitiativeId && `Filtered by Initiative: ${strategicInitiativeId}`}</p>
      {filteredObjectives.length === 0 ? (
        <EmptyState title={strategicInitiativeId ? "No Objectives for this Initiative" : "No Strategic Objectives Found"} description={strategicInitiativeId ? "Add a new objective to this initiative." : "There are no strategic objectives in your data source."}/>
      ) : (
        <Table headers={tableHeaders}>
          {filteredObjectives.map(item => (
            <tr key={item.objectiveId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{item.objectiveId}</td>
              <td className="px-4 py-3 font-medium text-sm">{item.objectiveName}</td>
              <td className="px-4 py-3 text-sm">{item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm">{item.criticalityLevel && <StatusPill status={item.criticalityLevel}>{item.criticalityLevel}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.ownerPersonId || 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => onViewGoals(item.objectiveId)}>
                  View Goals 🥅
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

      <Modal open={isEditModalOpen} onClose={handleCloseForm} title={editingItem ? 'Edit Strategic Objective' : 'Add New Strategic Objective'}>
        <PortfolioItemForm
          type="strategicObjective"
          item={editingItem || { parentStrategicInitiativeId: strategicInitiativeId || '' }}
          onSave={handleSave}
          onCancel={handleCloseForm}
          strategicInitiativeId={strategicInitiativeId}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog 
        open={isConfirmDeleteOpen} 
        onCancel={handleCancelDelete} 
        onConfirm={handleExecuteDelete} 
        title="Confirm Deletion" 
        body={`Are you sure you want to clear strategic objective "${itemToDelete?.objectiveName}"? This action will clear the row in Google Sheets.`} 
        confirmLabel="Clear Row" 
        tone="danger" 
      />
    </ManagerEditorLayout>
  );
};

export default StrategicObjectivesPage;