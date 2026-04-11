// components/orders/AssignToOperatorModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Select } from '../../ui';
import { OrderItem, ProductWorkflowStatus, TeamMember } from '../../types';

interface AssignToOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[]; // The group of items being assigned
  onSave: (itemIds: string[], operatorId: string, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
  groupKey: string; // The print_technology group key
  teamMembers: TeamMember[]; // List of available team members for assignment
}

const AssignToOperatorModal: React.FC<AssignToOperatorModalProps> = ({
  isOpen,
  onClose,
  items,
  onSave,
  loading,
  groupKey,
  teamMembers,
}) => {
  const [selectedOperatorId, setSelectedOperatorId] = useState('');

  React.useEffect(() => {
    // Reset selected operator when modal opens
    if (isOpen) {
      setSelectedOperatorId('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperatorId) {
      alert('Please select an operator.');
      return;
    }
    const itemIds = items.map(item => item.id);
    await onSave(itemIds, selectedOperatorId, ProductWorkflowStatus.IN_PRODUCTION);
    onClose();
  }, [items, selectedOperatorId, onSave, onClose]);

  const modalTitle = `Assign Operator for Batch: ${groupKey}`;

  const operatorOptions = useMemo(() => {
    return teamMembers
      .filter(member => member.role.toLowerCase().includes('production') || member.role.toLowerCase().includes('operator'))
      .map(member => ({
        value: member.id,
        label: member.fullName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamMembers]);

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          You are assigning <strong>{items.length}</strong> items from the batch: <strong>{groupKey}</strong>.
        </p>
        <Select
          label="Assign to Operator"
          options={operatorOptions}
          value={selectedOperatorId}
          onChange={setSelectedOperatorId}
          placeholder="Select an Operator"
          required
          disabled={loading}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !selectedOperatorId}>
            {loading ? 'Assigning...' : 'Assign & Start'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignToOperatorModal;