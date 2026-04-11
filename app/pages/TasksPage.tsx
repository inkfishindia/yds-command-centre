import React, { useState, useMemo, useCallback } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, ManagerEditorLayout } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { Task, TasksPageProps } from '../types';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm';
import { usePortfolio } from '../contexts/PortfolioContext';


const TasksPage: React.FC<TasksPageProps> = ({ projectId }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    tasks, taskSheetId, setTaskSheetId, 
    loading, error, showPermissionPrompt, handleGrantSheetsAccess, 
    saveItem, deleteItem, loadPortfolioData, team, hubs 
  } = usePortfolio();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  const filteredTasks = useMemo(() => 
    projectId ? tasks.filter(t => t.projectId === projectId) : tasks,
  [tasks, projectId]);

  const handleOpenEditModal = (task: Task | null) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  const handleSave = useCallback(async (itemData: Partial<Task>) => {
    await saveItem('task', itemData, projectId);
    handleCloseEditModal();
  }, [saveItem, projectId]);

  const handleConfirmDelete = (task: Task) => {
    setTaskToDelete(task);
    setIsConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setTaskToDelete(null);
  };

  const handleExecuteDelete = async () => {
    if (taskToDelete) {
      await deleteItem('task', taskToDelete);
      handleCancelDelete();
    }
  };

  const toolbar = (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadPortfolioData(true)} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Tasks 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenEditModal(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Task
        </Button>
      )}
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Tasks">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Tasks data"
            description="Connect your Google account to manage your tasks from Google Sheets."
            action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Tasks">
        <Card title="Permissions Needed">
          <EmptyState
            title="Grant Google Sheets access"
            description={error || "Permission is needed to read task data from your Google Sheet."}
            action={<Button variant="accent" onClick={handleGrantSheetsAccess}>Grant Access 📄</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (loading && !tasks.length) {
    return <ManagerEditorLayout title="Tasks"><div className="text-center py-10">Loading tasks...</div></ManagerEditorLayout>;
  }

  if ((!taskSheetId || error) && !tasks.length && !isMockMode) {
    return (
     <ManagerEditorLayout title="Tasks">
       <Card title={error ? "Data Load Error" : "Configure Data Source"}>
         <EmptyState
           title={error ? "Failed to load Tasks" : "No Tasks Found"}
           description={error || "Enter the Google Sheet ID for your tasks to get started."}
           action={
             <div className="space-y-4">
               <Input
                 label="Google Spreadsheet ID"
                 value={taskSheetId}
                 onChange={(e) => setTaskSheetId(e.target.value)}
                 placeholder="Enter Google Spreadsheet ID"
                 required
               />
               <Button onClick={() => loadPortfolioData(true)} disabled={!taskSheetId || loading} variant="primary">
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
    <ManagerEditorLayout title={projectId ? `Tasks for Project ${projectId}` : "All Tasks"} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage project tasks. {projectId && `Filtered by Project: ${projectId}`}</p>
      {filteredTasks.length === 0 ? (
        <EmptyState title={projectId ? "No Tasks for this Project" : "No Tasks Found"} description={projectId ? "Add a new task to this project." : "There are no tasks in your data source."}/>
      ) : (
        <Table headers={['ID', 'Name', 'Status', 'Priority', 'Owner', 'Due Date', 'Actions']}>
          {filteredTasks.map(task => (
            <tr key={task.taskId} className="hover:bg-[var(--color-bg-stage)]/80 group">
              <td className="px-4 py-3 font-mono text-sm text-[var(--color-brand-primary)]">{task.taskId}</td>
              <td className="px-4 py-3 font-medium text-sm">{task.taskName}</td>
              <td className="px-4 py-3 text-sm">{task.status && <StatusPill status={task.status}>{task.status}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm">{task.priority && <StatusPill status={task.priority}>{task.priority}</StatusPill>}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{task.ownerName}</td>
              <td className="px-4 py-3 text-sm">{task.dueDate || 'N/A'}</td>
              <td className="px-4 py-3 text-right flex space-x-2 justify-end">
                {!isMockMode && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(task)}><span role="img" aria-label="edit" className="leading-none">✏️</span></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(task)}><span role="img" aria-label="trash" className="leading-none">🗑️</span></Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={isEditModalOpen} onClose={handleCloseEditModal} title={editingTask ? 'Edit Task' : 'Add New Task'}>
        <PortfolioItemForm
          type="task"
          item={editingTask || { projectId: projectId || '' }}
          onSave={handleSave}
          onCancel={handleCloseEditModal}
          projectId={projectId}
          team={team}
          hubs={hubs}
        />
      </Modal>

      <ConfirmDialog open={isConfirmDeleteOpen} onCancel={handleCancelDelete} onConfirm={handleExecuteDelete} title="Confirm Task Deletion" body={`Are you sure you want to clear task "${taskToDelete?.taskName}"? This action will clear the row in Google Sheets.`} confirmLabel="Clear Row" tone="danger" />
    </ManagerEditorLayout>
  );
};

export default TasksPage;