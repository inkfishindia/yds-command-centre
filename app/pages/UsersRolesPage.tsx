
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ManagerEditorLayout, Card, Button, EmptyState, Table, StatusPill, Input, Select, Modal, ConfirmDialog } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement, UserAccountStatus } from '../types';
import { fetchValues, updateValues, appendValues, fetchHeaders } from '../lib/sheets';
import { USER_MANAGEMENT_SHEET_CONFIG } from '../src/config/userManagementSheetConfig';
import { parseUserManagementData } from '../services/userManagementSheetsParser';
import { getEnv } from '../lib/env';
import { useToast } from '../contexts/ToastContext';

const UsersRolesPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode, initialAuthCheckComplete } = useAuth();
  const { addToast } = useToast();
  
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserManagement> | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserManagement | null>(null);

  const sheetId = useMemo(() => {
    try {
      const stored = localStorage.getItem('user_management_sheet_id');
      if (stored) return stored;
      return getEnv('USER_MANAGEMENT_SHEET_ID');
    } catch (e) {
      console.warn("User Management Sheet ID not found in env or storage.");
      return '';
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!sheetId) {
      setError("User Management Spreadsheet ID is not configured.");
      return;
    }
    
    if (!isSignedIn && !isMockMode) return;

    setLoading(true);
    setError(null);
    try {
      // Use the specific sheet name from config
      const range = `'${USER_MANAGEMENT_SHEET_CONFIG.sheetName}'!A:Z`;
      const response = await fetchValues(sheetId, range);
      if (response && response.values) {
        const parsed = parseUserManagementData(response.values, USER_MANAGEMENT_SHEET_CONFIG);
        setUsers(parsed);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error("Users load error:", err);
      setError(err.message || "Failed to connect to Google Sheets.");
      addToast('Failed to load user list', 'error');
    } finally {
      setLoading(false);
    }
  }, [sheetId, isSignedIn, isMockMode, addToast]);

  useEffect(() => {
    if (initialAuthCheckComplete && (isSignedIn || isMockMode)) {
      loadUsers();
    }
  }, [initialAuthCheckComplete, isSignedIn, isMockMode, loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.fullName?.toLowerCase().includes(filterText.toLowerCase()) ||
      u.email?.toLowerCase().includes(filterText.toLowerCase()) ||
      u.role?.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [users, filterText]);

  const handleSaveUser = async (userData: Partial<UserManagement>) => {
    if (isMockMode) {
      addToast('Mock: Saved successfully (local only)', 'success');
      setIsModalOpen(false);
      return;
    }
    
    try {
      const headers = await fetchHeaders(sheetId, `'${USER_MANAGEMENT_SHEET_CONFIG.sheetName}'!A:Z`, 1);
      const isEditing = !!userData.id;
      const finalId = userData.id || `USR-${Date.now()}`;
      const finalData = { ...userData, id: finalId };
      
      const rowData = headers.map(h => {
        const field = Object.keys(USER_MANAGEMENT_SHEET_CONFIG.fieldToHeaderMap!).find(
          k => USER_MANAGEMENT_SHEET_CONFIG.fieldToHeaderMap![k as keyof UserManagement] === h
        );
        return field ? String((finalData as any)[field] || '') : '';
      });

      if (isEditing) {
        const idx = users.findIndex(u => u.id === userData.id);
        if (idx === -1) throw new Error("User not found in local state.");
        const rowNum = idx + 2; // +1 for header, +1 for 0-index
        await updateValues(sheetId, `'${USER_MANAGEMENT_SHEET_CONFIG.sheetName}'!A${rowNum}`, [rowData]);
      } else {
        await appendValues(sheetId, USER_MANAGEMENT_SHEET_CONFIG.sheetName, [rowData]);
      }
      
      addToast('User saved successfully', 'success');
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      addToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || isMockMode) {
      setIsConfirmDeleteOpen(false);
      return;
    }
    try {
      const idx = users.findIndex(u => u.id === userToDelete.id);
      const rowNum = idx + 2;
      const headers = await fetchHeaders(sheetId, `'${USER_MANAGEMENT_SHEET_CONFIG.sheetName}'!A:Z`, 1);
      const emptyRow = headers.map(() => '');
      await updateValues(sheetId, `'${USER_MANAGEMENT_SHEET_CONFIG.sheetName}'!A${rowNum}`, [emptyRow]);
      addToast('User record cleared', 'success');
      setIsConfirmDeleteOpen(false);
      loadUsers();
    } catch (err: any) {
      addToast('Error deleting user', 'error');
    }
  };

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Users & Roles">
        <Card title="Authentication Required">
          <EmptyState
            title="Please sign in to manage users"
            description="You need to be connected to the Google ecosystem to access the user registry."
            action={<Button variant="accent" onClick={signIn}>Sign in with Google 🚀</Button>}
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (error && !users.length) {
    return (
      <ManagerEditorLayout title="Users & Roles">
        <EmptyState 
          title="Connection Error" 
          description={error} 
          action={<Button onClick={loadUsers}>Retry Connection 🔄</Button>} 
        />
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Users & Roles" toolbar={
      <div className="flex gap-2">
        <Input placeholder="Search users..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-64" />
        <Button onClick={() => { setEditingUser({}); setIsModalOpen(true); }} variant="accent">Add User</Button>
        <Button onClick={() => loadUsers()} variant="secondary" disabled={loading}>
          {loading ? '...' : 'Refresh 🔄'}
        </Button>
      </div>
    }>
      <Card bodyClassName="!p-0 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">Fetching user data...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState title="No Users Found" description="The sheet is empty or the ID is incorrect." />
          </div>
        ) : (
          <Table headers={['Name', 'Email', 'Role', 'Hub', 'Status', 'Actions']}>
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-[var(--color-bg-stage)] transition-colors">
                <td className="px-6 py-4 font-bold text-[var(--color-text-primary)]">{user.fullName || 'Unnamed'}</td>
                <td className="px-6 py-4 text-[var(--color-text-secondary)] font-mono text-xs">{user.email}</td>
                <td className="px-6 py-4 text-sm">{user.role}</td>
                <td className="px-6 py-4 text-sm">{user.hub}</td>
                <td className="px-6 py-4"><StatusPill status={user.status}>{user.status}</StatusPill></td>
                <td className="px-6 py-4 text-right">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="mr-2">✏️</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setUserToDelete(user); setIsConfirmDeleteOpen(true); }}>🗑️</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser?.id ? 'Edit User Profile' : 'Register New User'}>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveUser(editingUser!); }}>
          <Input label="Full Name" value={editingUser?.fullName || ''} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} required />
          <Input label="Email Address" type="email" value={editingUser?.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
          <Input label="Role Title" value={editingUser?.role || ''} onChange={e => setEditingUser({...editingUser, role: e.target.value})} />
          <Input label="Department" value={editingUser?.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} />
          <Input label="Assigned Hub" value={editingUser?.hub || ''} onChange={e => setEditingUser({...editingUser, hub: e.target.value})} />
          <Select label="Account Status" options={Object.values(UserAccountStatus).map(v => ({value: v, label: v}))} value={editingUser?.status || UserAccountStatus.ACTIVE} onChange={v => setEditingUser({...editingUser, status: v as UserAccountStatus})} />
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border-primary)]">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Commit Changes 💾</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={isConfirmDeleteOpen} onCancel={() => setIsConfirmDeleteOpen(false)} onConfirm={handleDeleteUser} title="Confirm Deletion" body={`Are you sure you want to delete ${userToDelete?.fullName}? This will clear their record in the primary Google Sheet.`} tone="danger" />
    </ManagerEditorLayout>
  );
};

export default UsersRolesPage;
