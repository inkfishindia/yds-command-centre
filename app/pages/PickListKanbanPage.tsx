// pages/PickListKanbanPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Button, Input, EmptyState, StatusPill, ManagerEditorLayout, Modal, ConfirmDialog, Tag } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { OrderItem, ProductWorkflowStatus, OrderStatus, PickListKanbanPageProps, BlankQCStatus } from '../types';
import PickActionModal from '../components/orders/PickActionModal';
import BlankQCModal from '../components/orders/BlankQCModal';
import OrderItemDetailDrawer from '../components/orders/OrderItemDetailDrawer';
import { getProductWorkflowStatusEmoji, getSalesChannelTagColor } from '../utils/orderUtils';
import DemoModeBanner from '../components/layout/DemoModeBanner';

interface PickListCardProps {
  item: OrderItem;
  onViewDetails: (item: OrderItem) => void;
  // No direct action on individual cards in "To Pick" as actions are on groups.
  // Actions for Blank QC column:
  onPerformQC: (item: OrderItem) => void;
}

const PickListCard: React.FC<PickListCardProps> = ({ item, onViewDetails, onPerformQC }) => {
  const isRush = item.is_rush_order;

  return (
    <div
      className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-[var(--color-border-primary)] hover:border-[var(--color-brand-primary)] group cursor-pointer"
      style={{ boxShadow: 'var(--shadow-elevation)' }}
      onClick={() => onViewDetails(item)}
      tabIndex={0}
      role="button"
      aria-label={`Pick list item for order ${item.orderNumber}, product ${item.product}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-2">
          <h4 className="text-md font-bold text-[var(--color-text-primary)]">Order #: {item.orderNumber}</h4>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{item.customerName}</p>
        </div>
        {isRush && <Tag color="green">Rush! ⚡</Tag>}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        {item.design_thumbnail_url && (
          <img src={item.design_thumbnail_url} alt="Design thumbnail" className="w-12 h-12 object-contain rounded" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-[var(--color-brand-primary)]">{item.product}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Blank SKU: {item.blank_article_sku}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Qty: {item.quantity}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Location: {item.stock_location || 'N/A'}</p>
        </div>
      </div>
      {item.productStatus === ProductWorkflowStatus.BLANK_PICKED && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); onPerformQC(item); }}>
            Inspect Blank QC 🕵️
          </Button>
        </div>
      )}
    </div>
  );
};

// Define the type for groupedItems
interface GroupedPickListItems {
  toPick: Record<string, OrderItem[]>;
  blankQC: OrderItem[];
  batched: Record<string, OrderItem[]>;
}

const PickListKanbanPage: React.FC<PickListKanbanPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, saveItem, handleGrantSheetsAccess,
  } = useOrder();

  const [filterOrderNumber, setFilterOrderNumber] = useState('');
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterBlankSku, setFilterBlankSku] = useState('');

  // Modals for pick/QC actions
  const [isPickActionModalOpen, setIsPickActionModalOpen] = useState(false);
  const [itemsToPick, setItemsToPick] = useState<OrderItem[]>([]);
  const [currentPickGroupKey, setCurrentPickGroupKey] = useState('');

  const [isBlankQCModalOpen, setIsBlankQCModalOpen] = useState(false);
  const [itemForQC, setItemForQC] = useState<OrderItem | null>(null);

  // Detail Drawer
  const [detailOrderItem, setDetailOrderItem] = useState<OrderItem | null>(null);

  // Client-side tracking for top widget (Ready for production)
  const [readyForProductionCount, setReadyForProductionCount] = useState(0);
  const [readyForProductionBatches, setReadyForProductionBatches] = useState(0);

  useEffect(() => {
    // Calculate initial ready for production count
    const batchedItems = orderItems.filter(item => item.productStatus === ProductWorkflowStatus.BATCHED);
    const uniqueBatches = new Set(batchedItems.map(item => item.batchId).filter(Boolean));
    setReadyForProductionCount(batchedItems.length);
    setReadyForProductionBatches(uniqueBatches.size);
  }, [orderItems]);

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const filteredItems = useMemo(() => {
    return orderItems.filter(item => {
      const matchesOrderNumber = filterOrderNumber.trim() === '' || item.orderNumber?.toLowerCase().includes(filterOrderNumber.toLowerCase());
      const matchesCustomerName = filterCustomerName.trim() === '' || item.customerName?.toLowerCase().includes(filterCustomerName.toLowerCase());
      const matchesBlankSku = filterBlankSku.trim() === '' || item.blank_article_sku?.toLowerCase().includes(filterBlankSku.toLowerCase());
      return matchesOrderNumber && matchesCustomerName && matchesBlankSku;
    });
  }, [orderItems, filterOrderNumber, filterCustomerName, filterBlankSku]);


  const groupedItems: GroupedPickListItems = useMemo(() => {
    const toPick: Record<string, OrderItem[]> = {}; // Grouped by blank_article_sku
    const blankQC: OrderItem[] = [];
    const batched: Record<string, OrderItem[]> = {}; // Grouped by print_technology

    filteredItems.forEach(item => {
      if (item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PICK && item.blank_article_sku) {
        const groupKey = `${item.quantity || '1'}x ${item.blank_article_sku}`;
        if (!toPick[groupKey]) {
          toPick[groupKey] = [];
        }
        toPick[groupKey].push(item);
      } else if (item.productStatus === ProductWorkflowStatus.BLANK_PICKED) {
        blankQC.push(item);
      } else if (item.productStatus === ProductWorkflowStatus.BATCHED && item.print_technology) {
        const groupKey = item.print_technology;
        if (!batched[groupKey]) {
          batched[groupKey] = [];
        }
        batched[groupKey].push(item);
      }
    });

    return { toPick, blankQC, batched };
  }, [filteredItems]);

  // Actions for "To Pick" column (on groups)
  const handleOpenPickActionModal = useCallback((groupKey: string, items: OrderItem[]) => {
    setItemsToPick(items);
    setCurrentPickGroupKey(groupKey);
    setIsPickActionModalOpen(true);
  }, []);

  const handleSavePickedItems = useCallback(async (itemIds: string[], pickerName: string, newStatus: ProductWorkflowStatus) => {
    // Batch update all items in the group
    const updatePromises = itemIds.map(id => {
      const item = orderItems.find(oi => oi.id === id);
      if (!item) return Promise.resolve(); // Skip if item not found
      return saveItem({
        ...item,
        picker_name: pickerName,
        picked_at: new Date().toISOString().split('T')[0],
        productStatus: newStatus,
        // Also set initial blank_qc_status to PENDING
        blank_qc_status: BlankQCStatus.PENDING,
      });
    });
    await Promise.all(updatePromises);
    // Data is automatically refreshed by saveItem in the context.
  }, [orderItems, saveItem]);

  const handleClosePickActionModal = useCallback(() => {
    setIsPickActionModalOpen(false);
    setItemsToPick([]);
    setCurrentPickGroupKey('');
  }, []);

  // Actions for "Blank QC" column (on individual cards)
  const handleOpenBlankQCModal = useCallback((item: OrderItem) => {
    setItemForQC(item);
    setIsBlankQCModalOpen(true);
  }, []);

  const handleSaveBlankQC = useCallback(async (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => {
    if (!item) return;

    // If item passes QC, generate a batch ID if not already present
    let finalUpdatedFields = { ...updatedFields, productStatus: newStatus };
    if (newStatus === ProductWorkflowStatus.BATCHED && !item.batchId) {
        // Simple batch ID generation (could be more robust)
        finalUpdatedFields.batchId = `BATCH-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    await saveItem({ ...item, ...finalUpdatedFields });
    // Data is automatically refreshed by saveItem.
  }, [saveItem]);

  const handleCloseBlankQCModal = useCallback(() => {
    setIsBlankQCModalOpen(false);
    setItemForQC(null);
  }, []);


  // Detail Drawer Handlers
  const handleViewDetails = useCallback((item: OrderItem) => {
    setDetailOrderItem(item);
  }, []);

  const handleCloseDetailDrawer = useCallback(() => {
    setDetailOrderItem(null);
  }, []);

  const handleEditFromDrawer = useCallback((item: OrderItem) => {
    setDetailOrderItem(null); // Close drawer
    // For pick list, editing might mean editing stock location or blank SKU.
    // For simplicity, we'll route to the respective modal if possible, or just close.
    if (item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PICK) {
        // This would open an edit form for the individual item
        alert("Editing individual items from 'To Pick' is not implemented directly.");
    } else if (item.productStatus === ProductWorkflowStatus.BLANK_PICKED) {
        handleOpenBlankQCModal(item);
    } else if (item.productStatus === ProductWorkflowStatus.BATCHED) {
        // Editing batched items (e.g., changing batch ID)
        alert("Editing batched items is not implemented directly.");
    } else {
        alert("Editing for this item's current status is not available from here.");
    }
  }, [handleOpenBlankQCModal]);

  const handleDeleteFromDrawer = useCallback(async (item: OrderItem) => {
    setDetailOrderItem(null); // Close drawer
    if (confirm(`Are you sure you want to revert this item (${item.product}) from order ${item.orderNumber} to Design Pending? This will remove design files and print specs.`)) {
      // For deletion, simply change status to cancelled/rejected and optionally clear some fields
      await saveItem({ ...item, productStatus: ProductWorkflowStatus.DESIGN_REJECTED, status: OrderStatus.CANCELLED });
    }
  }, [saveItem]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Data 🔄'}
      </Button>
      <Input
        placeholder="Filter by Order #"
        value={filterOrderNumber}
        onChange={(e) => setFilterOrderNumber(e.target.value)}
        className="w-40"
        aria-label="Filter by order number"
      />
      <Input
        placeholder="Filter by Customer"
        value={filterCustomerName}
        onChange={(e) => setFilterCustomerName(e.target.value)}
        className="w-48"
        aria-label="Filter by customer name"
      />
      <Input
        placeholder="Filter by Blank SKU"
        value={filterBlankSku}
        onChange={(e) => setFilterBlankSku(e.target.value)}
        className="w-48"
        aria-label="Filter by blank SKU"
      />
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Pick List data"
            description="Connect your Google account to manage pick list workflows from Google Sheets."
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
      <ManagerEditorLayout title={title}>
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

  if (loading && !orderItems.length) {
    return (
      <ManagerEditorLayout title={title}>
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading pick list data...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Pick List" : "No Order Data Found"}
            description={error || "Enter the Google Sheet ID for your orders to get started."}
            action={
              <div className="space-y-4">
                <Input
                  label="Google Spreadsheet ID"
                  id="orderSheetIdInput"
                  value={orderSheetId}
                  onChange={(e) => setOrderSheetId(e.target.value)}
                  placeholder="Enter Google Spreadsheet ID"
                  helperText="Found in the sheet URL: https://docs.google.com/spreadsheets/d/YOUR_ID/edit"
                  required
                />
                <Button onClick={handleLoadData} disabled={!orderSheetId || loading || isAuthActionInProgress} variant="primary">
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
    <ManagerEditorLayout title={title} toolbar={toolbar}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage picking and quality control for blank products before they move to production.</p>

      {/* Top Widget */}
      <Card title="Pick List Stats" className="mb-6">
        <div className="flex flex-wrap justify-around items-center text-center text-sm gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{readyForProductionCount}</p>
            <p className="text-[var(--color-text-secondary)]">Ready for Production</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{readyForProductionBatches}</p>
            <p className="text-[var(--color-text-secondary)]">in Batches</p>
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      {(Object.keys(groupedItems.toPick).length === 0 && groupedItems.blankQC.length === 0 && Object.keys(groupedItems.batched).length === 0) && !loading ? (
        <EmptyState title="No Items in Pick List" description="There are no items awaiting picking or QC, or they do not match current filters." />
      ) : (
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar flex-1">
          {/* Column 1: To Pick */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.QUEUED_FOR_PICK)} To Pick ({Object.keys(groupedItems.toPick).length} groups)</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {Object.keys(groupedItems.toPick).length > 0 ? (
                  Object.entries(groupedItems.toPick).map(([groupKey, items]) => (
                    <div
                      key={groupKey}
                      className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-[var(--color-border-primary)] hover:border-[var(--color-brand-primary)] group cursor-pointer"
                      style={{ boxShadow: 'var(--shadow-elevation)' }}
                      onClick={() => handleOpenPickActionModal(groupKey, items)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Mark as picked: ${groupKey}`}
                    >
                      <h4 className="text-md font-bold text-[var(--color-text-primary)]">{groupKey}</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">{items.length} unique items to pick</p>
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="accent">Mark Picked 📋</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items queued for picking." />
                )}
              </div>
            </Card>
          </div>

          {/* Column 2: Blank QC */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.BLANK_PICKED)} Blank QC ({ groupedItems.blankQC.length })</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {groupedItems.blankQC.length > 0 ? (
                  groupedItems.blankQC.map((item) => (
                    <PickListCard key={item.id} item={item} onViewDetails={handleViewDetails} onPerformQC={handleOpenBlankQCModal} />
                  ))
                ) : (
                  <EmptyState title="No Items" description="No blanks awaiting quality control." />
                )}
              </div>
            </Card>
          </div>

          {/* Column 3: Batched */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.BATCHED)} Batched ({Object.keys(groupedItems.batched).length} batches)</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {Object.keys(groupedItems.batched).length > 0 ? (
                  Object.entries(groupedItems.batched).map(([groupKey, items]) => (
                    <div
                      key={groupKey}
                      className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-[var(--color-border-primary)] hover:border-[var(--color-brand-primary)] group cursor-pointer"
                      style={{ boxShadow: 'var(--shadow-elevation)' }}
                      onClick={() => alert(`Batch: ${groupKey}, Items: ${items.length}`)} // Placeholder for batch details
                      tabIndex={0}
                      role="button"
                      aria-label={`View batch details for ${groupKey}`}
                    >
                      <h4 className="text-md font-bold text-[var(--color-text-primary)]">Print Tech: {groupKey}</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">{items.length} items in this batch</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">Batch ID: {items[0].batchId}</p> {/* Assuming same batch_id for all in group */}
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="secondary">View Batch 📦</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items have been batched for production." />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modals */}
      <PickActionModal
        isOpen={isPickActionModalOpen}
        onClose={handleClosePickActionModal}
        items={itemsToPick}
        onSave={handleSavePickedItems}
        loading={loading}
        groupKey={currentPickGroupKey}
      />

      <BlankQCModal
        isOpen={isBlankQCModalOpen}
        onClose={handleCloseBlankQCModal}
        item={itemForQC}
        onSave={handleSaveBlankQC}
        loading={loading}
      />

      <OrderItemDetailDrawer
        isOpen={!!detailOrderItem}
        onClose={handleCloseDetailDrawer}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        data={detailOrderItem}
        isMockMode={isMockMode}
      />
    </ManagerEditorLayout>
  );
};

export default PickListKanbanPage;