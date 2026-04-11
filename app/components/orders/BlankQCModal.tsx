// components/orders/BlankQCModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Select, Textarea } from '../../ui';
import { OrderItem, ProductWorkflowStatus, BlankQCStatus } from '../../types';

interface BlankQCModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null; // The specific OrderItem being inspected
  onSave: (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
}

const BlankQCModal: React.FC<BlankQCModalProps> = ({
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
        blank_qc_status: item.blank_qc_status || BlankQCStatus.PENDING,
        blank_qc_by: item.blank_qc_by,
        qc_notes: item.qc_notes, // Reuse qc_notes for blank QC notes
      });
    }
  }, [item, isOpen]);

  const handleInputChange = (field: keyof OrderItem, value: string | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent, status: BlankQCStatus) => {
    e.preventDefault();
    if (!item) return;

    if (!formData.blank_qc_by?.trim()) {
      alert('Please enter QC Inspector name.');
      return;
    }

    const updatedFields: Partial<OrderItem> = {
      blank_qc_status: status,
      blank_qc_by: formData.blank_qc_by,
      blank_qc_at: new Date().toISOString().split('T')[0],
      qc_notes: formData.qc_notes,
    };

    let newProductStatus: ProductWorkflowStatus;
    if (status === BlankQCStatus.PASSED) {
      newProductStatus = ProductWorkflowStatus.BATCHED;
    } else { // Failed
      newProductStatus = ProductWorkflowStatus.QUEUED_FOR_PICK; // Send back to pick list
      // Or set to a new 'Blank_Rejected' status if it exists, for now back to pick.
      // A more robust system would update inventory and log the failed blank.
    }

    await onSave(item, updatedFields, newProductStatus);
    onClose();
  }, [item, formData, onSave, onClose]);

  const modalTitle = `Inspect Blank Quality: ${item?.product} (Order #${item?.orderNumber})`;

  if (!item) return null;

  const qcStatusOptions = useMemo(() => ([
    { value: BlankQCStatus.PASSED, label: 'Passed' },
    { value: BlankQCStatus.FAILED, label: 'Failed' },
  ]), []);


  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form className="space-y-4">
        <Input
          label="QC Inspector Name"
          value={formData.blank_qc_by || ''}
          onChange={(e) => handleInputChange('blank_qc_by', e.target.value)}
          required
          placeholder="e.g., Jane Smith"
          disabled={loading}
        />
        <Textarea
          label="QC Notes"
          value={formData.qc_notes || ''}
          onChange={(e) => handleInputChange('qc_notes', e.target.value)}
          rows={3}
          placeholder="Enter any observations or defects."
          disabled={loading}
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" onClick={(e) => handleSubmit(e, BlankQCStatus.FAILED)} disabled={loading || !formData.blank_qc_by?.trim()}>
            {loading ? 'Saving...' : 'Fail & Re-pick'}
          </Button>
          <Button type="submit" variant="primary" onClick={(e) => handleSubmit(e, BlankQCStatus.PASSED)} disabled={loading || !formData.blank_qc_by?.trim()}>
            {loading ? 'Saving...' : 'Pass & Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BlankQCModal;