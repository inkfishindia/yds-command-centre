// components/orders/MarkShippedModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Textarea, Select } from '../../ui';
import { OrderItem, ProductWorkflowStatus } from '../../types';

interface MarkShippedModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null; // The specific OrderItem being shipped
  onSave: (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
}

const MarkShippedModal: React.FC<MarkShippedModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  loading,
}) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');

  React.useEffect(() => {
    if (item) {
      setTrackingNumber(item.trackingNumber || '');
      setCarrier(item.carrier || '');
      setExpectedShipDate(item.expectedShipDate || '');
      setShippingNotes(item.internal_notes || ''); // Reuse internal_notes for shipping notes
    }
  }, [item, isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!trackingNumber.trim() || !carrier.trim()) {
      alert('Please enter tracking number and carrier.');
      return;
    }

    const updatedFields: Partial<OrderItem> = {
      trackingNumber: trackingNumber,
      carrier: carrier,
      shippedAt: new Date().toISOString().split('T')[0],
      expectedShipDate: expectedShipDate || new Date().toISOString().split('T')[0],
      internal_notes: shippingNotes, // Update generic notes field
    };
    const newStatus = ProductWorkflowStatus.SHIPPED;

    await onSave(item, updatedFields, newStatus);
    onClose();
  }, [item, trackingNumber, carrier, expectedShipDate, shippingNotes, onSave, onClose]);

  const modalTitle = `Mark Shipped: ${item?.product} (Order #${item?.orderNumber})`;

  const carrierOptions = useMemo(() => ([
    { value: 'BlueDart', label: 'BlueDart' },
    { value: 'Delhivery', label: 'Delhivery' },
    { value: 'FedEx', label: 'FedEx' },
    { value: 'DTDC', label: 'DTDC' },
    { value: 'Other', label: 'Other' },
  ]), []);

  if (!item) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tracking Number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="e.g., BLUEXYZ12345"
          required
          disabled={loading}
        />
        <Select
          label="Carrier"
          options={carrierOptions}
          value={carrier}
          onChange={setCarrier}
          placeholder="Select Carrier"
          required
          disabled={loading}
        />
        <Input
          label="Expected Ship Date"
          type="date"
          value={expectedShipDate}
          onChange={(e) => setExpectedShipDate(e.target.value)}
          disabled={loading}
        />
        <Textarea
          label="Shipping Notes"
          value={shippingNotes}
          onChange={(e) => setShippingNotes(e.target.value)}
          rows={3}
          placeholder="Add any relevant notes for shipping."
          disabled={loading}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !trackingNumber.trim() || !carrier.trim()}>
            {loading ? 'Saving...' : 'Mark Shipped'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkShippedModal;