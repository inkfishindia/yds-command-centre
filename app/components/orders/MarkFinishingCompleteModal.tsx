// components/orders/MarkFinishingCompleteModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Textarea, Select } from '../../ui';
import { OrderItem, ProductWorkflowStatus, TeamMember } from '../../types';

interface MarkFinishingCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null; // The specific OrderItem being completed
  onSave: (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
  teamMembers: TeamMember[]; // List of available team members for assignment
}

const MarkFinishingCompleteModal: React.FC<MarkFinishingCompleteModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  loading,
  teamMembers,
}) => {
  const [finishingBy, setFinishingBy] = useState('');
  const [finishingNotes, setFinishingNotes] = useState('');
  const [finishingStatus, setFinishingStatus] = useState<string | undefined>(undefined); // NEW: State for finishingStatus

  React.useEffect(() => {
    if (item) {
      setFinishingBy(item.finishing_by || '');
      setFinishingNotes(item.qc_notes || ''); // Reuse QC notes for generic finishing notes
      setFinishingStatus(item.finishingStatus); // NEW: Initialize with item's finishingStatus
    }
  }, [item, isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!finishingBy.trim() || !finishingStatus) { // NEW: Validate finishingStatus
      alert('Please select the person who completed finishing and the finishing status.');
      return;
    }

    const updatedFields: Partial<OrderItem> = {
      finishing_by: finishingBy,
      finishing_completed_at: new Date().toISOString().split('T')[0],
      qc_notes: finishingNotes, // Update generic notes field
      finishingStatus: finishingStatus, // NEW: Update finishingStatus
    };
    const newStatus = ProductWorkflowStatus.FULFILLMENT_PENDING; // Route to Fulfillment Pending

    await onSave(item, updatedFields, newStatus);
    onClose();
  }, [item, finishingBy, finishingNotes, finishingStatus, onSave, onClose]);


  const modalTitle = `Complete Finishing: ${item?.product} (Order #${item?.orderNumber})`;

  const finishingTeamOptions = useMemo(() => {
    return teamMembers
      .filter(member => member.role.toLowerCase().includes('finishing') || member.role.toLowerCase().includes('production') || member.role.toLowerCase().includes('operator'))
      .map(member => ({
        value: member.id, // Save member.id
        label: member.fullName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamMembers]);

  // NEW: Options for finishingStatus
  const finishingStatusOptions = useMemo(() => ([
    { value: 'Completed', label: 'Completed' },
    { value: 'QC Pending', label: 'QC Pending' }, // Example for another stage
    { value: 'Rework', label: 'Rework' },
  ]), []);


  if (!item) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Completed By"
          options={finishingTeamOptions}
          value={finishingBy}
          onChange={setFinishingBy}
          placeholder="Select Person"
          required
          disabled={loading}
        />
        <Select // NEW: Select for finishingStatus
          label="Finishing Status"
          options={finishingStatusOptions}
          value={finishingStatus || ''}
          onChange={setFinishingStatus}
          placeholder="Select Finishing Status"
          required
          disabled={loading}
        />
        <Textarea
          label="Finishing Notes"
          value={finishingNotes}
          onChange={(e) => setFinishingNotes(e.target.value)}
          rows={3}
          placeholder="Add any relevant notes from the finishing process (e.g., quality check, special handling)."
          disabled={loading}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !finishingBy.trim() || !finishingStatus}>
            {loading ? 'Saving...' : 'Mark Complete & Next'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkFinishingCompleteModal;