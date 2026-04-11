// components/orders/MarkPackedModal.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Textarea, Select, Checkbox } from '../../ui';
import { OrderItem, ProductWorkflowStatus, TeamMember } from '../../types';
import { getFinishingStatusEmoji } from '../../utils/orderUtils'; // Re-use finishing status emoji for now

interface MarkPackedModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null; // The specific OrderItem being packed
  onSave: (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => Promise<void>;
  loading: boolean;
  teamMembers: TeamMember[]; // List of available team members for assignment
}

const MarkPackedModal: React.FC<MarkPackedModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  loading,
  teamMembers,
}) => {
  const [packingBy, setPackingBy] = useState('');
  const [whitelabelRequired, setWhitelabelRequired] = useState(false);
  const [whitelabelType, setWhitelabelType] = useState('');
  const [packingNotes, setPackingNotes] = useState('');

  React.useEffect(() => {
    if (item) {
      setPackingBy(item.packingBy || '');
      setWhitelabelRequired(item.whitelabelRequired || false);
      setWhitelabelType(item.whitelabelType || '');
      setPackingNotes(item.internal_notes || ''); // Reuse internal_notes for packing notes
    }
  }, [item, isOpen]);

  const handlePackingByChange = useCallback((value: string) => {
    setPackingBy(value);
  }, []);

  const handleWhitelabelRequiredChange = useCallback((checked: boolean) => {
    setWhitelabelRequired(checked);
    if (!checked) {
      setWhitelabelType('');
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!packingBy.trim()) {
      alert('Please select who completed packing.');
      return;
    }
    if (whitelabelRequired && !whitelabelType.trim()) {
      alert('Please specify whitelabel type if required.');
      return;
    }

    const updatedFields: Partial<OrderItem> = {
      packingBy: packingBy,
      packedAt: new Date().toISOString().split('T')[0],
      whitelabelRequired: whitelabelRequired,
      whitelabelType: whitelabelType,
      internal_notes: packingNotes, // Update generic notes field
    };
    const newStatus = ProductWorkflowStatus.PACKED;

    await onSave(item, updatedFields, newStatus);
    onClose();
  }, [item, packingBy, whitelabelRequired, whitelabelType, packingNotes, onSave, onClose]);

  const modalTitle = `Mark Packed: ${item?.product} (Order #${item?.orderNumber})`;

  const packingTeamOptions = useMemo(() => {
    return teamMembers
      .filter(member => member.role.toLowerCase().includes('packing') || member.role.toLowerCase().includes('fulfillment') || member.role.toLowerCase().includes('production'))
      .map(member => ({
        value: member.id, // Save member.id
        label: member.fullName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teamMembers]);

  if (!item) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Packed By"
          options={packingTeamOptions}
          value={packingBy}
          onChange={handlePackingByChange}
          placeholder="Select Person"
          required
          disabled={loading}
        />
        <Checkbox
          label="Whitelabel Required"
          checked={whitelabelRequired}
          onChange={handleWhitelabelRequiredChange}
          disabled={loading}
        />
        {whitelabelRequired && (
          <Input
            label="Whitelabel Type"
            value={whitelabelType}
            onChange={(e) => setWhitelabelType(e.target.value)}
            placeholder="e.g., Custom Box, Branded Tag"
            required={whitelabelRequired}
            disabled={loading}
          />
        )}
        <Textarea
          label="Packing Notes"
          value={packingNotes}
          onChange={(e) => setPackingNotes(e.target.value)}
          rows={3}
          placeholder="Add any relevant notes from the packing process."
          disabled={loading}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !packingBy.trim() || (whitelabelRequired && !whitelabelType.trim())}>
            {loading ? 'Saving...' : 'Mark Packed & Next'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkPackedModal;