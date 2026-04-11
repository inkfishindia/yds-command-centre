// pages/ProgramsPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, Modal, ConfirmDialog, Select, ManagerEditorLayout, PortfolioItemDetailDrawer } from '../ui';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { requestAllGoogleApiTokens } from '../lib/googleAuth';
import { fetchValues } from '../lib/sheets';
import {
  Program,
  ProgramStatus,
  ProgramHealthStatus,
  ProgramRiskLevel,
  ProgramPriority,
  OnTrackIndicator,
  ProgramsPageProps, // Import the updated props interface
} from '../types';
import { PROGRAMS_SHEET_CONFIG } from '../src/config/programSheetConfig';
import { parseProgramsData } from '../services/programSheetsParser';
import { getEnv } from '../lib/env';
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm'; // Updated import
import { usePortfolio } from '../contexts/PortfolioContext'; // Updated import to use context

// Key for local storage
const PROGRAMS_SHEET_ID_LS_KEY = 'programs_google_sheet_id';
const DEFAULT_PROGRAMS_SHEET_ID_ENV_KEY = 'PROGRAMS_GOOGLE_SHEET_ID';

const ProgramsPage: React.FC<ProgramsPageProps> = ({ onViewProjects }) => {
  const { addToast } = useToast();
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  
  const {
    programs,
    programSheetId,
    setProgramSheetId,
    loading,
    error,
    showPermissionPrompt,
    loadPortfolioData,
    handleGrantSheetsAccess,
    saveItem,
    deleteItem,
    team,
    hubs,
    teamMemberMap,
  } = usePortfolio();

  // State for Add/Edit Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // State for Delete Confirmation Dialog
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

  // State for Detail Drawer
  const [detailProgram, setDetailProgram] = useState<Program | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<ProgramPriority | 'All'>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [hubFilter, setHubFilter] = useState<string>('All');


  const filteredPrograms = useMemo(() => {
    let currentPrograms = programs;

    if (statusFilter !== 'All') {
      currentPrograms = currentPrograms.filter(p => p.status === statusFilter);
    }
    if (priorityFilter !== 'All') {
      currentPrograms = currentPrograms.filter(p => p.priority === priorityFilter);
    }
    if (ownerFilter !== 'All') {
      currentPrograms = currentPrograms.filter(p => {
        const owner = teamMemberMap.get(p.ownerPersonId || '');
        return (owner?.fullName || p.ownerPersonId) === ownerFilter;
      });
    }
    if (hubFilter !== 'All') {
      currentPrograms = currentPrograms.filter(p => {
        const owner = teamMemberMap.get(p.ownerPersonId || '');
        return (owner?.primaryHubName || p.ownerHubId) === hubFilter;
      });
    }

    return currentPrograms;
  }, [programs, statusFilter, priorityFilter, ownerFilter, hubFilter, teamMemberMap]);

  const programStatusOptions = useMemo(() => ['All', ...Object.values(ProgramStatus).sort()], []);
  const programPriorityOptions = useMemo(() => ['All', ...Object.values(ProgramPriority).sort()], []);
  const ownerOptions = useMemo(() => ['All', ...Array.from(new Set(team.map(m => m.fullName))).sort()], [team]);
  const hubOptions = useMemo(() => ['All', ...Array.from(new Set(hubs.map(h => h.name))).sort()], [hubs]);

  const handleLoadData = useCallback(() => {
    loadPortfolioData(true);
  }, [loadPortfolioData]);

  // CRUD Operations & Detail Drawer
  const handleOpenForm = useCallback((program: Program | null) => {
    setEditingProgram(program);
    setIsFormModalOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormModalOpen(false);
    setEditingProgram(null);
  }, []);

  const handleSave = useCallback(async (itemData: Partial<Program>) => {
    // Parent ID is null for Programs as they are top-level
    await saveItem('program', itemData, null);
    handleCloseForm();
  }, [saveItem, handleCloseForm]);

  const handleConfirmDelete = useCallback((program: Program) => {
    setProgramToDelete(program);
    setIsConfirmDeleteOpen(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsConfirmDeleteOpen(false);
    setProgramToDelete(null);
  }, []);

  const handleExecuteDelete = useCallback(async () => {
    if (programToDelete) {
      await deleteItem('program', programToDelete);
      handleCancelDelete();
    }
  }, [programToDelete, deleteItem, handleCancelDelete]);

  const handleRowClick = useCallback((program: Program) => {
    setDetailProgram(program);
  }, []);

  const handleCloseDetailDrawer = useCallback(() => {
    setDetailProgram(null);
  }, []);

  const handleEditFromDrawer = useCallback((type: 'program', item: Program) => {
    setDetailProgram(null); // Close drawer
    handleOpenForm(item); // Open edit form
  }, [handleOpenForm]);

  const handleDeleteFromDrawer = useCallback((type: 'program', item: Program) => {
    setDetailProgram(null); // Close drawer
    handleConfirmDelete(item); // Open delete confirm
  }, [handleConfirmDelete]);


  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Programs 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Program
        </Button>
      )}
      <Select
        options={programStatusOptions.map(s => ({ value: s, label: s }))}
        value={statusFilter}
        onChange={(val) => setStatusFilter(val as ProgramStatus | 'All')}
        placeholder="Filter by Status"
        className="w-40"
        aria-label="Filter programs by status"
      />
      <Select
        options={programPriorityOptions.map(p => ({ value: p, label: p }))}
        value={priorityFilter}
        onChange={(val) => setPriorityFilter(val as ProgramPriority | 'All')}
        placeholder="Filter by Priority"
        className="w-40"
        aria-label="Filter programs by priority"
      />
      <Select
        options={ownerOptions.map(o => ({ value: o, label: o }))}
        value={ownerFilter}
        onChange={setOwnerFilter}
        placeholder="Filter by Owner"
        className="w-40"
        aria-label="Filter programs by owner"
      />
      <Select
        options={hubOptions.map(h => ({ value: h, label: h }))}
        value={hubFilter}
        onChange={setHubFilter}
        placeholder="Filter by Hub"
        className="w-40"
        aria-label="Filter programs by hub"
      />
    </div>
  );

  const programsTableHeaders = useMemo(() => [
    'Program ID', 'Name', 'Status', 'Priority', 'Health', 'Owner', 'Projects', 'Tasks', 'Budget Total', 'Progress', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Programs">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Programs data"
            description="Connect your Google account to fetch and view your programs from Google Sheets."
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

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title="Programs">
        <Card title="Google Sheets Access Permissions Needed">
          <EmptyState
            title="Grant Google Sheets access to load data"
            description={error || "This application needs your explicit permission to read data from your Google Sheets. A pop-up will appear to request your consent."}
            action={
              <Button variant="accent" onClick={handleGrantSheetsAccess} disabled={isAuthActionInProgress}>
                {isAuthActionInProgress ? 'Requesting access...' : 'Grant Sheets Access 📄'}
              </Button>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (loading && !programs.length) {
    return (
      <ManagerEditorLayout title="Programs">
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading programs data from Google Sheet...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!programSheetId || error) && !programs.length && !isMockMode) {
    return (
      <ManagerEditorLayout title="Programs">
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Programs" : "No Programs Found"}
            description={error || "Enter the Google Sheet ID for your programs to get started."}
            action={
              <div className="space-y-4">
                <Input
                  label="Google Spreadsheet ID"
                  id="programSheetIdInput"
                  value={programSheetId}
                  onChange={(e) => setProgramSheetId(e.target.value)}
                  placeholder="Enter Google Spreadsheet ID"
                  helperText="Found in the sheet URL: https://docs.google.com/spreadsheets/d/YOUR_ID/edit"
                  required
                />
                <Button onClick={handleLoadData} disabled={!programSheetId || loading || isAuthActionInProgress} variant="primary">
                  {loading ? 'Loading...' : 'Retry Load from Sheet 📄'}
                </Button>
              </div>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Programs" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Overview and management of all active and planned programs across your organization.</p>

      {filteredPrograms.length === 0 ? (
        <EmptyState
          title="No Programs Found"
          description="Your sheet is either empty or no programs match the current filters. Add some programs or adjust filters to see them here."
          action={!isMockMode && <Button variant="primary" onClick={() => handleOpenForm(null)}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Program</Button>}
        />
      ) : (
        <Table headers={programsTableHeaders}>
          {filteredPrograms.map((program) => (
            <tr key={program.programId}
                className="hover:bg-[var(--color-bg-stage)]/80 group cursor-pointer"
                onClick={() => handleRowClick(program)}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRowClick(program)}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-brand-primary)]">
                {program.programId}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">
                {program.programName}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {program.status && <StatusPill status={program.status}>{program.status}</StatusPill>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {program.priority && <StatusPill status={program.priority}>{program.priority}</StatusPill>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {program.healthStatus && <StatusPill status={program.healthStatus}>{program.healthStatus}</StatusPill>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                {teamMemberMap.get(program.ownerPersonId || '')?.fullName || program.ownerPersonId || 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                {program.projectsCount !== undefined ? program.projectsCount : 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                {program.tasksTotal !== undefined ? program.tasksTotal : 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                {program.budgetTotal !== undefined ? `₹${program.budgetTotal.toLocaleString()}` : 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                {program.timelineProgressPct !== undefined ? `${program.timelineProgressPct}%` : 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onViewProjects(program.programId); }} // Keep view projects link
                  aria-label={`View projects for program ${program.programName}`}
                >
                  View Projects 👁️
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <PortfolioItemDetailDrawer
        isOpen={!!detailProgram}
        onClose={handleCloseDetailDrawer}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        data={detailProgram ? { type: 'program', item: detailProgram } : null}
        isMockMode={isMockMode}
        teamMemberMap={teamMemberMap}
        onViewTeamMemberDetails={(member) => { /* Not implemented yet, but keeping prop signature */}}
      />

      <Modal open={isFormModalOpen} onClose={handleCloseForm} title={editingProgram ? 'Edit Program' : 'Add New Program'}>
        <PortfolioItemForm
          type="program"
          item={editingProgram}
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
        title="Confirm Program Deletion"
        body={`Are you sure you want to clear program "${programToDelete?.programName}"? This action will clear the row in Google Sheets.`}
        confirmLabel="Clear Row"
        tone="danger"
      />
    </ManagerEditorLayout>
  );
};

export default ProgramsPage;