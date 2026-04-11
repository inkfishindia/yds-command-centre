import React, { useState, useMemo, useCallback } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { Milestone, MilestonesPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';


const MilestonesPage: React.FC<MilestonesPageProps> = ({ projectId }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    milestones, milestoneSheetId, setMilestoneSheetId, 
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null);

  const filteredMilestones = useMemo(() =>
    projectId ? milestones.filter(m => m.projectId === projectId) : milestones,
  [milestones, projectId]);

  const handleOpenEditModal = (milestone: Milestone | null) => {
    setEditingMilestone(milestone);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMilestone(null);
  };

  const handleSave = useCallback(async (itemData: Partial<Milestone>) => {
    await saveItem('milestone', itemData, projectId);
    handleCloseEditModal();
  }, [saveItem, projectId]);


  const handleConfirmDelete = (milestone: Milestone) => {
    setMilestoneToDelete(milestone);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setMilestoneToDelete(null);
  };

  const handleExecuteDelete = async () => {
    if (milestoneToDelete) {
      await deleteItem('milestone', milestoneToDelete);
      handleCancelDelete();
    }
  };

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Milestones 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenEditModal(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Milestone
        </Button>
      )}
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Milestones">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Milestones data"
            description="Connect your Google account to manage your milestones from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Milestones">
        <Card title="Permissions Needed">
          <EmptyState
            title="Grant Google Sheets access"
            description={error || "Permission is needed to read milestone data from your Google Sheet."}
            action={<Button variant="accent" onClick={handleGrantSheetsAccess}>Grant Access 📄</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (loading && !milestones.length) {
    return <ManagerEditorLayout title="Milestones"><div className="text-center py-10">Loading milestones...</div></ManagerEditorLayout>;
  }
  
  if ((!milestoneSheetId || error) && !milestones.length && !isMockMode) {
    return (
     <ManagerEditorLayout title="Milestones">
       <Card title={error ? "Data Load Error" : "Configure Data Source"}>
         <EmptyState
           title={error ? "Failed to load Milestones" : "No Milestones Found"}
           description={error || "Enter the Google Sheet ID for your milestones to get started."}
           action={
             <div className="space-y-4">
               <Input
                 label="Google Spreadsheet ID"
                 value={milestoneSheetId}
                 onChange={(e) => setMilestoneSheetId(e.target.value)}
                 placeholder="Enter Google Spreadsheet ID"
                 required
               />
               <Button onClick={() => loadPortfolioData(true)} disabled={!milestoneSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title={projectId ? `Milestones for Project ${projectId}` : "All Milestones"} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage project milestones. {projectId && `Filtered by Project: ${projectId}`}</p>
      {filteredMilestones.length === 0 ? (
        <EmptyState title={projectId ? "No Milestones for this Project" : "No Milestones Found"} description={projectId ? "Add a new milestone to this project." : "There are no milestones in your data source."}/>
      ) : (
        <Table headers={['ID', 'Name', 'Status', 'Owner', 'Target Date', 'Completion', 'Actions']}>
          {filteredMilestones.map(milestone => (
            <tr key={milestone.milestoneId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{milestone.milestoneId}</td>
              <td className="px-4 py-3 font-medium text-sm">{milestone.milestoneName}</td>
              <td className="px-4 py-3 text-sm">{milestone.status && <StatusPill status={milestone.status}>{milestone.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{milestone.ownerName}</td>
              <td className="px-4 py-3 text-sm">{milestone.targetDate || 'N/A'}</td>
              <td className="px-4 py-3 text-sm">{milestone.completionPct ?? 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                {!isMockMode && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(milestone)}><span role="img" aria-label="edit" className="leading-none">✏️</span></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(milestone)}><span role="img" aria-label="trash" className="leading-none">🗑️</span></Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={isEditModalOpen} onClose={handleCloseEditModal} title={editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}>
        <PortfolioItemForm
          type="milestone"
          item={editingMilestone || { projectId: projectId || '' }}
          onSave={handleSave}
          onCancel={handleCloseEditModal}
          projectId={projectId}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog open={isConfirmDeleteOpen} onCancel={handleCancelDelete} onConfirm={handleExecuteDelete} title="Confirm Milestone Deletion" body={`Are you sure you want to clear milestone "${milestoneToDelete?.milestoneName}"? This action will clear the row in Google Sheets.`} confirmLabel="Clear Row" tone="danger" />
    </ManagerEditorLayout>
  );
};

export default MilestonesPage;