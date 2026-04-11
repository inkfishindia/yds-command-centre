// components/orders/MarkProductionCompleteModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Textarea } from '../../ui';
import { OrderItem, ProductWorkflowStatus } from '../../types';

interface MarkProductionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null; // The specific OrderItem being completed
  onSave: (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
}

const MarkProductionCompleteModal: React.FC<MarkProductionCompleteModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<OrderItem>>({});

  React.useEffect(() => {
    if (item) {
      setFormData({
        production_time_seconds: item.production_time_seconds,
        qc_notes: item.qc_notes, // Reuse QC notes for any production notes if applicable
      });
    }
  }, [item, isOpen]);

  const handleInputChange = (field: keyof OrderItem, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const updatedFields: Partial<OrderItem> = {
      print_completed_at: new Date().toISOString().split('T')[0],
      production_time_seconds: formData.production_time_seconds,
      qc_notes: formData.qc_notes,
    };
    const newStatus = ProductWorkflowStatus.FINISHING_PENDING;

    await onSave(item, updatedFields, newStatus);
    onClose();
  }, [item, formData, onSave, onClose]);

  const modalTitle = `Complete Printing: ${item?.product} (Order #${item?.orderNumber})`;

  if (!item) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Production Time (seconds)"
          type="number"
          value={formData.production_time_seconds ?? ''}
          onChange={(e) => handleInputChange('production_time_seconds', parseFloat(e.target.value) || undefined)}
          placeholder="e.g., 360"
          disabled={loading}
        />
        <Textarea
          label="Production Notes"
          value={formData.qc_notes || ''} // Reusing qc_notes for generic production notes
          onChange={(e) => handleInputChange('qc_notes', e.target.value)}
          rows={3}
          placeholder="Add any relevant notes from the production process."
          disabled={loading}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Mark Complete & Next'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkProductionCompleteModal;