// components/orders/PickActionModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input } from '../../ui';
import { OrderItem, ProductWorkflowStatus } from '../../types';

interface PickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[]; // The group of items being marked as picked
  onSave: (itemIds: string[], pickerName: string, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
  groupKey: string; // The blank_article_sku group key
}

const PickActionModal: React.FC<PickActionModalProps> = ({
  isOpen,
  onClose,
  items,
  onSave,
  loading,
  groupKey,
}) => {
  const [pickerName, setPickerName] = useState('');

  React.useEffect(() => {
    // Reset picker name when modal opens
    if (isOpen) {
      setPickerName('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickerName.trim()) {
      alert('Please enter picker name.');
      return;
    }
    const itemIds = items.map(item => item.id);
    await onSave(itemIds, pickerName, ProductWorkflowStatus.BLANK_PICKED);
    onClose();
  }, [items, pickerName, onSave, onClose]);

  const modalTitle = `Mark Picked: ${groupKey}`;

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          You are marking <strong>{items.length}</strong> items as picked for the group: <strong>{groupKey}</strong>.
        </p>
        <Input
          label="Picker Name"
          value={pickerName}
          onChange={(e) => setPickerName(e.target.value)}
          required
          placeholder="e.g., John Doe"
          disabled={loading}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !pickerName.trim()}>
            {loading ? 'Saving...' : 'Mark Picked & Next'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PickActionModal;