import React, { useState, useMemo, useCallback } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { Project, ProjectsPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';


const ProjectsPage: React.FC<ProjectsPageProps> = ({ programId, onViewTasks, onViewMilestones }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    projects, projectSheetId, setProjectSheetId, 
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => 
    programId ? projects.filter(p => p.programId === programId) : projects,
  [projects, programId]);
  
  const handleOpenEditModal = (project: Project | null) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
  };

  const handleSave = useCallback(async (itemData: Partial<Project>) => {
    await saveItem('project', itemData, programId);
    handleCloseEditModal();
  }, [saveItem, programId]);

  const handleConfirmDelete = (project: Project) => {
    setProjectToDelete(project);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setProjectToDelete(null);
  };

  const handleExecuteDelete = async () => {
    if (projectToDelete) {
      await deleteItem('project', projectToDelete);
      handleCancelDelete();
    }
  };

  const getHealthPillText = (score?: number) => (score === undefined || score === null) ? 'N/A' : score >= 90 ? 'Healthy' : score >= 50 ? 'At Risk' : 'Critical';

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenEditModal(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Project
        </Button>
      )}
    </div>
  );
  
  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Projects">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Projects data"
            description="Connect your Google account to manage your projects from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Projects">
        <Card title="Permissions Needed">
          <EmptyState
            title="Grant Google Sheets access"
            description={error || "Permission is needed to read project data from your Google Sheet."}
            action={<Button variant="accent" onClick={handleGrantSheetsAccess}>Grant Access 📄</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (loading && !projects.length) {
    return <ManagerEditorLayout title="Projects"><div className="text-center py-10">Loading projects...</div></ManagerEditorLayout>;
  }
  
  if ((!projectSheetId || error) && !projects.length && !isMockMode) {
    return (
     <ManagerEditorLayout title="Projects">
       <Card title={error ? "Data Load Error" : "Configure Data Source"}>
         <EmptyState
           title={error ? "Failed to load Projects" : "No Projects Found"}
           description={error || "Enter the Google Sheet ID for your projects to get started."}
           action={
             <div className="space-y-4">
               <Input
                 label="Google Spreadsheet ID"
                 value={projectSheetId}
                 onChange={(e) => setProjectSheetId(e.target.value)}
                 placeholder="Enter Google Spreadsheet ID"
                 required
               />
               <Button onClick={() => loadPortfolioData(true)} disabled={!projectSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title={programId ? `Projects for Program ${programId}` : "All Projects"} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage company projects. {programId && `Filtered by Program: ${programId}`}</p>
      {filteredProjects.length === 0 ? (
        <EmptyState title={programId ? "No Projects for this Program" : "No Projects Found"} description={programId ? "Add a new project to this program." : "There are no projects in your data source."}/>
      ) : (
        <Table headers={['ID', 'Name', 'Status', 'Priority', 'Owner', 'Health', 'Completion', 'Actions']}>
          {filteredProjects.map(project => (
            <tr key={project.projectId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{project.projectId}</td>
              <td className="px-4 py-3 font-medium text-sm">{project.projectName}</td>
              <td className="px-4 py-3 text-sm">{project.status && <StatusPill status={project.status}>{project.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm">{project.priority && <StatusPill status={project.priority}>{project.priority}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{project.ownerName}</td>
              <td className="px-4 py-3 text-sm"><StatusPill status={project.healthScore}>{getHealthPillText(project.healthScore)}</StatusPill></td>
              <td className="px-4 py-3 text-sm">{project.completionPct !== undefined ? `${project.completionPct}%` : 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => onViewTasks(project.projectId)}>Tasks</Button>
                <Button size="sm" variant="secondary" onClick={() => onViewMilestones(project.projectId)}>Milestones</Button>
                {!isMockMode && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(project)}><span role="img" aria-label="edit" className="leading-none">✏️</span></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(project)}><span role="img" aria-label="trash" className="leading-none">🗑️</span></Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={isEditModalOpen} onClose={handleCloseEditModal} title={editingProject ? 'Edit Project' : 'Add New Project'}>
        <PortfolioItemForm
          type="project"
          item={editingProject || { programId: programId || '' }}
          onSave={handleSave}
          onCancel={handleCloseEditModal}
          programId={programId}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog open={isConfirmDeleteOpen} onCancel={handleCancelDelete} onConfirm={handleExecuteDelete} title="Confirm Project Deletion" body={`Are you sure you want to clear project "${projectToDelete?.projectName}"? This action will clear the row in Google Sheets.`} confirmLabel="Clear Row" tone="danger" />
    </ManagerEditorLayout>
  );
};

export default ProjectsPage;